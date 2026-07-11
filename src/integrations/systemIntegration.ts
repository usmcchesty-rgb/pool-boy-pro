import type { TreatmentCategory } from '../models/types';
import type {
  ChemicalInventoryItem,
  ChemicalType,
  DosingRecommendation,
  EquipmentType,
  MaintenanceInput,
  ParameterAnalysis,
  PoolEquipment,
  TreatmentPlanStep,
} from '../models/types';
import { inferTreatmentCategory } from '../chemistry/treatmentPlan';
import { isWarrantyExpired } from '../models/equipment';
import {
  getExpirationStatus,
  isLowQuantity,
  partitionInventoryItems,
} from '../models/inventory';
import {
  getMaintenanceDueStatus,
  partitionMaintenanceTasks,
  todayDateOnly,
} from '../models/maintenance';
import { defaultDueDate } from '../services/maintenanceService';

export interface RecommendationInventoryStatus {
  available: boolean;
  matches: ChemicalInventoryItem[];
  chemicalTypes: ChemicalType[];
}

export interface RecommendationEquipmentRef {
  role: EquipmentType | 'pump';
  label: string;
  equipment: PoolEquipment;
}

export interface MaintenanceSuggestion {
  input: MaintenanceInput;
  sourceLabel: string;
}

export interface EnrichedRecommendation {
  recommendation: DosingRecommendation;
  inventory: RecommendationInventoryStatus;
  equipmentRefs: RecommendationEquipmentRef[];
  maintenanceSuggestion: MaintenanceSuggestion | null;
}

const CHEMICAL_TEXT_TO_TYPES: { pattern: RegExp; types: ChemicalType[] }[] = [
  { pattern: /liquid chlorine/i, types: ['liquid_chlorine'] },
  { pattern: /household bleach|\bbleach\b/i, types: ['bleach'] },
  { pattern: /muriatic acid/i, types: ['muriatic_acid'] },
  { pattern: /dry acid/i, types: ['dry_acid'] },
  { pattern: /baking soda/i, types: ['baking_soda'] },
  { pattern: /soda ash/i, types: ['soda_ash'] },
  { pattern: /calcium chloride/i, types: ['calcium_chloride'] },
  { pattern: /cyanuric|stabilizer|cya/i, types: ['cyanuric_acid'] },
  { pattern: /pool salt|\bsalt\b/i, types: ['salt'] },
];

const CATEGORY_TO_TYPES: Partial<Record<TreatmentCategory, ChemicalType[]>> = {
  shock: ['liquid_chlorine', 'bleach'],
  chlorine_raise: ['liquid_chlorine', 'bleach'],
  acid_ph: ['muriatic_acid', 'dry_acid'],
  acid_ta: ['muriatic_acid'],
  base_ph: ['soda_ash'],
  alkalinity_up: ['baking_soda'],
  calcium: ['calcium_chloride'],
  cya: ['cyanuric_acid'],
  salt: ['salt'],
};

const EQUIPMENT_KEYWORDS: {
  pattern: RegExp;
  type: EquipmentType;
  role: EquipmentType;
}[] = [
  { pattern: /\bpump\b/i, type: 'pump', role: 'pump' },
  { pattern: /filter|backwash/i, type: 'filter', role: 'filter' },
  { pattern: /salt cell|saltwater generator|swg/i, type: 'saltwater_generator', role: 'saltwater_generator' },
  { pattern: /chlorinator/i, type: 'chlorinator', role: 'chlorinator' },
  { pattern: /heater/i, type: 'heater', role: 'heater' },
];

export function inferChemicalTypesFromRecommendation(rec: DosingRecommendation): ChemicalType[] {
  const category = rec.category ?? inferTreatmentCategory(rec.chemical, rec.reason);
  const text = `${rec.chemical} ${rec.reason}`;
  const types = new Set<ChemicalType>();

  for (const type of CATEGORY_TO_TYPES[category] ?? []) {
    types.add(type);
  }

  for (const entry of CHEMICAL_TEXT_TO_TYPES) {
    if (entry.pattern.test(text)) {
      for (const type of entry.types) types.add(type);
    }
  }

  if (types.size === 0 && category !== 'physical' && category !== 'chlorine_wait') {
    types.add('other');
  }

  return [...types];
}

export function findMatchingInventory(
  chemicalTypes: ChemicalType[],
  inventory: ChemicalInventoryItem[]
): ChemicalInventoryItem[] {
  if (chemicalTypes.length === 0) return [];
  return inventory.filter(
    (item) => item.active && chemicalTypes.includes(item.chemicalType)
  );
}

export function getRecommendationInventoryStatus(
  rec: DosingRecommendation,
  inventory: ChemicalInventoryItem[]
): RecommendationInventoryStatus {
  const chemicalTypes = inferChemicalTypesFromRecommendation(rec);
  const matches = findMatchingInventory(chemicalTypes, inventory);
  const isTrackable =
    rec.category !== 'physical' &&
    rec.category !== 'chlorine_wait' &&
    !/no chemical/i.test(rec.chemical);

  return {
    chemicalTypes,
    matches,
    available: isTrackable ? matches.length > 0 : false,
  };
}

