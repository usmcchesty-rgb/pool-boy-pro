import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { StripPadPicker } from './StripPadPicker';
import { StripAccuracyBadge } from './TestSourceBadge';
import type { StripBrandDefinition, StripPadSelections } from '../../strip/types';
import type { PadMatchResult } from '../../strip/scanner/types';
import { confidenceToLevel } from '../../strip/scanner/colorMatcher';
import { getActiveAnchorInfo, getActiveAnchorsForMatching } from '../../strip/calibration/anchorProvider';

interface StripScanVerificationProps {
  brand: StripBrandDefinition;
  matches: PadMatchResult[];
  selections: StripPadSelections;
  onChange: (padId: string, value: number) => void;
  onRescan: (phase: 'six_way' | 'salt') => void;
  onContinue: (verifiedPadIds: Set<string>) => void;
  needsSaltScan: boolean;
}

function rgbToCss(rgb: [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function needsExplicitConfirmation(match: PadMatchResult): boolean {
  return match.confidenceLevel === 'low' || match.ambiguous === true;
}

export function StripScanVerification({
  brand,
  matches,
  selections,
  onChange,
  onRescan,
  onContinue,
  needsSaltScan,
}: StripScanVerificationProps) {
  const [confirmedPads, setConfirmedPads] = useState<Set<string>>(new Set());
  const anchorInfo = getActiveAnchorInfo();

  const unresolvedPads = useMemo(
    () => matches.filter((m) => needsExplicitConfirmation(m) && !confirmedPads.has(m.padId)),
    [matches, confirmedPads]
  );

  const missingPads = brand.pads.filter((p) => selections[p.id] === undefined);
  const canContinue = missingPads.length === 0 && unresolvedPads.length === 0;

  function confirmPad(padId: string) {
    setConfirmedPads((prev) => new Set(prev).add(padId));
  }

  function handleChange(padId: string, value: number) {
    onChange(padId, value);
    setConfirmedPads((prev) => new Set(prev).add(padId));
  }

  function handleContinue() {
    const verified = new Set<string>();
    for (const m of matches) {
      if (needsExplicitConfirmation(m)) {
        if (confirmedPads.has(m.padId)) verified.add(m.padId);
      } else {
        verified.add(m.padId);
      }
    }
    onContinue(verified);
  }

  return (
    <div className="strip-scan-verify">
      <p className="field__hint">
        Confirm each reading matches your strip. Scanner uses <strong>{anchorInfo.label}</strong>.
        Adjust any value using the chart picker below.
      </p>

      <ul className="strip-scan-verify__results">
        {matches.map((match) => {
          const pad = brand.pads.find((p) => p.id === match.padId)!;
          const needsConfirm = needsExplicitConfirmation(match);
          const confirmed = !needsConfirm || confirmedPads.has(match.padId);
          const displayLevel = match.ambiguous ? 'low' : match.confidenceLevel;

          return (
            <li
              key={match.padId}
              className={`strip-scan-verify__item strip-scan-verify__item--${displayLevel} ${match.ambiguous ? 'strip-scan-verify__item--ambiguous' : ''}`}
            >
              <div className="strip-scan-verify__header">
                <span className="strip-scan-verify__label">{pad.label}</span>
                <StripAccuracyBadge level={displayLevel} compact />
              </div>

              {match.ambiguous && match.ambiguityReason && (
                <p className="strip-scan-verify__ambiguity" role="note">
                  {match.ambiguityReason}
                </p>
              )}

              <div className="strip-scan-verify__match-row">
                <span
                  className="strip-scan-verify__swatch"
                  style={{ background: rgbToCss(match.matchedAnchorRgb) }}
                  title="Best chart match"
                />
                <span className="strip-scan-verify__value">
                  Best match: <strong>{match.proposedValue}</strong>
                  {pad.unit === 'ppm' ? ' ppm' : ''}
                  <span className="field__hint"> (ΔE {match.deltaE.toFixed(1)})</span>
                </span>
              </div>

              {match.alternateValue !== undefined && (() => {
                const altAnchor = getActiveAnchorsForMatching(match.padId).find((a) => a.value === match.alternateValue);
                return (
                <div className="strip-scan-verify__alternate-row">
                  <span
                    className="strip-scan-verify__swatch strip-scan-verify__swatch--alt"
                    style={altAnchor ? { background: rgbToCss(altAnchor.rgb) } : undefined}
                    title="Alternate chart match"
                  />
                  <span className="strip-scan-verify__alt">
                    Alternate: <strong>{match.alternateValue}</strong>
                    {pad.unit === 'ppm' ? ' ppm' : ''}
                    {match.alternateDeltaE !== undefined && (
                      <span className="field__hint"> (ΔE {match.alternateDeltaE.toFixed(1)}, {match.alternateConfidence}%)</span>
                    )}
                  </span>
                  {(match.ambiguous || match.confidenceLevel === 'low') && (
                    <div className="strip-scan-verify__alt-actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleChange(match.padId, match.proposedValue)}
                        type="button"
                      >
                        Use best ({match.proposedValue})
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleChange(match.padId, match.alternateValue!)}
                        type="button"
                      >
                        Use alternate ({match.alternateValue})
                      </Button>
                    </div>
                  )}
                </div>
                );
              })()}

              <div className="strip-scan-verify__detected" title="Detected pad color (not stored)">
                <span
                  className="strip-scan-verify__swatch strip-scan-verify__swatch--detected"
                  style={{ background: rgbToCss(match.sampledRgb) }}
                />
                <span className="field__hint">Detected color</span>
              </div>

              {needsConfirm && !confirmed && (
                <Button size="sm" variant="secondary" onClick={() => confirmPad(match.padId)} type="button">
                  Confirm reading
                </Button>
              )}

              <StripPadPicker
                pad={pad}
                value={selections[match.padId]}
                onChange={(v) => handleChange(match.padId, v)}
              />
            </li>
          );
        })}
      </ul>

      {needsSaltScan && (
        <div className="strip-scan-verify__salt-prompt">
          <p className="taylor-note">Salt level was not scanned. Scan the salt strip or pick a value below.</p>
          <Button variant="secondary" onClick={() => onRescan('salt')} type="button">
            Scan Salt Strip
          </Button>
          {brand.pads
            .filter((p) => p.id === 'salt')
            .map((pad) => (
              <StripPadPicker
                key={pad.id}
                pad={pad}
                value={selections[pad.id]}
                onChange={(v) => handleChange(pad.id, v)}
              />
            ))}
        </div>
      )}

      {unresolvedPads.length > 0 && (
        <p className="field__error" role="alert">
          Confirm or choose a value for: {unresolvedPads.map((m) => brand.pads.find((p) => p.id === m.padId)?.label).join(', ')}
        </p>
      )}

      <div className="strip-scan-verify__actions">
        <Button variant="secondary" onClick={() => onRescan('six_way')} type="button">
          Rescan Six-Way Strip
        </Button>
        <Button onClick={handleContinue} disabled={!canContinue} type="button">
          Continue to Review
        </Button>
      </div>
    </div>
  );
}

export function matchesToSelections(matches: PadMatchResult[]): StripPadSelections {
  return Object.fromEntries(matches.map((m) => [m.padId, m.proposedValue]));
}

export function mergeScanMatches(
  existing: PadMatchResult[],
  newMatches: PadMatchResult[]
): PadMatchResult[] {
  const map = new Map(existing.map((m) => [m.padId, m]));
  for (const m of newMatches) map.set(m.padId, m);
  return [...map.values()];
}

export function overallScanConfidence(matches: PadMatchResult[]): number {
  if (matches.length === 0) return 0;
  const min = Math.min(...matches.map((m) => m.confidence));
  const avg = matches.reduce((s, m) => s + m.confidence, 0) / matches.length;
  return Math.round(min * 0.6 + avg * 0.4);
}

export function overallScanAccuracy(matches: PadMatchResult[]) {
  return confidenceToLevel(overallScanConfidence(matches));
}
