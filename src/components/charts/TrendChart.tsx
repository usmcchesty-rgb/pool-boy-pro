import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ChartDataPoint } from '../../hooks/useChartData';

interface TrendChartProps {
  data: ChartDataPoint[];
  color: string;
  unit: string;
  idealMin?: number;
  idealMax?: number;
  height?: number;
}

export function TrendChart({
  data,
  color,
  unit,
  idealMin,
  idealMax,
  height = 280,
}: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="chart-empty" style={{ height }}>
        <p>No test data for this time range.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          stroke="var(--border-subtle)"
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          stroke="var(--border-subtle)"
          unit={unit ? ` ${unit}` : ''}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
          }}
          formatter={(value) => {
            const num = typeof value === 'number' ? value : Number(value);
            return [`${num.toFixed(num < 10 ? 1 : 0)}${unit ? ' ' + unit : ''}`, 'Value'];
          }}
        />
        {idealMin !== undefined && (
          <ReferenceLine y={idealMin} stroke="var(--status-ideal)" strokeDasharray="4 4" label="Min" />
        )}
        {idealMax !== undefined && (
          <ReferenceLine y={idealMax} stroke="var(--status-ideal)" strokeDasharray="4 4" label="Max" />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