export function findEquipmentByType(
  equipment: PoolEquipment[],
  type: EquipmentType
): PoolEquipment | undefined {
  return equipment.find((item) => item.active && item.type === type);
}

export function findEquipmentReferencesInText(
  text: string,
  equipment: PoolEquipment[]
): RecommendationEquipmentRef[] {
  const refs: RecommendationEquipmentRef[] = [];
  const seen = new Set<string>();

  for (const keyword of EQUIPMENT_KEYWORDS) {
    if (!keyword.pattern.test(text)) continue;
    const match = findEquipmentByType(equipment, keyword.type);
    if (!match || seen.has(match.id)) continue;
    seen.add(match.id);
    refs.push({
      role: keyword.role,
      label: match.name,
      equipment: match,
    });
  }

  return refs;
}

export function getRecommendationEquipmentRefs(
  rec: DosingRecommendation,
  equipment: PoolEquipment[]
): RecommendationEquipmentRef[] {
  const text = `${rec.chemical} ${rec.reason} ${rec.pumpRuntime} ${rec.expectedResult}`;
  const refs = findEquipmentReferencesInText(text, equipment);

  if (/run pump/i.test(rec.pumpRuntime ?? '') && !refs.some((r) => r.role === 'pump')) {
    const pump = findEquipmentByType(equipment, 'pump');
    if (pump) {
      refs.push({ role: 'pump', label: pump.name, equipment: pump });
    }
  }

  return refs;
}

export function formatRunPumpTitle(equipment?: PoolEquipment): string {
  return equipment ? `Run "${equipment.name}"` : 'Run Pump';
}

export function enrichRecommendation(
  rec: DosingRecommendation,
  inventory: ChemicalInventoryItem[],
  equipment: PoolEquipment[]
): EnrichedRecommendation {
  return {
    recommendation: rec,
    inventory: getRecommendationInventoryStatus(rec, inventory),
    equipmentRefs: getRecommendationEquipmentRefs(rec, equipment),
    maintenanceSuggestion: suggestMaintenanceFromRecommendation(rec, equipment),
  };
}

export function enrichRecommendations(
  recommendations: DosingRecommendation[],
  inventory: ChemicalInventoryItem[],
  equipment: PoolEquipment[]
): EnrichedRecommendation[] {
  return recommendations.map((rec) => enrichRecommendation(rec, inventory, equipment));
}

export function suggestMaintenanceFromRecommendation(
  rec: DosingRecommendation,
  equipment: PoolEquipment[]
): MaintenanceSuggestion | null {
  const text = `${rec.chemical} ${rec.reason} ${rec.pumpRuntime ?? ''}`;

  if (/backwash|clean filter/i.test(text)) {
    const filter = findEquipmentByType(equipment, 'filter');
    return {
      sourceLabel: rec.chemical,
      input: {
        title: 'Backwash Filter',
        category: 'filter_maintenance',
        frequency: 'monthly',
        dueDate: defaultDueDate(7),
        relatedEquipmentId: filter?.id ?? '',
        notes: `From recommendation: ${rec.chemical}`,
        active: true,
      },
    };
  }

  if (/clean salt cell|inspect salt cell/i.test(text)) {
    const swg =
      findEquipmentByType(equipment, 'saltwater_generator') ??
      findEquipmentByType(equipment, 'chlorinator');
    return {
      sourceLabel: rec.chemical,
      input: {
        title: 'Clean Salt Cell',
        category: 'equipment_service',
        frequency: 'monthly',
        dueDate: defaultDueDate(7),
        relatedEquipmentId: swg?.id ?? '',
        notes: `From recommendation: ${rec.chemical}`,
        active: true,
      },
    };
  }

  if (rec.pumpRuntime && /run pump/i.test(rec.pumpRuntime)) {
    const pump = findEquipmentByType(equipment, 'pump');
    return {
      sourceLabel: rec.chemical,
      input: {
        title: pump ? `Run "${pump.name}"` : 'Run pump after treatment',
        category: 'equipment_service',
        frequency: 'one_time',
        dueDate: todayDateOnly(),
        relatedEquipmentId: pump?.id ?? '',
        notes: `After ${rec.chemical}: ${rec.pumpRuntime}`,
        active: true,
      },
    };
  }

  return null;
}

export function suggestMaintenanceFromTreatmentStep(
  step: TreatmentPlanStep,
  equipment: PoolEquipment[]
): MaintenanceSuggestion | null {
  if (step.kind !== 'pump') return null;

  const pump = findEquipmentByType(equipment, 'pump');
  return {
    sourceLabel: step.title,
    input: {
      title: pump ? `Run "${pump.name}"` : 'Run pump',
      category: 'equipment_service',
      frequency: 'one_time',
      dueDate: todayDateOnly(),
      relatedEquipmentId: pump?.id ?? '',
      notes: step.description,
      active: true,
    },
  };
}

