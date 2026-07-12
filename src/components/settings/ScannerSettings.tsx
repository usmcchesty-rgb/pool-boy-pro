import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';

export function ScannerSettings() {
  const { settings, updateSettings } = useApp();

  return (
    <Card title="Scanner Settings">
      <p className="field__hint">
        These options affect Quick Test strip scanning only. Every scan is manually verified before saving.
      </p>

      <label className="settings-checkbox">
        <input
          type="checkbox"
          checked={settings.scannerRelaxQuality}
          onChange={(e) => updateSettings({ scannerRelaxQuality: e.target.checked })}
        />
        <span>
          Relax scanner quality checks <span className="field__hint">(recommended)</span>
        </span>
      </label>

      <label className="settings-checkbox">
        <input
          type="checkbox"
          checked={settings.scannerAutoFlashlight}
          onChange={(e) => updateSettings({ scannerAutoFlashlight: e.target.checked })}
        />
        <span>Automatically enable flashlight while scanning</span>
      </label>

      <p className="field__hint">
        Flashlight is only used when your device supports it. You can still toggle it manually during a scan.
      </p>
    </Card>
  );
}
