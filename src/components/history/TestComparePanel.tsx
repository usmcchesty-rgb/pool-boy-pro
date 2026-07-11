import type { WaterTest } from '../../models/types';
import { formatDateTime } from '../../utilities/format';
import {
  buildCompareRows,
  buildCompareSummaries,
  compareTrendLabel,
  type CompareTrend,
} from '../../utilities/testComparison';

interface TestComparePanelProps {
  tests: WaterTest[];
}

function trendClass(trend: CompareTrend): string {
  return `compare-trend compare-trend--${trend}`;
}

function TrendBadge({ trend }: { trend: CompareTrend }) {
  if (trend === 'baseline') {
    return <span className={trendClass(trend)}>Baseline</span>;
  }
  return <span className={trendClass(trend)}>{compareTrendLabel(trend)}</span>;
}

export function TestComparePanel({ tests }: TestComparePanelProps) {
  const summaries = buildCompareSummaries(tests, formatDateTime);
  const rows = buildCompareRows(tests);

  return (
    <div className="test-compare">
      <div className="test-compare__summary">
        {summaries.map((summary) => (
          <div key={summary.testId} className="test-compare-summary-card">
            <p className="test-compare-summary-card__date">{summary.dateLabel}</p>
            <div className="test-compare-summary-card__score">
              <span className="test-compare-summary-card__score-value">
                {summary.score != null ? `${summary.score}/100` : '—'}
              </span>
              <span className="test-compare-summary-card__rating">{summary.ratingLabel}</span>
            </div>
            {summary.scoreTrend !== 'baseline' && (
              <div className="test-compare-summary-card__changes">
                {summary.scoreDelta && (
                  <span className={trendClass(summary.scoreTrend)}>
                    Score {summary.scoreDelta}
                  </span>
                )}
                {summary.ratingTrend !== 'similar' && (
                  <span className={trendClass(summary.ratingTrend)}>
                    Rating {compareTrendLabel(summary.ratingTrend).toLowerCase()}
                  </span>
                )}
              </div>
            )}
            {summary.scoreTrend === 'baseline' && (
              <span className={trendClass('baseline')}>Oldest selected — reference</span>
            )}
          </div>
        ))}
      </div>

      <div className="test-compare__desktop compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th>Parameter</th>
              {summaries.map((s) => (
                <th key={s.testId}>{s.dateLabel}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  {row.label}
                  {row.unit && <span className="compare-table__unit"> ({row.unit})</span>}
                </td>
                {row.values.map((value) => (
                  <td key={value.testId}>
                    <span className="compare-table__value">{value.display}</span>
                    <TrendBadge trend={value.trend} />
                    {value.deltaLabel && (
                      <span className="compare-table__delta">{value.deltaLabel}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="test-compare__mobile">
        {rows.map((row) => (
          <article key={row.key} className="compare-param-card">
            <h3 className="compare-param-card__title">
              {row.label}
              {row.unit && <span className="compare-param-card__unit">{row.unit}</span>}
            </h3>
            <ul className="compare-param-card__values">
              {row.values.map((value, index) => (
                <li key={value.testId} className="compare-param-card__value-row">
                  <span className="compare-param-card__date">{summaries[index]?.dateLabel}</span>
                  <span className="compare-param-card__reading">{value.display}</span>
                  <TrendBadge trend={value.trend} />
                  {value.deltaLabel && (
                    <span className="compare-param-card__delta">{value.deltaLabel}</span>
                  )}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
