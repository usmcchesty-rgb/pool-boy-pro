import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { NavButton } from '../components/ui/NavButton';
import { TrendChart } from '../components/charts/TrendChart';
import { CHART_PARAMETERS, useChartData } from '../hooks/useChartData';
import type { ChartTimeRange } from '../models/types';
import { PageHeader } from '../components/layout/PageHeader';
import { getChartIdealRanges } from '../utilities/chartIdeals';

const RANGES: { value: ChartTimeRange; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All Time' },
];

function MiniChart({
  paramKey,
  range,
  idealRanges,
}: {
  paramKey: (typeof CHART_PARAMETERS)[number]['key'];
  range: ChartTimeRange;
  idealRanges: ReturnType<typeof getChartIdealRanges>;
}) {
  const { tests } = useApp();
  const param = CHART_PARAMETERS.find((p) => p.key === paramKey)!;
  const data = useChartData(tests, paramKey, range);
  const ideal = idealRanges[paramKey];
  return (
    <Card title={param.label}>
      <TrendChart
        data={data}
        color={param.color}
        unit={param.unit}
        idealMin={ideal?.min}
        idealMax={ideal?.max}
        height={180}
      />
    </Card>
  );
}

export function ChartsPage() {
  const { tests, settings } = useApp();
  const [range, setRange] = useState<ChartTimeRange>('30d');
  const [activeParam, setActiveParam] = useState(CHART_PARAMETERS[0].key);
  const idealRanges = useMemo(
    () => getChartIdealRanges(settings.poolProfile),
    [settings.poolProfile]
  );

  const param = CHART_PARAMETERS.find((p) => p.key === activeParam)!;
  const data = useChartData(tests, activeParam, range);
  const ideals = idealRanges[activeParam];

  if (tests.length === 0) {
    return (
      <div className="page charts">
        <PageHeader
          title="Water Quality Trends"
          subtitle="Track parameters over time"
        />
        <Card>
          <EmptyState
            icon="↗"
            title="No trend data yet"
            description="Run water tests to see how your pool chemistry changes over time."
            action={
              <NavButton to="/test">+ New Test</NavButton>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="page charts">
      <PageHeader
        title="Water Quality Trends"
        subtitle="Track parameters over time"
      />

      <div className="chart-controls">
        <div className="range-tabs" role="tablist" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.value}
              role="tab"
              aria-selected={range === r.value}
              className={`range-tab ${range === r.value ? 'range-tab--active' : ''}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="param-tabs" role="tablist" aria-label="Parameter">
          {CHART_PARAMETERS.map((p) => (
            <button
              key={p.key}
              role="tab"
              aria-selected={activeParam === p.key}
              className={`param-tab ${activeParam === p.key ? 'param-tab--active' : ''}`}
              style={{ '--param-color': p.color } as React.CSSProperties}
              onClick={() => setActiveParam(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Card title={`${param.label} — ${RANGES.find((r) => r.value === range)?.label}`}>
        <TrendChart
          data={data}
          color={param.color}
          unit={param.unit}
          idealMin={ideals?.min}
          idealMax={ideals?.max}
        />
      </Card>

      <div className="charts-grid">
        {CHART_PARAMETERS.filter((p) => p.key !== activeParam).map((p) => (
          <MiniChart key={p.key} paramKey={p.key} range={range} idealRanges={idealRanges} />
        ))}
      </div>
    </div>
  );
}
