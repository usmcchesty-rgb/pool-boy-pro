import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Button } from '../ui/Button';
import { StripAlignmentOverlay } from './StripAlignmentOverlay';
import { StripQualityIndicators } from './StripQualityIndicators';
import { StripPrivacyNotice } from './StripPrivacyNotice';
import {
  startCameraSession,
  stopAllTracks,
  isCameraSupported,
  getCameraErrorMessage,
  getActiveCameraStream,
  setActiveCameraStream,
  releaseActiveCameraStream,
  type CameraErrorCode,
} from '../../strip/scanner/cameraSession';
import {
  queryCameraPermission,
  IPHONE_CAMERA_SETTINGS_HINT,
} from '../../strip/scanner/cameraPermission';
import {
  analyzeLiveQuality,
  captureScanFrame,
  createScanSessionCalibration,
  getScanTargetConfig,
} from '../../strip/scanner/scanProcessor';
import { assessQuality } from '../../strip/scanner/qualityAnalyzer';
import {
  createAutoCaptureState,
  resetAutoCaptureState,
  tickAutoCapture,
} from '../../strip/scanner/autoCapture';
import type { PadMatchResult, ScanProcessResult } from '../../strip/scanner/types';
import type { ScanCapturePackage } from '../../strip/scanner/scanProcessor';
import type { SessionCalibrationState } from '../../strip/scanner/sessionCalibration';

export type ScanPhase = 'six_way' | 'salt';

export interface StripScannerHandle {
  captureNow: () => void;
}

interface StripScannerViewProps {
  phase: ScanPhase;
  onCapture: (capture: ScanCapturePackage, phase: ScanPhase) => void;
  onCancel: () => void;
  onManualFallback: () => void;
  onCaptureStateChange?: (state: {
    canManualCapture: boolean;
    ready: boolean;
    statusMessage: string;
  }) => void;
  /** When false, auto-capture is blocked (strip timing) — manual capture still allowed */
  scanAllowed?: boolean;
  timingBlockedMessage?: string;
}

