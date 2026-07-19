import { useState } from 'react';
import type { TaylorAdaptiveInsight, TaylorResultInterpretation, LearnMoreTopic } from '../../utilities/taylorAssistant';
import { LEARN_MORE_TOPICS } from '../../utilities/taylorAssistant';

interface TaylorWhyThisTestProps {
  explanation: string;
}

export function TaylorWhyThisTest({ explanation }: TaylorWhyThisTestProps) {
  return (
    <details className="taylor-why">
      <summary>Why am I doing this test?</summary>
      <p>{explanation}</p>
    </details>
  );
}

interface TaylorLearnMoreProps {
  topics?: LearnMoreTopic[];
}

export function TaylorLearnMore({ topics = LEARN_MORE_TOPICS }: TaylorLearnMoreProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = topics.find((t) => t.id === activeId);

  return (
    <div className="taylor-learn-more">
      <p className="taylor-learn-more__label">Learn more</p>
      <div className="taylor-learn-more__links">
        {topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            className={`taylor-learn-more__link ${activeId === topic.id ? 'taylor-learn-more__link--active' : ''}`}
            onClick={() => setActiveId(activeId === topic.id ? null : topic.id)}
            aria-expanded={activeId === topic.id}
          >
            {topic.title}
          </button>
        ))}
      </div>
      {active && (
        <div className="taylor-learn-more__panel" role="region" aria-label={active.title}>
          <h4 className="taylor-learn-more__panel-title">{active.title}</h4>
          <p>{active.body}</p>
          <button type="button" className="taylor-learn-more__close" onClick={() => setActiveId(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}

const BADGE_CLASS: Record<TaylorResultInterpretation['badge'], string> = {
  excellent: 'taylor-status-card__badge--excellent',
  good: 'taylor-status-card__badge--good',
  needs_attention: 'taylor-status-card__badge--attention',
  low: 'taylor-status-card__badge--low',
  high: 'taylor-status-card__badge--high',
};

interface TaylorResultInterpretationPanelProps {
  interpretation: TaylorResultInterpretation;
}

export function TaylorResultInterpretationPanel({ interpretation }: TaylorResultInterpretationPanelProps) {
  return (
    <div className="taylor-status-card" role="status" aria-live="polite">
      <div className="taylor-status-card__header">
        <span className="taylor-status-card__label">{interpretation.label}</span>
        <span className="taylor-status-card__value">{interpretation.value}</span>
        <span className={`taylor-status-card__badge ${BADGE_CLASS[interpretation.badge]}`}>
          {interpretation.badgeLabel}
        </span>
      </div>
      <p className="taylor-status-card__summary">{interpretation.summary}</p>
      <div className="taylor-status-card__body">
        <p className="taylor-status-card__measures">{interpretation.whatItMeasures}</p>
        {interpretation.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </div>
  );
}

interface TaylorAdaptiveInsightsPanelProps {
  insights: TaylorAdaptiveInsight[];
}

export function TaylorAdaptiveInsightsPanel({ insights }: TaylorAdaptiveInsightsPanelProps) {
  if (insights.length === 0) return null;
  return (
    <div className="taylor-adaptive" role="note">
      <h4 className="taylor-adaptive__title">What this means for your pool</h4>
      <ul className="taylor-adaptive__list">
        {insights.map((i) => (
          <li key={i.id}>{i.message}</li>
        ))}
      </ul>
    </div>
  );
}

interface TaylorNextStepPreviewProps {
  message: string;
}

export function TaylorNextStepPreview({ message }: TaylorNextStepPreviewProps) {
  return (
    <div className="taylor-next-step" role="note">
      <span className="taylor-next-step__label">Next</span>
      <p>{message}</p>
    </div>
  );
}

interface TaylorConfidenceNoteProps {
  message: string;
}

export function TaylorConfidenceNote({ message }: TaylorConfidenceNoteProps) {
  return (
    <p className="taylor-confidence" role="note">
      {message}
    </p>
  );
}

interface TaylorCompletionEncouragementProps {
  title: string;
  paragraphs: string[];
}

export function TaylorCompletionEncouragement({ title, paragraphs }: TaylorCompletionEncouragementProps) {
  return (
    <div className="taylor-completion" role="status">
      <h3 className="taylor-completion__title">{title}</h3>
      {paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}
