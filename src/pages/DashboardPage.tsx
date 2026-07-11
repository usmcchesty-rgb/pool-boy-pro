import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { NavButton } from '../components/ui/NavButton';
import { ScoreRing } from '../components/ui/ScoreRing';
import { ParameterRow } from '../components/test/ParameterRow';
import { RecommendationList } from '../components/test/RecommendationList';
import { TrendChart } from '../components/charts/TrendChart';
import { useChartData } from '../hooks/useChartData';
import { formatRelativeDate, formatDateTime } from '../utilities/format';
import { getTestSourceDisplayLabel, getTestAccuracyLabel } from '../utilities/testSourceDisplay';
import { PageHeader } from '../components/layout/PageHeader';
import { DashboardHealthSummary } from '../components/dashboard/DashboardHealthSummary';
import { DashboardIntegrationCards } from '../components/dashboard/DashboardIntegrationCards';
import { getChartIdealRanges } from '../utilities/chartIdeals';

export function DashboardPage() {
  const { latestTest, tests, settings, equipment, maintenanceTasks, chemicalInventory } = useApp();
  const fcTrend = useChartData(tests, 'freeChlorine', '30d');
  const phTrend = useChartData(tests, 'ph', '30d');
  const idealRanges = useMemo(
    () => getChartIdealRanges(settings.poolProfile),
    [settings.poolProfile]
  );

  return (
    <div className="page dashboard">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back — ${settings.poolName}`}
        actions={
          <>
            <NavButton to="/quick-check" variant="secondary" size="lg">
              Quick Test
            </NavButton>
            <NavButton to="/test" size="lg">+ New Test</NavButton>
          </>
        }
      />

      {!latestTest ? (
        <Card className="empty-state--dashboard">
          <EmptyState
            icon="🧪"
            title="No tests yet"
            description="Run your first Taylor K-2006-SALT test to see water quality analysis and recommendations."
            action={
              <NavButton to="/test" size="lg">Start Your First Test</NavButton>
            }
          />
        </Card>
      ) : (
        <div className="dashboard-grid">
          <Card
            title="Latest Test"
            className="dashboard-latest"
            action={
              <NavButton to="/test" className="dashboard-new-test-action">
                + New Water Test
              </NavButton>
            }
          >
            {latestTest.analysis ? (
              <DashboardHealthSummary
                analysis={latestTest.analysis}
                testDate={latestTest.date}
                testId={latestTest.id}
                sourceLabel={getTestSourceDisplayLabel(latestTest)}
                accuracyLabel={getTestAccuracyLabel(latestTest)}
                inventory={chemicalInventory}
                equipment={equipment}
              />
            ) : (
              <div className="dashboard-latest__top">
                <ScoreRing score={0} status="mixed" />
                <div className="dashboard-latest__info">
                  <p className="dashboard-latest__date">{formatRelativeDate(latestTest.date)}</p>
                  <p className="dashboard-latest__datetime">{formatDateTime(latestTest.date)}</p>
                  <NavButton to={`/history/${latestTest.id}`} variant="secondary" size="sm">
                    View Details
                  </NavButton>
                </div>
              </div>
            )}
          </Card>

          <Card title="Chemical Balance">
            <div className="param-grid">
              {latestTest.analysis?.parameters.slice(0, 6).map((p) => (
                <ParameterRow key={p.parameter} param={p} compact />
              ))}
            </div>
          </Card>

          <Card title="Outstanding Recommendations">
            <RecommendationList
              recommendations={latestTest.analysis?.recommendations ?? []}
              treatmentPlan={latestTest.analysis?.treatmentPlan}
              readings={latestTest.readings}
              inventory={chemicalInventory}
              equipment={equipment}
              compact
            />
          </Card>

          <DashboardIntegrationCards
            equipment={equipment}
            maintenanceTasks={maintenanceTasks}
            chemicalInventory={chemicalInventory}
            recommendationCount={latestTest.analysis?.recommendations.length ?? 0}
          />

          <Card title="Free Chlorine Trend (30 days)">
            <TrendChart
              data={fcTrend}
              color="#2A9D8F"
              unit="ppm"
              idealMin={idealRanges.freeChlorine.min}
              idealMax={idealRanges.freeChlorine.max}
              height={200}
            />
          </Card>

          <Card title="pH Trend (30 days)">
            <TrendChart
              data={phTrend}
              color="#457B9D"
              unit=""
              idealMin={idealRanges.ph.min}
              idealMax={idealRanges.ph.max}
              height={200}
            />
          </Card>

          <Card
            title="Recent History"
            action={
              <NavButton to="/history" variant="ghost" size="sm">View All</NavButton>
            }
          >
            <ul className="history-mini">
              {tests.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <Link to={`/history/${t.id}`} className="history-mini__link">
                    <span>{formatRelativeDate(t.date)}</span>
                    <span className="history-mini__score">{t.analysis?.overallScore ?? '—'}/100</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
