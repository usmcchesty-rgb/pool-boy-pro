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
  createScanSessionCalibration,
  processScanFrame,
} from '../../strip/scanner/scanProcessor';
import { getActiveAnchorInfo } from '../../strip/calibration/anchorProvider';
import {
  computePadValidationSummary,
  exportValidationCsv,
  loadValidationRecords,
  saveValidationRecord,
  validationRecordFromMatch,
  type ValidationRecord,
} from '../../strip/calibration/validationStats';
import type { PadMatchResult } from '../../strip/scanner/types';

export function DevValidationCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<'six_way' | 'salt'>('six_way');
  const [lastMatch, setLastMatch] = useState<PadMatchResult | null>(null);
  const [confirmedValue, setConfirmedValue] = useState<number | ''>('');
  const [records, setRecords] = useState<ValidationRecord[]>(loadValidationRecords());
  const [cameraError, setCameraError] = useState<string | null>(null);

  const anchorInfo = getActiveAnchorInfo();

  const stopCamera = useCallback(() => {
    stopAllTracks(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const initCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();
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
    }
  }, [stopCamera]);

  useEffect(() => {
    void initCamera();
    return () => stopCamera();
  }, [initCamera, stopCamera, phase]);

  function captureValidation() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const cal = createScanSessionCalibration();
    const processed = processScanFrame(video, canvas, phase, cal, []);
    stopCamera();

    if (processed && processed.result.padMatches.length > 0) {
      const match = processed.result.padMatches[0];
      setLastMatch(match);
      setConfirmedValue(match.proposedValue);
      void initCamera();
    }
  }

  function saveRecord() {
    if (!lastMatch || confirmedValue === '') return;
    const record = validationRecordFromMatch(lastMatch, confirmedValue, anchorInfo.source);
    saveValidationRecord(record);
    setRecords(loadValidationRecords());
    setLastMatch(null);
    setConfirmedValue('');
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strip-validation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const blob = new Blob([exportValidationCsv(records)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strip-validation-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const summaries = CLOROX_SALT_POOL_STRIP.pads.map((pad) =>
    computePadValidationSummary(pad.id, records, pad.scaleValues)
  );

  const matchPad = lastMatch
    ? CLOROX_SALT_POOL_STRIP.pads.find((p) => p.id === lastMatch.padId)
    : null;

  return (
    <div className="dev-validation">
      <StripPrivacyNotice />
      <p className="field__hint">
        Anchors: <strong>{anchorInfo.label}</strong>. Compare scanner output to bottle chart and record confirmed values.
      </p>

      <Select label="Strip type" value={phase} onChange={(e) => setPhase(e.target.value as 'six_way' | 'salt')}>
        <option value="six_way">Six-way strip</option>
        <option value="salt">Salt strip</option>
      </Select>

      {cameraError ? (
        <p className="field__error">{cameraError}</p>
      ) : (
        <div className="strip-scanner__preview-wrap">
          <video ref={videoRef} className="strip-scanner__video" playsInline muted autoPlay />
        </div>
      )}

      <Button onClick={captureValidation} disabled={!!cameraError} type="button">
        Capture &amp; Match
      </Button>

      {lastMatch && matchPad && (
        <div className="dev-validation__result">
          <h4>{matchPad.label}</h4>
          <p>Proposed: {lastMatch.proposedValue} (confidence {lastMatch.confidence}%, ΔE {lastMatch.deltaE.toFixed(1)})</p>
          {lastMatch.alternateValue !== undefined && (
            <p>Alternate: {lastMatch.alternateValue} (ΔE {lastMatch.alternateDeltaE?.toFixed(1)})</p>
          )}
          {lastMatch.ambiguous && <p className="taylor-note">{lastMatch.ambiguityReason}</p>}
          <Select
            label="Confirmed bottle-chart value"
            value={String(confirmedValue)}
            onChange={(e) => setConfirmedValue(Number(e.target.value))}
          >
            {matchPad.scaleValues.map((v) => (
              <option key={v} value={v}>{v}{matchPad.unit ? ` ${matchPad.unit}` : ''}</option>
            ))}
          </Select>
          <Button onClick={saveRecord} type="button">Save Validation Record</Button>
        </div>
      )}

      <div className="dev-validation__export">
        <Button variant="secondary" onClick={exportJson} disabled={records.length === 0} type="button">
          Export JSON
        </Button>
        <Button variant="secondary" onClick={exportCsv} disabled={records.length === 0} type="button">
          Export CSV
        </Button>
      </div>

      <div className="dev-validation__summary">
        <h3>Validation Summary ({records.length} total)</h3>
        {summaries.map((s) => (
          <div key={s.padId} className="dev-validation__pad-summary">
            <h4>{CLOROX_SALT_POOL_STRIP.pads.find((p) => p.id === s.padId)?.label ?? s.padId}</h4>
            {s.totalSamples === 0 ? (
              <p className="field__hint">No samples yet</p>
            ) : (
              <>
                <p>Samples: {s.totalSamples} · Exact: {s.exactMatchPercent}% · Within 1 step: {s.withinOneStepPercent}%</p>
                <p>Avg confidence: {s.averageConfidence}% · False high-confidence: {s.falseHighConfidenceCount}</p>
                {s.confusionPairs.length > 0 && (
                  <p>Top confusion: {s.confusionPairs[0].proposed}→{s.confusionPairs[0].confirmed} ({s.confusionPairs[0].count}×)</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <canvas ref={canvasRef} hidden aria-hidden="true" />
    </div>
  );
}
