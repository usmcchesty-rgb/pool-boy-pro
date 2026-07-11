import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { NavButton } from '../components/ui/NavButton';
import { TaylorTestWorkflow } from '../components/test/TaylorTestWorkflow';
import { PageHeader } from '../components/layout/PageHeader';
import { formatDateTime } from '../utilities/format';
import { taylorInputsFromWaterTest } from '../utilities/taylorFromTest';

export function EditTestPage() {
  const { id } = useParams<{ id: string }>();
  const { tests, settings, updateTest } = useApp();
  const navigate = useNavigate();
  const test = tests.find((t) => t.id === id);

  if (!test) {
    return (
      <div className="page edit-test">
        <PageHeader title="Edit Test" subtitle="Test not found" />
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
    <TaylorTestWorkflow
      title="Edit Water Test"
      subtitle={formatDateTime(test.date)}
      initialPool={test.pool}
      initialInputs={taylorInputsFromWaterTest(test, settings)}
      initialNotes={test.notes ?? ''}
      saveLabel="Save Changes"
      onSave={async (readings, pool, notes) => {
        await updateTest(test.id, readings, pool, notes);
        navigate(`/history/${test.id}`);
      }}
    />
  );
}
