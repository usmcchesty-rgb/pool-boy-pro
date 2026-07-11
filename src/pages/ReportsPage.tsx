import { useRef } from 'react';
import { NavButton } from '../components/ui/NavButton';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ScoreRing } from '../components/ui/ScoreRing';
import { RecommendationList } from '../components/test/RecommendationList';
import { TrendChart } from '../components/charts/TrendChart';
import { useChartData } from '../hooks/useChartData';
import { formatDateTime, statusLabel } from '../utilities/format';
import { formatVolume } from '../utilities/units';
import { Logo } from '../components/ui/Logo';
import { PageHeader } from '../components/layout/PageHeader';

export function ReportsPage() {
  const { latestTest, tests, settings } = useApp();
  const reportRef = useRef<HTMLDivElement>(null);
  const fcTrend = useChartData(tests, 'freeChlorine', '90d');
  const phTrend = useChartData(tests, 'ph', '90d');

  const previousTest = tests[1];

  function printReport() {
    window.print();
  }

  if (!latestTest) {
    return (
      <div className="page reports">
        <PageHeader
          title="Reports"
          subtitle="No test data available for reports"
        />
        <Card>
          <EmptyState
            icon="▣"
            title="No report data yet"
            description="Complete at least one water test to generate a printable pool report."
            action={
              <NavButton to="/test">+ New Test</NavButton>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="page reports">
      <PageHeader
        className="no-print"
        title="Water Quality Report"
        subtitle={`Printable summary for ${settings.poolName}`}
        actions={<Button onClick={printReport}>Print Report</Button>}
      />

      <div className="report-document" ref={reportRef}>
        <header className="report-header">
          <div className="report-header__brand">
            <Logo variant="solid" size="lg" className="report-header__logo" />
            <div>
              <p className="report-header__pool">{settings.poolName}</p>
            </div>
          </div>
          <div className="report-meta">
            <p>Generated: {formatDateTime(new Date().toISOString())}</p>
            <p>Test Kit: Taylor K-2006-SALT FAS-DPD</p>
          </div>
        </header>

        <section className="report-section">
          <h2>Current Readings — {formatDateTime(latestTest.date)}</h2>
          <div className="report-current">
            <ScoreRing
              score={latestTest.analysis?.overallScore ?? 0}
              status={latestTest.analysis?.overallStatus ?? 'mixed'}
              size={100}
            />
            <p>{latestTest.analysis?.summary}</p>
          </div>
          <table className="report-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Value</th>
                <th>Status</th>
                <th>Ideal Range</th>
              </tr>
            </thead>
            <tbody>
              {latestTest.analysis?.parameters.map((p) => (
                <tr key={p.parameter}>
                  <td>{p.label}</td>
                  <td>{p.value}{p.unit ? ` ${p.unit}` : ''}</td>
                  <td>{statusLabel(p.status)}</td>
                  <td>{p.idealMin}–{p.idealMax}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {previousTest && (
          <section className="report-section">
            <h2>Historical Comparison</h2>
            <p>Previous test: {formatDateTime(previousTest.date)} (Score: {previousTest.analysis?.overallScore}/100)</p>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Current</th>
                  <th>Previous</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Free Chlorine', latestTest.readings.freeChlorine, previousTest.readings.freeChlorine],
                  ['pH', latestTest.readings.ph, previousTest.readings.ph],
                  ['Alkalinity', latestTest.readings.totalAlkalinity, previousTest.readings.totalAlkalinity],
                  ['Salt', latestTest.readings.salt, previousTest.readings.salt],
                ].map(([label, curr, prev]) => (
                  <tr key={label as string}>
                    <td>{label as string}</td>
                    <td>{curr as number}</td>
                    <td>{prev as number}</td>
                    <td>{((curr as number) - (prev as number)).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="report-section">
          <h2>Trend Charts (90 Days)</h2>
          <div className="report-charts">
            <div>
              <h3>Free Chlorine</h3>
              <TrendChart data={fcTrend} color="#2A9D8F" unit="ppm" height={160} />
            </div>
            <div>
              <h3>pH</h3>
              <TrendChart data={phTrend} color="#457B9D" unit="" height={160} />
            </div>
          </div>
        </section>

        <section className="report-section">
          <h2>Chemical Recommendations</h2>
          <RecommendationList recommendations={latestTest.analysis?.recommendations ?? []} />
        </section>

        <section className="report-section">
          <h2>Pool Information</h2>
          <p>
            Volume: {formatVolume(latestTest.pool.volume, latestTest.pool.volumeUnit)} ·
            Type: {latestTest.pool.poolType.replace('_', ' ')} ·
            Sanitizer: {latestTest.pool.sanitizerType}
          </p>
        </section>

        <footer className="report-footer">
          <p>Pool Boy Pro — For informational purposes. Always follow chemical manufacturer instructions.</p>
        </footer>
      </div>
    </div>
  );
}
