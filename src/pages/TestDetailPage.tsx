import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { NavButton } from '../components/ui/NavButton';
import { WaterAnalysisDetail } from '../components/test/WaterAnalysisDetail';
import { getTestSourceDisplayLabel, getTestAccuracyLabel } from '../utilities/testSourceDisplay';
import { getTestSource } from '../utilities/historyFilters';
import { TestSourceBadge } from '../components/strip/TestSourceBadge';
import { formatDateTime } from '../utilities/format';
import { formatVolume } from '../utilities/units';
import { PageHeader } from '../components/layout/PageHeader';

export function TestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tests, deleteTest } = useApp();
  const navigate = useNavigate();
  const test = tests.find((t) => t.id === id);

  if (!test) {
    return (
      <div className="page test-detail">
        <PageHeader title="Test Details" subtitle="Test not found" />
        <Card>
          <EmptyState
            title="Test not found"
            description="This test may have been deleted or the link is invalid."
            action={
              <NavButton to="/history" variant="secondary">
                Back to History
              </NavButton>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="page test-detail">
      <PageHeader
        title="Test Details"
        subtitle={formatDateTime(test.date)}
        beforeTitle={
          <Link to="/history" className="back-link">
            ← History
          </Link>
        }
        actions={
          <>
            {getTestSource(test) === 'taylor_k2006_salt' && (
              <NavButton to={`/history/${test.id}/edit`} variant="secondary" size="sm">
                Edit Test
              </NavButton>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm('Delete this test permanently?')) {
                  deleteTest(test.id);
                  navigate('/history');
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      />

      <div className="detail-grid">
        <Card title="Test Source">
          <TestSourceBadge
            label={getTestSourceDisplayLabel(test)}
            accuracyLabel={getTestAccuracyLabel(test)}
          />
          {test.stripMetadata && (
            <p className="field__hint">
              {test.stripMetadata.productName} — manual chart entry. Results are estimates.
            </p>
          )}
        </Card>

        <Card title="Pool Information">
          <dl className="info-dl">
            <div><dt>Volume</dt><dd>{formatVolume(test.pool.volume, test.pool.volumeUnit)}</dd></div>
            <div><dt>Pool Type</dt><dd>{test.pool.poolType.replace('_', ' ')}</dd></div>
            <div><dt>Sanitizer</dt><dd>{test.pool.sanitizerType}</dd></div>
          </dl>
          {test.notes && (
            <p className="test-notes"><strong>Notes:</strong> {test.notes}</p>
          )}
        </Card>

        <Card title="Water Analysis" className="detail-full">
          {test.analysis ? (
            <WaterAnalysisDetail analysis={test.analysis} readings={test.readings} />
          ) : (
            <p>Analysis is not available for this test.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
