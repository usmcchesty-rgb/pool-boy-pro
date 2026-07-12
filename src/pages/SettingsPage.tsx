import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { downloadBackup, importData } from '../services/dataService';
import type { AppSettings, ChemicalStrengths, FasDpdSampleSize, PoolProfileConfig, TaylorEntryMode } from '../models/types';
import { STRENGTH_FIELD_META } from '../chemistry/strengthConfig';
import {
  POOL_ENVIRONMENT_OPTIONS,
  POOL_SANITIZER_OPTIONS,
  POOL_SURFACE_OPTIONS,
} from '../chemistry/poolProfiles';
import { ProfileTargetRanges } from '../components/settings/ProfileTargetRanges';
import { ScannerLearningSettings } from '../components/settings/ScannerLearningSettings';
import { ScannerSettings } from '../components/settings/ScannerSettings';
import { PageHeader } from '../components/layout/PageHeader';
import { APP_DISPLAY_VERSION } from '../constants/appVersion';
import { isDeveloperMode, enableDeveloperMode, disableDeveloperMode } from '../strip/calibration/devMode';
import { getActiveAnchorInfo, invalidateAnchorCache } from '../strip/calibration/anchorProvider';
import {
  clearImportedCalibration,
  importCalibrationFromJson,
  loadImportedCalibration,
} from '../strip/calibration/storage';
import { Link } from 'react-router-dom';

