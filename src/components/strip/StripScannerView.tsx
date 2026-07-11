import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { StripAlignmentOverlay } from './StripAlignmentOverlay';
import { StripQualityIndicators } from './StripQualityIndicators';
import { StripPrivacyNotice } from './StripPrivacyNotice';
import {
  startCameraSession,
  stopAllTracks,
  isCameraSupported,
  getCameraErrorMessage,
  type CameraErrorCode,
} from '../../strip/scanner/cameraSession';
import {
  analyzeLiveQuality,
  createScanSessionCalibration,
  getScanTargetConfig,
  processScanFrame,
} from '../../strip/scanner/scanProcessor';
import { assessQuality } from '../../strip/scanner/qualityAnalyzer';
import type { PadMatchResult, ScanProcessResult } from '../../strip/scanner/types';
import type { SessionCalibrationState } from '../../strip/scanner/sessionCalibration';

const STABLE_FRAMES_REQUIRED = 8;
const AUTO_CAPTURE_DELAY_MS = 500;

export type ScanPhase = 'six_way' | 'salt';

interface StripScannerViewProps {
  phase: ScanPhase;
  onCapture: (result: ScanProcessResult, phase: ScanPhase) => void;
  onCancel: () => void;
  onManualFallback: () => void;
  /** When false, auto-capture and manual capture are blocked (strip timing) */
  scanAllowed?: boolean;
  timingBlockedMessage?: string;
}

export function StripScannerView({
  phase,
  onCapture,
  onCancel,
  onManualFallback,
  scanAllowed = true,
  timingBlockedMessage,
}: StripScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const calRef = useRef<SessionCalibrationState>(createScanSessionCalibration());
  const lumsRef = useRef<number[]>([]);
  const stableCountRef = useRef(0);
  const readySinceRef = useRef<number | null>(null);
  const capturingRef = useRef(false);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraErrorCode, setCameraErrorCode] = useState<CameraErrorCode | null>(null);
  const [starting, setStarting] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Starting camera…');
  const [ready, setReady] = useState(false);
  const [quality, setQuality] = useState<ScanProcessResult['quality'] | null>(null);
  const [qualityStatus, setQualityStatus] = useState<'align' | 'lighting' | 'steady' | 'ready'>('align');

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
    const processed = processScanFrame(
      video,
      canvas,
      phase,
      calRef.current,
      lumsRef.current
    );

    stopCamera();

    if (processed) {
      calRef.current = processed.updatedCalibration;
      onCapture(processed.result, phase);
    }
    capturingRef.current = false;
  }, [phase, onCapture, stopCamera]);

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

        const assessment = assessQuality(live.quality);
        setQuality(live.quality);
        setQualityStatus(assessment.status);
        setStatusMessage(assessment.message);
        setReady(assessment.ready);

        if (assessment.ready) {
          stableCountRef.current += 1;
          if (readySinceRef.current === null) readySinceRef.current = Date.now();

          if (
            scanAllowed &&
            stableCountRef.current >= STABLE_FRAMES_REQUIRED &&
            readySinceRef.current &&
            Date.now() - readySinceRef.current >= AUTO_CAPTURE_DELAY_MS
          ) {
            handleCapture();
            return;
          }
        } else {
          stableCountRef.current = 0;
          readySinceRef.current = null;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [config, handleCapture, scanAllowed]);

  const initCamera = useCallback(async () => {
    setStarting(true);
    setCameraError(null);
    setCameraErrorCode(null);
    stopCamera();
    calRef.current = createScanSessionCalibration();
    lumsRef.current = [];
    stableCountRef.current = 0;
    readySinceRef.current = null;

    if (!isCameraSupported()) {
      setCameraError(getCameraErrorMessage('unsupported'));
      setCameraErrorCode('unsupported');
      setStarting(false);
      return;
    }

    try {
      const session = await startCameraSession();
      streamRef.current = session.stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = session.stream;
        await video.play();
        setStatusMessage('Move strip into guide');
        startLoop();
      }
    } catch (err) {
      const code = (err as { code?: CameraErrorCode }).code ?? 'unknown';
      setCameraError(getCameraErrorMessage(code));
      setCameraErrorCode(code);
    } finally {
      setStarting(false);
    }
  }, [startLoop, stopCamera]);

  useEffect(() => {
    void initCamera();
    return () => stopCamera();
  }, [initCamera, stopCamera, phase]);

  if (cameraError) {
    return (
      <div className="strip-scanner strip-scanner--error">
        <p className="field__error" role="alert">{cameraError}</p>
        <div className="strip-scanner__error-actions">
          {cameraErrorCode !== 'unsupported' && (
            <Button variant="secondary" onClick={() => void initCamera()} type="button">
              Retry
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
    <div className="strip-scanner">
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
          statusMessage={statusMessage}
        />
      </div>
      <StripQualityIndicators scores={quality} status={qualityStatus} />
      {!scanAllowed && timingBlockedMessage && (
        <p className="strip-scanner__timing-block" role="status">{timingBlockedMessage}</p>
      )}
      <div className="strip-scanner__actions">
        <Button
          onClick={handleCapture}
          disabled={starting || !scanAllowed}
          type="button"
        >
          Capture
        </Button>
        <Button variant="secondary" onClick={onManualFallback} type="button">
          Manual Entry
        </Button>
        <Button variant="ghost" onClick={onCancel} type="button">
          Cancel
        </Button>
      </div>
      <canvas ref={canvasRef} className="strip-scanner__canvas" hidden aria-hidden="true" />
    </div>
  );
}

export type { PadMatchResult };
