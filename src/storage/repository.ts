import type {
  AppData,
  AppSettings,
  ChemicalInventoryItem,
  MaintenanceTask,
  PoolEquipment,
  WaterTest,
} from '../models/types';
import { sortEquipment } from '../models/equipment';
import { sortInventoryItems } from '../models/inventory';
import { sortMaintenanceTasks } from '../models/maintenance';
import { APP_VERSION, DEFAULT_SETTINGS, STORAGE_KEY } from '../models/defaults';

/** Storage adapter interface — swap for cloud sync later */
export interface StorageAdapter {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
}

class LocalStorageAdapter implements StorageAdapter {
  async load(): Promise<AppData | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AppData;
      return migrate(parsed);
    } catch {
      throw new Error(CORRUPT_STORAGE_ERROR);
    }
  }

  async save(data: AppData): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      throw new Error('SAVE_FAILED');
    }
  }
}

function migrate(data: AppData): AppData {
  const settings = { ...DEFAULT_SETTINGS, ...data.settings };
  return {
    version: APP_VERSION,
    settings: {
      ...settings,
      poolProfile: {
        ...DEFAULT_SETTINGS.poolProfile,
        ...data.settings?.poolProfile,
        sanitizer:
          data.settings?.poolProfile?.sanitizer ??
          data.settings?.defaultSanitizerType ??
          DEFAULT_SETTINGS.poolProfile.sanitizer,
        spaMode:
          data.settings?.poolProfile?.spaMode ??
          (data.settings?.defaultPoolType === 'spa'),
      },
      chemicalStrengths: {
        ...DEFAULT_SETTINGS.chemicalStrengths,
        ...data.settings?.chemicalStrengths,
      },
    },
    tests: data.tests ?? [],
    equipment: data.equipment ?? [],
    maintenanceTasks: data.maintenanceTasks ?? [],
    chemicalInventory: data.chemicalInventory ?? [],
  };
}

export function createDefaultData(): AppData {
  return {
    version: APP_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    tests: [],
    equipment: [],
    maintenanceTasks: [],
    chemicalInventory: [],
  };
}

/** Immutable snapshot for React state updates after in-place repository mutations */
export function cloneAppData(data: AppData): AppData {
  return {
    version: data.version,
    settings: {
      ...data.settings,
      chemicalStrengths: { ...data.settings.chemicalStrengths },
      poolProfile: { ...data.settings.poolProfile },
    },
    tests: [...data.tests],
    equipment: [...data.equipment],
    maintenanceTasks: [...data.maintenanceTasks],
    chemicalInventory: [...data.chemicalInventory],
  };
}

export const CORRUPT_STORAGE_ERROR = 'CORRUPT_STORAGE';

export const storageAdapter: StorageAdapter = new LocalStorageAdapter();

export class TestRepository {
  private getData: () => AppData;
  private persist: (data: AppData) => Promise<void>;

  constructor(getData: () => AppData, persist: (data: AppData) => Promise<void>) {
    this.getData = getData;
    this.persist = persist;
  }

  getAll(): WaterTest[] {
    return [...this.getData().tests].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  getById(id: string): WaterTest | undefined {
    return this.getData().tests.find((t) => t.id === id);
  }

  async add(test: WaterTest): Promise<void> {
    const data = this.getData();
    data.tests.unshift(test);
    await this.persist(data);
  }

  async update(id: string, updates: Partial<WaterTest>): Promise<void> {
    const data = this.getData();
    const idx = data.tests.findIndex((t) => t.id === id);
    if (idx === -1) return;
    data.tests[idx] = { ...data.tests[idx], ...updates };
    await this.persist(data);
  }

  async delete(id: string): Promise<void> {
    const data = this.getData();
    data.tests = data.tests.filter((t) => t.id !== id);
    await this.persist(data);
  }

  async replaceAll(tests: WaterTest[]): Promise<void> {
    const data = this.getData();
    data.tests = tests;
    await this.persist(data);
  }
}

export class SettingsRepository {
  private getData: () => AppData;
  private persist: (data: AppData) => Promise<void>;

  constructor(getData: () => AppData, persist: (data: AppData) => Promise<void>) {
    this.getData = getData;
    this.persist = persist;
  }

  get(): AppSettings {
    return this.getData().settings;
  }

