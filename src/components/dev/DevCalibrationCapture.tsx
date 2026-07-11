import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { StripPrivacyNotice } from '../strip/StripPrivacyNotice';
import { CLOROX_SALT_POOL_STRIP } from '../../strip/brands/cloroxSaltPool';
import {
  startCameraSession,
  stopAllTracks,
  getCameraErrorMessage,
  type CameraErrorCode,
} from '../../strip/scanner/cameraSession';
import {
  captureFrameToImageData,
  computeGuideRect,
  releaseCanvas,
  sampleNeutralReference,
  samplePadRegion,
} from '../../strip/scanner/frameSampler';
import { getCloroxScanTarget } from '../../strip/scanner/cloroxCalibration';
import {
  calibratePadSample,
  createSessionCalibration,
  updateSessionReference,
} from '../../strip/scanner/sessionCalibration';
import { rgbToLab } from '../../strip/scanner/colorScience';
import { aggregateCalibrationSamples } from '../../strip/calibration/aggregation';
import type { CalibrationSample, StripCalibrationData } from '../../strip/calibration/types';
import { CALIBRATION_SCHEMA_VERSION } from '../../strip/calibration/types';

type CaptureTarget = 'bottle_chart' | 'developed_strip';

export function DevCalibrationCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const calRef = useRef(createSessionCalibration());

  const [padId, setPadId] = useState(CLOROX_SALT_POOL_STRIP.pads[0].id);
  const [chartValue, setChartValue] = useState(
    CLOROX_SALT_POOL_STRIP.pads[0].scaleValues[0]
  );
  const [target, setTarget] = useState<CaptureTarget>('bottle_chart');
  const [samples, setSamples] = useState<CalibrationSample[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const padDef = CLOROX_SALT_POOL_STRIP.pads.find((p) => p.id === padId)!;
  const config = getCloroxScanTarget(padDef.stripType);

  const stopCamera = useCallback(() => {
    stopAllTracks(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const initCamera = useCallback(async () => {
    setStarting(true);
    setCameraError(null);
    stopCamera();
    calRef.current = createSessionCalibration();
    try {
      const session = await startCameraSession();
      streamRef.current = session.stream;
      if (videoRef.current) {
        videoRef.current.srcObject = session.stream;
        await videoRef.current.play();
      }
    } catch (err) {
      const code = (err as { code?: CameraErrorCode }).code ?? 'unknown';
      setCameraError(getCameraErrorMessage(code));
    } finally {
      setStarting(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    void initCamera();
    return () => stopCamera();
  }, [initCamera, stopCamera]);

  function captureSample() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const imageData = captureFrameToImageData(video, canvas);
    if (!imageData) return;

    try {
      const guide = computeGuideRect(imageData.width, imageData.height, config.aspectRatio);
      const neutral = sampleNeutralReference(
        imageData,
        guide.x,
        guide.y,
        guide.w,
        guide.h,
        config.neutralRoi
      );
      calRef.current = updateSessionReference(calRef.current, neutral);

      const roi = config.padRois.find((r) => r.padId === padId) ?? config.padRois[0];
      const rawRgb = samplePadRegion(imageData, guide.x, guide.y, guide.w, guide.h, roi);
      const { rgb: normalizedRgb } = calibratePadSample(calRef.current, rawRgb);
      const lab = rgbToLab(normalizedRgb);

      const sample: CalibrationSample = {
        id: `${Date.now()}`,
        padId,
        chartValue,
        rawRgb,
        normalizedRgb,
        lab,
        accepted: true,
        capturedAt: Date.now(),
        lightingNotes: target,
      };
      setSamples((prev) => [...prev, sample]);
    } finally {
      releaseCanvas(canvas);
    }
  }

  function toggleAccept(id: string) {
    setSamples((prev) =>
      prev.map((s) => (s.id === id ? { ...s, accepted: !s.accepted } : s))
    );
  }

  function removeSample(id: string) {
    setSamples((prev) => prev.filter((s) => s.id !== id));
  }

  const padSamples = samples.filter((s) => s.padId === padId && s.chartValue === chartValue);
  const stats = aggregateCalibrationSamples(padSamples);

  function exportCalibration() {
    const pads: StripCalibrationData['pads'] = CLOROX_SALT_POOL_STRIP.pads
      .map((pad) => {
        const anchors = pad.scaleValues
          .map((value) => {
            const group = samples.filter((s) => s.padId === pad.id && s.chartValue === value && s.accepted);
            const agg = aggregateCalibrationSamples(group);
            if (!agg) return null;
            return {
              value,
              referenceRgb: agg.medianRgb,
              referenceLab: agg.averageLab,
              sampleCount: agg.sampleCount,
              source: target === 'bottle_chart' ? 'bottle_chart_calibration' : 'developed_strip_calibration',
              reliability: 'measured' as const,
            };
          })
          .filter((a): a is NonNullable<typeof a> => a !== null);
        return { padId: pad.id, anchors };
      })
      .filter((p) => p.anchors.length > 0);

    const data: StripCalibrationData = {
      version: CALIBRATION_SCHEMA_VERSION,
      brandId: 'clorox_salt_pool',
      createdAt: new Date().toISOString(),
      calibrationVersion: `dev-${new Date().toISOString().slice(0, 10)}`,
      sourceDescription: `Developer calibration (${target})`,
      pads,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clorox-strip-calibration-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="dev-calibration">
      <StripPrivacyNotice />
      <p className="field__hint">
        Align the bottle chart color or a developed strip pad with the guide. Only numerical color data is exported — no photos.
      </p>

      <div className="form-grid form-grid--2">
        <Select label="Pad" value={padId} onChange={(e) => {
          const id = e.target.value;
          setPadId(id);
          const pad = CLOROX_SALT_POOL_STRIP.pads.find((p) => p.id === id)!;
          setChartValue(pad.scaleValues[0]);
        }}>
          {CLOROX_SALT_POOL_STRIP.pads.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </Select>
        <Select label="Chart value" value={String(chartValue)} onChange={(e) => setChartValue(Number(e.target.value))}>
          {padDef.scaleValues.map((v) => (
            <option key={v} value={v}>{v}{padDef.unit ? ` ${padDef.unit}` : ''}</option>
          ))}
        </Select>
        <Select label="Target" value={target} onChange={(e) => setTarget(e.target.value as CaptureTarget)}>
          <option value="bottle_chart">Bottle chart reference</option>
          <option value="developed_strip">Developed strip pad</option>
        </Select>
      </div>

      {cameraError ? (
        <p className="field__error">{cameraError}</p>
      ) : (
        <div className="strip-scanner__preview-wrap">
          <video ref={videoRef} className="strip-scanner__video" playsInline muted autoPlay />
        </div>
      )}

      <div className="dev-calibration__actions">
        <Button onClick={captureSample} disabled={starting || !!cameraError} type="button">
          Capture Sample
        </Button>
        <Button variant="secondary" onClick={() => void initCamera()} type="button">
          Restart Camera
        </Button>
        <Button variant="secondary" onClick={exportCalibration} disabled={samples.filter((s) => s.accepted).length === 0} type="button">
          Export Calibration JSON
        </Button>
      </div>

      {stats && (
        <div className="dev-calibration__stats">
          <h4>Accepted samples for {padDef.label} = {chartValue}</h4>
          <p>Average RGB: {stats.averageRgb.join(', ')}</p>
          <p>Median RGB: {stats.medianRgb.join(', ')}</p>
          <p>LAB: {stats.averageLab.map((v) => v.toFixed(1)).join(', ')}</p>
          <p>Spread (LAB): {stats.spreadLab.toFixed(2)}</p>
          <p>Variance RGB: {stats.varianceRgb.map((v) => v.toFixed(1)).join(', ')}</p>
        </div>
      )}

      {padSamples.length > 0 && (
        <ul className="dev-calibration__samples">
          {padSamples.map((s) => (
            <li key={s.id} className={s.accepted ? '' : 'dev-calibration__sample--rejected'}>
              <span>RGB {s.rawRgb.join('/')} → norm {s.normalizedRgb.join('/')}</span>
              <Button size="sm" variant="ghost" onClick={() => toggleAccept(s.id)} type="button">
                {s.accepted ? 'Reject' : 'Accept'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => removeSample(s.id)} type="button">
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <canvas ref={canvasRef} hidden aria-hidden="true" />
    </div>
  );
}
