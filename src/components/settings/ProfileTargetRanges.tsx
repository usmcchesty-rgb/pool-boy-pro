import type { PoolProfileConfig } from '../../models/types';
import {
  formatDosingTarget,
  formatIdealRangeDisplay,
  getProfileFactorLabel,
  getProfileSummaryParts,
  getTargetRangeDetails,
} from '../../chemistry/profileRangeDisplay';

interface ProfileTargetRangesProps {
  profile: PoolProfileConfig;
}

export function ProfileTargetRanges({ profile }: ProfileTargetRangesProps) {
  const summaryParts = getProfileSummaryParts(profile);
  const rangeDetails = getTargetRangeDetails(profile);
  const hasCustomizations = rangeDetails.some((r) => r.changedBy.length > 0);

  return (
    <div className="profile-target-ranges">
      <div className="profile-target-summary" aria-label="Active pool profile">
        <p className="profile-target-summary__title">Active profile</p>
        <ul className="profile-target-summary__chips">
          {summaryParts.map(({ label, value }) => (
            <li key={label} className="profile-target-summary__chip">
              <span className="profile-target-summary__chip-label">{label}</span>
              <span className="profile-target-summary__chip-value">{value}</span>
            </li>
          ))}
        </ul>
      </div>

      {hasCustomizations && (
        <p className="profile-target-legend field__hint">
          Tags show which profile setting adjusted a range from the default outdoor plaster pool.
        </p>
      )}

      <div className="profile-target-grid">
        {rangeDetails.map((range) => (
          <article key={range.parameter} className="profile-target-card">
            <header className="profile-target-card__header">
              <h3 className="profile-target-card__title">{range.label}</h3>
              {range.changedBy.length > 0 && (
                <ul className="profile-target-card__factors" aria-label="Adjusted by">
                  {range.changedBy.map((factor) => (
                    <li
                      key={factor}
                      className={`profile-factor-badge profile-factor-badge--${factor}`}
                    >
                      {getProfileFactorLabel(factor)}
                    </li>
                  ))}
                </ul>
              )}
            </header>

            <dl className="profile-target-card__values">
              <div>
                <dt>Ideal range</dt>
                <dd>{formatIdealRangeDisplay(range.thresholds, range.unit)}</dd>
              </div>
              {formatDosingTarget(range.parameter, range.target, range.unit) && (
                <div>
                  <dt>Treatment target</dt>
                  <dd>{formatDosingTarget(range.parameter, range.target, range.unit)}</dd>
                </div>
              )}
            </dl>

            <div className="profile-target-card__explain">
              <p><strong>What it is:</strong> {range.whatItMeans}</p>
              <p><strong>Why it matters:</strong> {range.whyItMatters}</p>
              {range.profileNote && (
                <p className="profile-target-card__note">
                  <strong>Your profile:</strong> {range.profileNote}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
