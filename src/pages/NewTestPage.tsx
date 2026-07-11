import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TaylorTestWorkflow } from '../components/test/TaylorTestWorkflow';
import { defaultTaylorInputs } from '../models/taylorKit';
import { poolFromSettings } from '../services/testService';

export function NewTestPage() {
  const { settings, addTest } = useApp();
  const navigate = useNavigate();

  return (
    <TaylorTestWorkflow
      title="New Water Test"
      subtitle="Taylor K-2006-SALT test assistant"
      initialPool={poolFromSettings(settings)}
      initialInputs={defaultTaylorInputs(settings)}
      onSave={async (readings, pool, notes) => {
        const test = await addTest(readings, pool, notes);
        navigate(`/history/${test.id}`);
      }}
    />
  );
}
