import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { NewTestPage } from './pages/NewTestPage';
import { HistoryPage } from './pages/HistoryPage';
import { TestDetailPage } from './pages/TestDetailPage';
import { ChartsPage } from './pages/ChartsPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { EquipmentPage } from './pages/EquipmentPage';
import { EquipmentNewPage } from './pages/EquipmentNewPage';
import { EquipmentDetailPage } from './pages/EquipmentDetailPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { MaintenanceNewPage } from './pages/MaintenanceNewPage';
import { MaintenanceDetailPage } from './pages/MaintenanceDetailPage';
import { InventoryPage } from './pages/InventoryPage';
import { InventoryNewPage } from './pages/InventoryNewPage';
import { InventoryDetailPage } from './pages/InventoryDetailPage';
import { QuickCheckPage } from './pages/QuickCheckPage';
import { EditTestPage } from './pages/EditTestPage';
import { NotFoundPage } from './pages/NotFoundPage';
import {
  StripCalibrationDevPage,
  StripDevToolsPage,
  StripValidationDevPage,
} from './pages/dev/StripDevPages';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="test" element={<NewTestPage />} />
            <Route path="quick-check" element={<QuickCheckPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="history/:id" element={<TestDetailPage />} />
            <Route path="history/:id/edit" element={<EditTestPage />} />
            <Route path="charts" element={<ChartsPage />} />
            <Route path="calculator" element={<CalculatorPage />} />
            <Route path="equipment" element={<EquipmentPage />} />
            <Route path="equipment/new" element={<EquipmentNewPage />} />
            <Route path="equipment/:id" element={<EquipmentDetailPage />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="maintenance/new" element={<MaintenanceNewPage />} />
            <Route path="maintenance/:id" element={<MaintenanceDetailPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/new" element={<InventoryNewPage />} />
            <Route path="inventory/:id" element={<InventoryDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="dev/strip-tools" element={<StripDevToolsPage />} />
            <Route path="dev/strip-calibration" element={<StripCalibrationDevPage />} />
            <Route path="dev/strip-validation" element={<StripValidationDevPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
