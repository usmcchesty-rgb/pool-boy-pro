import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppData,
  AppSettings,
  ChemicalInventoryInput,
  ChemicalInventoryItem,
  EquipmentInput,
  MaintenanceInput,
  MaintenanceTask,
  PoolEquipment,
  WaterTest,
} from '../models/types';
import { loadInitialData, saveData, CORRUPT_STORAGE_ERROR } from '../services/dataService';
import { cloneAppData, createDefaultData } from '../storage/repository';
import {
  activateEquipment,
  createEquipment,
  deactivateEquipment,
  updateEquipment,
} from '../services/equipmentService';
import {
  activateMaintenanceTask,
  completeMaintenanceTask,
  createMaintenance,
  deactivateMaintenanceTask,
  updateMaintenance,
} from '../services/maintenanceService';
import {
  activateInventoryItem,
  createInventoryItem,
  deactivateInventoryItem,
  updateInventoryItem,
} from '../services/inventoryService';
import {
  EquipmentRepository,
  InventoryRepository,
  MaintenanceRepository,
  SettingsRepository,
  TestRepository,
} from '../storage/repository';
import { createWaterTest } from '../services/testService';
import { createStripWaterTest, type CreateStripTestOptions } from '../services/quickCheckService';
import { getStripBrand } from '../strip/stripRegistry';
import type { StripPadSelections } from '../strip/types';
import type { PoolInfo, WaterReadings } from '../models/types';
import { Logo } from '../components/ui/Logo';