  async update(updates: Partial<AppSettings>): Promise<void> {
    const data = this.getData();
    data.settings = { ...data.settings, ...updates };
    await this.persist(data);
  }
}

export class EquipmentRepository {
  private getData: () => AppData;
  private persist: (data: AppData) => Promise<void>;

  constructor(getData: () => AppData, persist: (data: AppData) => Promise<void>) {
    this.getData = getData;
    this.persist = persist;
  }

  getAll(includeInactive = true): PoolEquipment[] {
    const items = this.getData().equipment ?? [];
    const filtered = includeInactive ? items : items.filter((e) => e.active);
    return sortEquipment(filtered);
  }

  getById(id: string): PoolEquipment | undefined {
    return (this.getData().equipment ?? []).find((e) => e.id === id);
  }

  async add(equipment: PoolEquipment): Promise<void> {
    const data = this.getData();
    data.equipment = [equipment, ...(data.equipment ?? [])];
    await this.persist(data);
  }

  async update(id: string, equipment: PoolEquipment): Promise<void> {
    const data = this.getData();
    const list = data.equipment ?? [];
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) return;
    list[idx] = equipment;
    data.equipment = list;
    await this.persist(data);
  }

  async delete(id: string): Promise<void> {
    const data = this.getData();
    data.equipment = (data.equipment ?? []).filter((e) => e.id !== id);
    await this.persist(data);
  }

  async replaceAll(equipment: PoolEquipment[]): Promise<void> {
    const data = this.getData();
    data.equipment = equipment;
    await this.persist(data);
  }
}

export class MaintenanceRepository {
  private getData: () => AppData;
  private persist: (data: AppData) => Promise<void>;

  constructor(getData: () => AppData, persist: (data: AppData) => Promise<void>) {
    this.getData = getData;
    this.persist = persist;
  }

  getAll(includeInactive = true): MaintenanceTask[] {
    const items = this.getData().maintenanceTasks ?? [];
    const filtered = includeInactive ? items : items.filter((t) => t.active);
    return sortMaintenanceTasks(filtered);
  }

  getById(id: string): MaintenanceTask | undefined {
    return (this.getData().maintenanceTasks ?? []).find((t) => t.id === id);
  }

  async add(task: MaintenanceTask): Promise<void> {
    const data = this.getData();
    data.maintenanceTasks = [task, ...(data.maintenanceTasks ?? [])];
    await this.persist(data);
  }

  async update(id: string, task: MaintenanceTask): Promise<void> {
    const data = this.getData();
    const list = data.maintenanceTasks ?? [];
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return;
    list[idx] = task;
    data.maintenanceTasks = list;
    await this.persist(data);
  }

  async delete(id: string): Promise<void> {
    const data = this.getData();
    data.maintenanceTasks = (data.maintenanceTasks ?? []).filter((t) => t.id !== id);
    await this.persist(data);
  }

  async replaceAll(tasks: MaintenanceTask[]): Promise<void> {
    const data = this.getData();
    data.maintenanceTasks = tasks;
    await this.persist(data);
  }
}

export class InventoryRepository {
  private getData: () => AppData;
  private persist: (data: AppData) => Promise<void>;

  constructor(getData: () => AppData, persist: (data: AppData) => Promise<void>) {
    this.getData = getData;
    this.persist = persist;
  }

  getAll(includeInactive = true): ChemicalInventoryItem[] {
    const items = this.getData().chemicalInventory ?? [];
    const filtered = includeInactive ? items : items.filter((i) => i.active);
    return sortInventoryItems(filtered);
  }

  getById(id: string): ChemicalInventoryItem | undefined {
    return (this.getData().chemicalInventory ?? []).find((i) => i.id === id);
  }

  async add(item: ChemicalInventoryItem): Promise<void> {
    const data = this.getData();
    data.chemicalInventory = [item, ...(data.chemicalInventory ?? [])];
    await this.persist(data);
  }

  async update(id: string, item: ChemicalInventoryItem): Promise<void> {
    const data = this.getData();
    const list = data.chemicalInventory ?? [];
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) return;
    list[idx] = item;
    data.chemicalInventory = list;
    await this.persist(data);
  }

  async delete(id: string): Promise<void> {
    const data = this.getData();
    data.chemicalInventory = (data.chemicalInventory ?? []).filter((i) => i.id !== id);
    await this.persist(data);
  }

  async replaceAll(items: ChemicalInventoryItem[]): Promise<void> {
    const data = this.getData();
    data.chemicalInventory = items;
    await this.persist(data);
  }
}