export const StripScannerView = forwardRef<StripScannerHandle, StripScannerViewProps>(
  function StripScannerView(
    {
      phase,
      onCapture,
      onCancel,
      onManualFallback,
      onCaptureStateChange,
      scanAllowed = true,
      timingBlockedMessage,
    },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number>(0);
    const calRef = useRef<SessionCalibrationState>(createScanSessionCalibration());
    const lumsRef = useRef<number[]>([]);
    const autoCaptureRef = useRef(createAutoCaptureState());
    const capturingRef = useRef(false);
    const permissionRequestedRef = useRef(false);

    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraErrorCode, setCameraErrorCode] = useState<CameraErrorCode | null>(null);
    const [starting, setStarting] = useState(true);
    const [statusMessage, setStatusMessage] = useState('Starting camera…');
    const [ready, setReady] = useState(false);
    const [capturedFlash, setCapturedFlash] = useState(false);
    const [quality, setQuality] = useState<ScanProcessResult['quality'] | null>(null);
    const [qualityStatus, setQualityStatus] = useState<
      'searching' | 'closer' | 'align' | 'lighting' | 'steady' | 'ready'
    >('searching');

    const config = getScanTargetConfig(phase);

    const stopCamera = useCallback(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      stopAllTracks(streamRef.current);
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }, []);

    const handleCapture = useCallback(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || capturingRef.current) return;

      capturingRef.current = true;
      setCapturedFlash(true);

      const processed = captureScanFrame(
        video,
        canvas,
        phase,
        calRef.current,
        lumsRef.current
      );

      releaseActiveCameraStream();
      stopCamera();

      if (processed) {
        calRef.current = processed.updatedCalibration;
        window.setTimeout(() => {
          onCapture(processed, phase);
        }, 280);
      } else {
        capturingRef.current = false;
        setCapturedFlash(false);
      }
    }, [phase, onCapture, stopCamera]);

    useImperativeHandle(ref, () => ({
      captureNow: () => handleCapture(),
    }));

    const startLoop = useCallback(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const tick = () => {
        if (!streamRef.current || capturingRef.current) return;

        const live = analyzeLiveQuality(video, canvas, config, lumsRef.current);
        if (live) {
          lumsRef.current.push(live.lum);
          if (lumsRef.current.length > 16) lumsRef.current.shift();

          const assessment = assessQuality(live.quality, live.stripDetected);
          setQuality(live.quality);
          setQualityStatus(assessment.status);
          setStatusMessage(assessment.message);
          setReady(assessment.ready);
          onCaptureStateChange?.({
            canManualCapture: assessment.hasUsableFrame,
            ready: assessment.ready,
            statusMessage: assessment.message,
          });

          const { shouldCapture } = tickAutoCapture(autoCaptureRef.current, assessment.ready);

          if (!assessment.ready) {
            resetAutoCaptureState(autoCaptureRef.current);
          }

          if (scanAllowed && shouldCapture) {
            handleCapture();
            return;
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    }, [config, handleCapture, onCaptureStateChange, scanAllowed]);

    const initCamera = useCallback(async () => {
      setStarting(true);
      setCameraError(null);
      setCameraErrorCode(null);
      calRef.current = createScanSessionCalibration();
      lumsRef.current = [];
      resetAutoCaptureState(autoCaptureRef.current);

      if (!isCameraSupported()) {
        setCameraError(getCameraErrorMessage('unsupported'));
        setCameraErrorCode('unsupported');
        setStarting(false);
        return;
      }

      const existing = getActiveCameraStream();
      if (existing && existing.active) {
        streamRef.current = existing;
        const video = videoRef.current;
        if (video) {
          video.srcObject = existing;
          await video.play();
          setStatusMessage('Looking for strip');
          setStarting(false);
          startLoop();
        }
        return;
      }

      if (!permissionRequestedRef.current) {
        const perm = await queryCameraPermission();
        if (perm === 'denied') {
          setCameraError(getCameraErrorMessage('permission_denied'));
          setCameraErrorCode('permission_denied');
          setStarting(false);
          return;
        }
        permissionRequestedRef.current = true;
      }

      try {
        const session = await startCameraSession();
        streamRef.current = session.stream;
        setActiveCameraStream(session.stream);
        const video = videoRef.current;
        if (video) {
          video.srcObject = session.stream;
          await video.play();
          setStatusMessage('Looking for strip');
          startLoop();
        }
      } catch (err) {
        const code = (err as { code?: CameraErrorCode }).code ?? 'unknown';
        setCameraError(getCameraErrorMessage(code));
        setCameraErrorCode(code);
      } finally {
        setStarting(false);
      }
    }, [startLoop]);

    useEffect(() => {
      void initCamera();
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, [initCamera, phase]);

    if (cameraError) {
      return (
        <div className="strip-scanner strip-scanner--error">
          <p className="field__error" role="alert">{cameraError}</p>
          {cameraErrorCode === 'permission_denied' && (
            <p className="field__hint">{IPHONE_CAMERA_SETTINGS_HINT}</p>
          )}
          <div className="strip-scanner__error-actions">
            {cameraErrorCode !== 'unsupported' && (
              <Button
                variant="secondary"
                onClick={() => {
                  permissionRequestedRef.current = false;
                  void initCamera();
                }}
                type="button"
              >
                Retry Camera
              </Button>
            )}
            <Button onClick={onManualFallback} type="button">
              Continue with Manual Entry
            </Button>
            <Button variant="ghost" onClick={onCancel} type="button">
              Back
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className={`strip-scanner ${capturedFlash ? 'strip-scanner--captured' : ''}`}>
        <StripPrivacyNotice />
        <div className="strip-scanner__preview-wrap">
          <video
            ref={videoRef}
            className="strip-scanner__video"
            playsInline
            muted
            autoPlay
            aria-label="Live camera preview for strip scanning"
          />
          <StripAlignmentOverlay
            config={config}
            ready={ready}
            statusMessage={starting ? 'Starting camera…' : statusMessage}
            showPadMarkers={false}
          />
          {capturedFlash && (
            <div className="strip-scanner__capture-flash" aria-hidden="true">
              Captured ✓
            </div>
          )}
        </div>
        <StripQualityIndicators scores={quality} status={qualityStatus} />
        {!scanAllowed && timingBlockedMessage && (
          <p className="strip-scanner__timing-block" role="status">{timingBlockedMessage}</p>
        )}
        <p className="strip-scanner__auto-hint field__hint">
          {ready && scanAllowed
            ? 'Capturing automatically when steady…'
            : 'Align the full strip inside the guide'}
        </p>
        <canvas ref={canvasRef} className="strip-scanner__canvas" hidden aria-hidden="true" />
      </div>
    );
  }
);

export type { PadMatchResult };
