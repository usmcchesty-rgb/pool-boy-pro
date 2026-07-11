import { isAdaptiveLearningEnabled } from '../../strip/calibration/adaptiveStorage';

interface AdaptiveLearningPromptProps {
  eligibleCount: number;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export function AdaptiveLearningPrompt({
  eligibleCount,
  enabled,
  onEnabledChange,
}: AdaptiveLearningPromptProps) {
  if (eligibleCount === 0 || !isAdaptiveLearningEnabled()) return null;

  return (
    <div className="adaptive-learning-prompt">
      <label className="adaptive-learning-prompt__label">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        <span>
          Use these verified readings to improve scanner accuracy on this device?
        </span>
      </label>
      <p className="field__hint">
        {eligibleCount} pad{eligibleCount !== 1 ? 's' : ''} eligible · numerical color data only · stored locally
      </p>
    </div>
  );
}
