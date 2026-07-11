import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { QuickCheckWorkflow } from '../components/strip/QuickCheckWorkflow';
import type { PoolInfo } from '../models/types';
import type { StripBrandDefinition, StripPadSelections } from '../strip/types';
import type { CreateStripTestOptions } from '../services/quickCheckService';

export function QuickCheckPage() {
  const { addStripTest } = useApp();
  const navigate = useNavigate();

  async function handleSave(
    brand: StripBrandDefinition,
    selections: StripPadSelections,
    pool: PoolInfo,
    options?: CreateStripTestOptions
  ) {
    const test = await addStripTest(brand.id, selections, pool, options);
    navigate(`/history/${test.id}`);
  }

  return <QuickCheckWorkflow onSave={handleSave} />;
}
