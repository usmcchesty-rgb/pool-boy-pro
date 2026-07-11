import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/layout/PageHeader';
import { DevCalibrationCapture } from '../../components/dev/DevCalibrationCapture';
import { DevValidationCapture } from '../../components/dev/DevValidationCapture';
import { DevAdaptiveProfile } from '../../components/dev/DevAdaptiveProfile';
import { isDeveloperMode } from '../../strip/calibration/devMode';
import { getActiveAnchorInfo, invalidateAnchorCache } from '../../strip/calibration/anchorProvider';
import {
  clearImportedCalibration,
  importCalibrationFromJson,
  loadImportedCalibration,
} from '../../strip/calibration/storage';
import { Button } from '../../components/ui/Button';

export function StripCalibrationDevPage() {
  if (!isDeveloperMode()) return <Navigate to="/settings" replace />;

  const anchorInfo = getActiveAnchorInfo();
  const imported = loadImportedCalibration();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState('');
  const [importErr, setImportErr] = useState('');

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as unknown;
        const result = importCalibrationFromJson(parsed);
        if (result.ok) {
          invalidateAnchorCache();
          setImportMsg(`Imported ${result.data.calibrationVersion}`);
          setImportErr('');
        } else {
          setImportErr(result.errors.join('; '));
          setImportMsg('');
        }
      } catch {
        setImportErr('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleClear() {
    clearImportedCalibration();
    invalidateAnchorCache();
    setImportMsg('Cleared imported calibration — using built-in anchors');
    setImportErr('');
  }

  return (
    <div className="page dev-page">
      <PageHeader
        title="Strip Calibration (Developer)"
        subtitle="Tune Clorox chart anchors from physical product samples"
      />
      <p className="field__hint">
        <Link to="/dev/strip-tools">← Developer tools</Link>
      </p>

      <Card title="Active Anchors">
        <p>Current source: <strong>{anchorInfo.label}</strong></p>
        {imported && <p className="field__hint">Imported: {imported.sourceDescription}</p>}
        <div className="backup-actions">
          <Button variant="secondary" onClick={() => fileRef.current?.click()} type="button">
            Import Calibration JSON
          </Button>
          <Button variant="ghost" onClick={handleClear} type="button">
            Reset to Built-in Anchors
          </Button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={handleImport} />
        </div>
        {importMsg && <p className="page-message page-message--success">{importMsg}</p>}
        {importErr && <p className="field__error">{importErr}</p>}
      </Card>

      <Card title="Capture Calibration Samples">
        <DevCalibrationCapture />
      </Card>
    </div>
  );
}

export function StripValidationDevPage() {
  if (!isDeveloperMode()) return <Navigate to="/settings" replace />;

  return (
    <div className="page dev-page">
      <PageHeader
        title="Strip Validation (Developer)"
        subtitle="Compare scanner output to bottle-chart readings"
      />
      <p className="field__hint">
        <Link to="/dev/strip-tools">← Developer tools</Link>
      </p>
      <Card title="Validation Scanner">
        <DevValidationCapture />
      </Card>
    </div>
  );
}

export function StripDevToolsPage() {
  if (!isDeveloperMode()) return <Navigate to="/settings" replace />;

  return (
    <div className="page dev-page">
      <PageHeader title="Developer Strip Tools" subtitle="Hidden from normal navigation" />
      <Card title="Adaptive Learning Profile">
        <DevAdaptiveProfile />
      </Card>
      <Card title="Tools">
        <ul className="dev-tools-list">
          <li><Link to="/dev/strip-calibration">Strip Calibration</Link> — capture and export anchor colors</li>
          <li><Link to="/dev/strip-validation">Strip Validation</Link> — measure scanner accuracy vs bottle chart</li>
        </ul>
      </Card>
    </div>
  );
}