export function suggestMaintenanceFromParameter(
  param: ParameterAnalysis,
  equipment: PoolEquipment[]
): MaintenanceSuggestion | null {
  const text = `${param.label} ${param.suggestedCorrection} ${param.whyItMatters}`;

  if (/salt cell|swg|saltwater generator/i.test(text)) {
    const swg =
      findEquipmentByType(equipment, 'saltwater_generator') ??
      findEquipmentByType(equipment, 'chlorinator');
    return {
      sourceLabel: param.label,
      input: {
        title: 'Clean Salt Cell',
        category: 'equipment_service',
        frequency: 'monthly',
        dueDate: defaultDueDate(7),
        relatedEquipmentId: swg?.id ?? '',
        notes: param.suggestedCorrection,
        active: true,
      },
    };
  }

  if (/filter|backwash/i.test(text)) {
    const filter = findEquipmentByType(equipment, 'filter');
    return {
      sourceLabel: param.label,
      input: {
        title: 'Backwash Filter',
        category: 'filter_maintenance',
        frequency: 'monthly',
        dueDate: defaultDueDate(7),
        relatedEquipmentId: filter?.id ?? '',
        notes: param.suggestedCorrection,
        active: true,
      },
    };
  }

  return null;
}

export function isTrackableChemicalRecommendation(rec: DosingRecommendation): boolean {
  return (
    rec.category !== 'physical' &&
    rec.category !== 'chlorine_wait' &&
    !/no chemical/i.test(rec.chemical)
  );
}

export interface InventorySummaryCounts {
  available: number;
  low: number;
  expired: number;
  nearExpired: number;
}

export function getInventorySummaryCounts(
  inventory: ChemicalInventoryItem[]
): InventorySummaryCounts {
  const active = inventory.filter((item) => item.active);
  let available = 0;
  let low = 0;
  let expired = 0;
  let nearExpired = 0;

  for (const item of active) {
    const status = getInventoryItemDisplayStatus(item);
    switch (status) {
      case 'available':
        available++;
        break;
      case 'low':
        low++;
        break;
      case 'expired':
        expired++;
        break;
      case 'near_expired':
        nearExpired++;
        break;
    }
  }

  return { available, low, expired, nearExpired };
}

export interface DashboardIntegrationSummary {
  upcomingMaintenance: ReturnType<typeof partitionMaintenanceTasks>;
  equipmentAttention: PoolEquipment[];
  inventoryCounts: InventorySummaryCounts;
  outstandingRecommendationCount: number;
}

export function getDashboardIntegrationSummary(
  equipment: PoolEquipment[],
  maintenanceTasks: import('../models/types').MaintenanceTask[],
  inventory: ChemicalInventoryItem[],
  recommendationCount: number
): DashboardIntegrationSummary {
  const activeMaintenance = maintenanceTasks.filter((task) => task.active);
  const upcomingMaintenance = partitionMaintenanceTasks(activeMaintenance);

  const equipmentAttention = equipment.filter(
    (item) => item.active && isWarrantyExpired(item)
  );

  return {
    upcomingMaintenance,
    equipmentAttention,
    inventoryCounts: getInventorySummaryCounts(inventory),
    outstandingRecommendationCount: recommendationCount,
  };
}

export function getUpcomingMaintenancePreview(
  tasks: import('../models/types').MaintenanceTask[],
  limit = 3
): import('../models/types').MaintenanceTask[] {
  const active = tasks.filter((task) => task.active);
  const { overdue, dueSoon, upcoming } = partitionMaintenanceTasks(active);
  return [...overdue, ...dueSoon, ...upcoming].slice(0, limit);
}

export function getInventoryAlertPreview(
  inventory: ChemicalInventoryItem[],
  limit = 3
): ChemicalInventoryItem[] {
  const active = inventory.filter((item) => item.active);
  const { expired, nearExpired, lowQuantity } = partitionInventoryItems(active);
  return [...expired, ...nearExpired, ...lowQuantity].slice(0, limit);
}

export function getMaintenanceAttentionLabel(
  task: import('../models/types').MaintenanceTask
): string {
  const status = getMaintenanceDueStatus(task);
  if (status === 'overdue') return 'Overdue';
  if (status === 'due_soon') return 'Due soon';
  return 'Upcoming';
}

export function getInventoryItemDisplayStatus(
  item: ChemicalInventoryItem
): 'available' | 'low' | 'expired' | 'near_expired' | 'inactive' {
  if (!item.active) return 'inactive';
  const expiration = getExpirationStatus(item);
  if (expiration === 'expired') return 'expired';
  if (expiration === 'near_expired') return 'near_expired';
  if (isLowQuantity(item)) return 'low';
  return 'available';
}