export function SettingsPage() {
  const { settings, data, updateSettings, replaceData } = useApp();
  const [local, setLocal] = useState<AppSettings>(settings);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const calFileRef = useRef<HTMLInputElement>(null);
  const [versionTaps, setVersionTaps] = useState(0);
  const [devMode, setDevMode] = useState(isDeveloperMode());
  const [calImportMsg, setCalImportMsg] = useState('');
  const [calImportErr, setCalImportErr] = useState('');

  useEffect(() => {
    if (!dirty) {
      setLocal(settings);
    }
  }, [settings, dirty]);

  function updateLocal(next: AppSettings | ((prev: AppSettings) => AppSettings)) {
    setDirty(true);
    setLocal(next);
  }

  async function save() {
    setSaving(true);
    setSaveError('');
    try {
      await updateSettings(local);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError('Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function updateStrength(key: keyof ChemicalStrengths, value: number) {
    updateLocal((prev) => ({
      ...prev,
      chemicalStrengths: { ...prev.chemicalStrengths, [key]: value },
    }));
  }

  function updatePoolProfile(updates: Partial<PoolProfileConfig>) {
    updateLocal((prev) => {
      const poolProfile = { ...prev.poolProfile, ...updates };
      return {
        ...prev,
        poolProfile,
        defaultSanitizerType: poolProfile.sanitizer,
        defaultPoolType: poolProfile.spaMode
          ? 'spa'
          : prev.defaultPoolType === 'spa'
            ? 'inground'
            : prev.defaultPoolType,
      };
    });
  }

  function handleExport() {
    downloadBackup(data);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = await importData(text);
      if (confirm('Replace all current data with imported backup?')) {
        await replaceData(imported);
        setLocal(imported.settings);
        setDirty(false);
        setImportError('');
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 3000);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Invalid backup file. Please select a valid Pool Boy Pro export.';
      setImportError(message);
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="page settings">
      <PageHeader
        title="Settings"
        subtitle="Customize Pool Boy Pro"
        actions={
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Settings'}
          </Button>
        }
      />

      {saveError && (
        <p className="page-message page-message--error" role="alert">
          {saveError}
        </p>
      )}

      <div className="settings-grid">
        <Card title="Pool Profile">
          <p className="field__hint">
            Configure your pool type so analysis, recommendations, and health scores use the correct chemistry targets.
          </p>
          <div className="form-grid">
            <Input
              label="Pool Name"
              value={local.poolName}
              onChange={(e) => updateLocal({ ...local, poolName: e.target.value })}
            />
            <Input
              label="Default Pool Volume"
              type="number"
              min={1}
              value={local.defaultPoolVolume}
              onChange={(e) => updateLocal({ ...local, defaultPoolVolume: Number(e.target.value) })}
              unit={local.preferredVolumeUnit}
            />
            <Select
              label="Preferred Volume Unit"
              value={local.preferredVolumeUnit}
              onChange={(e) =>
                updateLocal({ ...local, preferredVolumeUnit: e.target.value as AppSettings['preferredVolumeUnit'] })
              }
            >
              <option value="gallons">Gallons</option>
              <option value="liters">Liters</option>
            </Select>
            <Select
              label="Pool Surface"
              value={local.poolProfile.surface}
              onChange={(e) =>
                updatePoolProfile({ surface: e.target.value as PoolProfileConfig['surface'] })
              }
            >
              {POOL_SURFACE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <Select
              label="Sanitizer"
              value={local.poolProfile.sanitizer}
              onChange={(e) =>
                updatePoolProfile({ sanitizer: e.target.value as PoolProfileConfig['sanitizer'] })
              }
            >
              {POOL_SANITIZER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <Select
              label="Environment"
              value={local.poolProfile.environment}
              onChange={(e) =>
                updatePoolProfile({ environment: e.target.value as PoolProfileConfig['environment'] })
              }
            >
              {POOL_ENVIRONMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            {!local.poolProfile.spaMode && (
              <Select
                label="Pool Structure"
                value={local.defaultPoolType === 'spa' ? 'inground' : local.defaultPoolType}
                onChange={(e) =>
                  updateLocal({ ...local, defaultPoolType: e.target.value as AppSettings['defaultPoolType'] })
                }
              >
                <option value="inground">In-Ground</option>
                <option value="above_ground">Above Ground</option>
              </Select>
            )}
            <Select
              label="Temperature Unit"
              value={local.preferredTemperatureUnit}
              onChange={(e) =>
                updateLocal({
                  ...local,
                  preferredTemperatureUnit: e.target.value as AppSettings['preferredTemperatureUnit'],
                })
              }
            >
              <option value="fahrenheit">Fahrenheit</option>
              <option value="celsius">Celsius</option>
            </Select>
            <label className="field field--checkbox">
              <span className="field__label">Spa / Hot Tub Mode</span>
              <input
                type="checkbox"
                checked={local.poolProfile.spaMode}
                onChange={(e) => updatePoolProfile({ spaMode: e.target.checked })}
              />
              <span className="field__hint">Uses spa temperature and stabilizer targets.</span>
            </label>
          </div>
        </Card>

        <Card title="Target Chemistry Ranges" className="settings-full">
          <p className="field__hint">
            Read-only ideal ranges for your profile. Analysis and recommendations use these automatically.
          </p>
          <ProfileTargetRanges profile={local.poolProfile} />
        </Card>

        <Card title="Taylor Test Preferences">
          <p className="field__hint">
            Defaults for the New Test workflow with your Taylor K-2006-SALT kit.
          </p>
          <div className="form-grid">
            <Select
              label="FAS-DPD Sample Size"
              value={local.preferredFasDpdSampleSize}
              onChange={(e) =>
                updateLocal({
                  ...local,
                  preferredFasDpdSampleSize: Number(e.target.value) as FasDpdSampleSize,
                })
              }
              hint="10 mL: each drop = 0.5 ppm. 25 mL: each drop = 0.2 ppm."
            >
              <option value={10}>10 mL</option>
              <option value={25}>25 mL</option>
            </Select>
            <Select
              label="Total Alkalinity Entry"
              value={local.preferredTaEntryMode}
              onChange={(e) =>
                updateLocal({
                  ...local,
                  preferredTaEntryMode: e.target.value as TaylorEntryMode,
                })
              }
            >
              <option value="drops">Drops (R-0009 × 10 ppm)</option>
              <option value="ppm">Direct PPM</option>
            </Select>
            <Select
              label="Calcium Hardness Entry"
              value={local.preferredChEntryMode}
              onChange={(e) =>
                updateLocal({
                  ...local,
                  preferredChEntryMode: e.target.value as TaylorEntryMode,
                })
              }
            >
              <option value="drops">Drops (R-0012 × 25 ppm)</option>
              <option value="ppm">Direct PPM</option>
            </Select>
          </div>
        </Card>

        <Card title="Appearance">
          <Select
            label="Theme"
            value={local.theme}
            onChange={(e) => updateLocal({ ...local, theme: e.target.value as AppSettings['theme'] })}
            hint="Choose light, dark, or match your system preference."
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </Select>
        </Card>

        <Card title="Chemical Strengths" className="settings-full">
          <p className="field__hint">Adjust to match your product labels for accurate dosing calculations.</p>
          <div className="form-grid form-grid--3">
            {STRENGTH_FIELD_META.map(({ key, label, hint }) => (
              <Input
                key={key}
                label={label}
                type="number"
                step={0.01}
                min={0}
                max={100}
                value={local.chemicalStrengths[key]}
                onChange={(e) => updateStrength(key, Number(e.target.value))}
                hint={hint}
              />
            ))}
          </div>
        </Card>

        <ScannerSettings />

        <ScannerLearningSettings />

        <Card title="Backup & Restore">
          <div className="backup-actions">
            <Button variant="secondary" onClick={handleExport}>
              Export Backup
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Import Backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={handleImport}
            />
          </div>
          {importError && <p className="field__error" role="alert">{importError}</p>}
          {importSuccess && (
            <p className="page-message page-message--success" role="status">
              Backup imported successfully.
            </p>
          )}
          <p className="field__hint">
            Data is stored locally in your browser. Export regularly to prevent data loss.
            Cloud sync can be added in a future update.
          </p>
        </Card>

        {devMode && (
          <Card title="Developer — Strip Scanner">
            <p className="field__hint">
              Active anchors: <strong>{getActiveAnchorInfo().label}</strong>
              {loadImportedCalibration() && ` (${loadImportedCalibration()!.calibrationVersion})`}
            </p>
            <div className="backup-actions">
              <Button variant="secondary" onClick={() => calFileRef.current?.click()} type="button">
                Import Calibration JSON
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  clearImportedCalibration();
                  invalidateAnchorCache();
                  setCalImportMsg('Reset to built-in approximate anchors');
                  setCalImportErr('');
                }}
                type="button"
              >
                Reset Anchors
              </Button>
              <Link to="/dev/strip-tools" className="btn btn--secondary">
                Developer Strip Tools
              </Link>
              <input
                ref={calFileRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    try {
                      const parsed = JSON.parse(reader.result as string) as unknown;
                      const result = importCalibrationFromJson(parsed);
                      if (result.ok) {
                        invalidateAnchorCache();
                        setCalImportMsg(`Imported ${result.data.calibrationVersion}`);
                        setCalImportErr('');
                      } else {
                        setCalImportErr(result.errors.join('; '));
                        setCalImportMsg('');
                      }
                    } catch {
                      setCalImportErr('Invalid JSON file');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </div>
            {calImportMsg && <p className="page-message page-message--success">{calImportMsg}</p>}
            {calImportErr && <p className="field__error">{calImportErr}</p>}
          </Card>
        )}
      </div>

      <p
        className="settings-about field__hint"
        onClick={() => {
          const next = versionTaps + 1;
          setVersionTaps(next);
          if (next >= 7) {
            if (devMode) {
              disableDeveloperMode();
              setDevMode(false);
            } else {
              enableDeveloperMode();
              setDevMode(true);
            }
            setVersionTaps(0);
          }
        }}
        role="presentation"
      >
        Pool Boy Pro {APP_DISPLAY_VERSION} · Taylor K-2006-SALT
        {devMode && ' · Developer mode'}
      </p>
    </div>
  );
}