interface AppContextValue {
  loading: boolean;
  data: AppData;
  tests: WaterTest[];
  equipment: PoolEquipment[];
  maintenanceTasks: MaintenanceTask[];
  chemicalInventory: ChemicalInventoryItem[];
  settings: AppSettings;
  latestTest: WaterTest | undefined;
  addTest: (readings: WaterReadings, pool: PoolInfo, notes?: string) => Promise<WaterTest>;
  addStripTest: (
    brandId: string,
    selections: StripPadSelections,
    pool: PoolInfo,
    options?: CreateStripTestOptions
  ) => Promise<WaterTest>;
  updateTest: (id: string, readings: WaterReadings, pool: PoolInfo, notes?: string) => Promise<void>;
  deleteTest: (id: string) => Promise<void>;
  addEquipment: (input: EquipmentInput) => Promise<PoolEquipment>;
  updateEquipment: (id: string, input: EquipmentInput) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  deactivateEquipment: (id: string) => Promise<void>;
  activateEquipment: (id: string) => Promise<void>;
  addMaintenanceTask: (input: MaintenanceInput) => Promise<MaintenanceTask>;
  updateMaintenanceTask: (id: string, input: MaintenanceInput) => Promise<void>;
  deleteMaintenanceTask: (id: string) => Promise<void>;
  completeMaintenanceTask: (id: string, completedDate?: string) => Promise<void>;
  deactivateMaintenanceTask: (id: string) => Promise<void>;
  activateMaintenanceTask: (id: string) => Promise<void>;
  addInventoryItem: (input: ChemicalInventoryInput) => Promise<ChemicalInventoryItem>;
  updateInventoryItem: (id: string, input: ChemicalInventoryInput) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  deactivateInventoryItem: (id: string) => Promise<void>;
  activateInventoryItem: (id: string) => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  replaceData: (data: AppData) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((error: unknown) => {
        setData(createDefaultData());
        const message =
          error instanceof Error && error.message === CORRUPT_STORAGE_ERROR
            ? 'Saved data could not be read and may be damaged. A fresh setup has been started. Restore from a Settings backup if you have one.'
            : 'Your saved data could not be loaded. A fresh setup has been started.';
        setLoadNotice(message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!data) return;
    const theme = data.settings.theme;
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [data?.settings.theme]);

  const persist = useCallback(async (newData: AppData) => {
    const snapshot = cloneAppData(newData);
    setData(snapshot);
    try {
      await saveData(snapshot);
    } catch {
      setLoadNotice('Could not save your changes. Check browser storage settings and try again.');
      throw new Error('SAVE_FAILED');
    }
  }, []);

  const getData = useCallback(() => data!, [data]);

  const testRepo = useMemo(
    () => (data ? new TestRepository(getData, persist) : null),
    [data, getData, persist]
  );

  const settingsRepo = useMemo(
    () => (data ? new SettingsRepository(getData, persist) : null),
    [data, getData, persist]
  );

  const equipmentRepo = useMemo(
    () => (data ? new EquipmentRepository(getData, persist) : null),
    [data, getData, persist]
  );

  const maintenanceRepo = useMemo(
    () => (data ? new MaintenanceRepository(getData, persist) : null),
    [data, getData, persist]
  );

  const inventoryRepo = useMemo(
    () => (data ? new InventoryRepository(getData, persist) : null),
    [data, getData, persist]
  );

  const tests = useMemo(() => testRepo?.getAll() ?? [], [testRepo, data?.tests]);
  const equipment = useMemo(
    () => equipmentRepo?.getAll() ?? [],
    [equipmentRepo, data?.equipment]
  );
  const maintenanceTasks = useMemo(
    () => maintenanceRepo?.getAll() ?? [],
    [maintenanceRepo, data?.maintenanceTasks]
  );
  const chemicalInventory = useMemo(
    () => inventoryRepo?.getAll() ?? [],
    [inventoryRepo, data?.chemicalInventory]
  );
  const latestTest = tests[0];
  const settings = data?.settings;

  const addTest = useCallback(
    async (readings: WaterReadings, pool: PoolInfo, notes?: string) => {
      if (!testRepo || !settings) throw new Error('App not ready');
      const test = createWaterTest(readings, pool, settings, notes);
      await testRepo.add(test);
      return test;
    },
    [testRepo, settings]
  );

  const addStripTest = useCallback(
    async (
      brandId: string,
      selections: StripPadSelections,
      pool: PoolInfo,
      options?: CreateStripTestOptions
    ) => {
      if (!testRepo || !settings) throw new Error('App not ready');
      const brand = getStripBrand(brandId);
      if (!brand) throw new Error('Unknown strip brand');
      const test = createStripWaterTest(brand, selections, pool, settings, options);
      await testRepo.add(test);
      return test;
    },
    [testRepo, settings]
  );

  const updateTest = useCallback(
    async (id: string, readings: WaterReadings, pool: PoolInfo, notes?: string) => {
      if (!testRepo || !settings) throw new Error('App not ready');
      const existing = testRepo.getById(id);
      if (!existing) return;
      const test = createWaterTest(readings, pool, settings, notes, id);
      test.date = existing.date;
      await testRepo.update(id, test);
    },
    [testRepo, settings]
  );

  const deleteTest = useCallback(
    async (id: string) => {
      if (!testRepo) return;
      await testRepo.delete(id);
    },
    [testRepo]
  );

  const addEquipmentItem = useCallback(
    async (input: EquipmentInput) => {
      if (!equipmentRepo) throw new Error('App not ready');
      const item = createEquipment(input);
      await equipmentRepo.add(item);
      return item;
    },
    [equipmentRepo]
  );

  const updateEquipmentItem = useCallback(
    async (id: string, input: EquipmentInput) => {
      if (!equipmentRepo) return;
      const existing = equipmentRepo.getById(id);
      if (!existing) return;
      await equipmentRepo.update(id, updateEquipment(existing, input));
    },
    [equipmentRepo]
  );

  const deleteEquipmentItem = useCallback(
    async (id: string) => {
      if (!equipmentRepo) return;
      await equipmentRepo.delete(id);
    },
    [equipmentRepo]
  );

  const deactivateEquipmentItem = useCallback(
    async (id: string) => {
      if (!equipmentRepo) return;
      const existing = equipmentRepo.getById(id);
      if (!existing) return;
      await equipmentRepo.update(id, deactivateEquipment(existing));
    },
    [equipmentRepo]
  );

  const activateEquipmentItem = useCallback(
    async (id: string) => {
      if (!equipmentRepo) return;
      const existing = equipmentRepo.getById(id);
      if (!existing) return;
      await equipmentRepo.update(id, activateEquipment(existing));
    },
    [equipmentRepo]
  );

  const addMaintenanceTaskItem = useCallback(
    async (input: MaintenanceInput) => {
      if (!maintenanceRepo) throw new Error('App not ready');
      const task = createMaintenance(input);
      await maintenanceRepo.add(task);
      return task;
    },
    [maintenanceRepo]
  );

  const updateMaintenanceTaskItem = useCallback(
    async (id: string, input: MaintenanceInput) => {
      if (!maintenanceRepo) return;
      const existing = maintenanceRepo.getById(id);
      if (!existing) return;
      await maintenanceRepo.update(id, updateMaintenance(existing, input));
    },
    [maintenanceRepo]
  );

  const deleteMaintenanceTaskItem = useCallback(
    async (id: string) => {
      if (!maintenanceRepo) return;
      await maintenanceRepo.delete(id);
    },
    [maintenanceRepo]
  );

  const completeMaintenanceTaskItem = useCallback(
    async (id: string, completedDate?: string) => {
      if (!maintenanceRepo) return;
      const existing = maintenanceRepo.getById(id);
      if (!existing) return;
      await maintenanceRepo.update(id, completeMaintenanceTask(existing, completedDate));
    },
    [maintenanceRepo]
  );

  const deactivateMaintenanceTaskItem = useCallback(
    async (id: string) => {
      if (!maintenanceRepo) return;
      const existing = maintenanceRepo.getById(id);
      if (!existing) return;
      await maintenanceRepo.update(id, deactivateMaintenanceTask(existing));
    },
    [maintenanceRepo]
  );

  const activateMaintenanceTaskItem = useCallback(
    async (id: string) => {
      if (!maintenanceRepo) return;
      const existing = maintenanceRepo.getById(id);
      if (!existing) return;
      await maintenanceRepo.update(id, activateMaintenanceTask(existing));
    },
    [maintenanceRepo]
  );

  const addInventoryItemFn = useCallback(
    async (input: ChemicalInventoryInput) => {
      if (!inventoryRepo) throw new Error('App not ready');
      const item = createInventoryItem(input);
      await inventoryRepo.add(item);
      return item;
    },
    [inventoryRepo]
  );

  const updateInventoryItemFn = useCallback(
    async (id: string, input: ChemicalInventoryInput) => {
      if (!inventoryRepo) return;
      const existing = inventoryRepo.getById(id);
      if (!existing) return;
      await inventoryRepo.update(id, updateInventoryItem(existing, input));
    },
    [inventoryRepo]
  );

  const deleteInventoryItemFn = useCallback(
    async (id: string) => {
      if (!inventoryRepo) return;
      await inventoryRepo.delete(id);
    },
    [inventoryRepo]
  );

  const deactivateInventoryItemFn = useCallback(
    async (id: string) => {
      if (!inventoryRepo) return;
      const existing = inventoryRepo.getById(id);
      if (!existing) return;
      await inventoryRepo.update(id, deactivateInventoryItem(existing));
    },
    [inventoryRepo]
  );

  const activateInventoryItemFn = useCallback(
    async (id: string) => {
      if (!inventoryRepo) return;
      const existing = inventoryRepo.getById(id);
      if (!existing) return;
      await inventoryRepo.update(id, activateInventoryItem(existing));
    },
    [inventoryRepo]
  );

  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      if (!settingsRepo) return;
      await settingsRepo.update(updates);
    },
    [settingsRepo]
  );

  const replaceData = useCallback(
    async (newData: AppData) => {
      await persist(newData);
    },
    [persist]
  );

  if (loading || !data || !settings) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <Logo variant="transparent" size="lg" className="loading-screen__logo" />
        <div className="loading-spinner" aria-hidden="true" />
        <p>Loading Pool Boy Pro…</p>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        loading,
        data,
        tests,
        equipment,
        maintenanceTasks,
        chemicalInventory,
        settings,
        latestTest,
        addTest,
        addStripTest,
        updateTest,
        deleteTest,
        addEquipment: addEquipmentItem,
        updateEquipment: updateEquipmentItem,
        deleteEquipment: deleteEquipmentItem,
        deactivateEquipment: deactivateEquipmentItem,
        activateEquipment: activateEquipmentItem,
        addMaintenanceTask: addMaintenanceTaskItem,
        updateMaintenanceTask: updateMaintenanceTaskItem,
        deleteMaintenanceTask: deleteMaintenanceTaskItem,
        completeMaintenanceTask: completeMaintenanceTaskItem,
        deactivateMaintenanceTask: deactivateMaintenanceTaskItem,
        activateMaintenanceTask: activateMaintenanceTaskItem,
        addInventoryItem: addInventoryItemFn,
        updateInventoryItem: updateInventoryItemFn,
        deleteInventoryItem: deleteInventoryItemFn,
        deactivateInventoryItem: deactivateInventoryItemFn,
        activateInventoryItem: activateInventoryItemFn,
        updateSettings,
        replaceData,
      }}
    >
      {loadNotice && (
        <div className="app-notice" role="status" aria-live="polite">
          <p>{loadNotice}</p>
          <button type="button" className="app-notice__dismiss" onClick={() => setLoadNotice(null)}>
            Dismiss
          </button>
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
