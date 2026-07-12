/** Core domain types for Pool Boy Pro */

export type PoolType = 'inground' | 'above_ground' | 'spa';
export type SanitizerType = 'chlorine' | 'salt' | 'bromine';
export type ReadingStatus = 'too_low' | 'ideal' | 'too_high';

/** Five-band parameter classification */
export type ParameterLevel = 'critical_low' | 'low' | 'ideal' | 'high' | 'critical_high';

/** Correction urgency for a parameter or recommendation */
export type PriorityLevel = 'low' | 'medium' | 'high';

/** Overall pool water rating derived from health score and critical issues */
export type OverallRating = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type TemperatureUnit = 'fahrenheit' | 'celsius';
export type VolumeUnit = 'gallons' | 'liters';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ChartTimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

/** FAS-DPD sample size preference for Taylor K-2006-SALT tests */
export type FasDpdSampleSize = 10 | 25;

/** Taylor kit entry mode — drops titration or direct ppm */
export type TaylorEntryMode = 'drops' | 'ppm';

export interface PoolInfo {
  volume: number;
  volumeUnit: VolumeUnit;
  poolType: PoolType;
  sanitizerType: SanitizerType;
  /** Chemistry profile snapshot; derived from settings when omitted (legacy tests) */
  profile?: PoolProfileConfig;
}

/** Configurable pool characteristics that drive chemistry target ranges */
export interface PoolProfileConfig {
  surface: PoolSurface;
  sanitizer: SanitizerType;
  environment: PoolEnvironment;
  spaMode: boolean;
}

export type PoolSurface = 'vinyl' | 'fiberglass' | 'plaster' | 'pebble';
export type PoolEnvironment = 'outdoor' | 'indoor';

export interface WaterReadings {
  freeChlorine: number;
  combinedChlorine: number;
  ph: number;
  acidDemand?: number;
  baseDemand?: number;
  totalAlkalinity: number;
  calciumHardness: number;
  cyanuricAcid: number;
  salt: number;
  temperature: number;
  temperatureUnit: TemperatureUnit;
}

export interface ParameterAnalysis {
  parameter: string;
  label: string;
  value: number;
  unit: string;
  level: ParameterLevel;
  status: ReadingStatus;
  priority: PriorityLevel;
  idealMin: number;
  idealMax: number;
  whyItMatters: string;
  possibleCauses: string[];
  possibleEffects: string[];
  suggestedCorrection: string;
}

export interface DosingRecommendation {
  order: number;
  chemical: string;
  amount: string;
  unit: string;
  reason: string;
  expectedResult: string;
  priority: PriorityLevel;
  pumpRuntime: string;
  waitTime: string;
  retestNote: string;
  /** Safety or sequencing notes for the technician */
  warnings?: string[];
  /** Used for treatment sequencing and conflict detection */
  category?: TreatmentCategory;
}

/** Chemical treatment category for sequencing and safety rules */
export type TreatmentCategory =
  | 'shock'
  | 'chlorine_raise'
  | 'chlorine_wait'
  | 'acid_ph'
  | 'acid_ta'
  | 'base_ph'
  | 'alkalinity_up'
  | 'calcium'
  | 'cya'
  | 'salt'
  | 'physical';

export type TreatmentPlanStepKind = 'treatment' | 'wait' | 'pump' | 'retest' | 'warning';

/** Ordered step in a full treatment plan (includes waits and warnings) */
export interface TreatmentPlanStep {
  order: number;
  kind: TreatmentPlanStepKind;
  title: string;
  description: string;
  /** Links to DosingRecommendation.order when kind is treatment */
  recommendationOrder?: number;
}

export interface WaterAnalysisResult {
  overallScore: number;
  overallRating: OverallRating;
  overallStatus: ReadingStatus | 'mixed';
  summary: string;
  parameters: ParameterAnalysis[];
  recommendations: DosingRecommendation[];
  treatmentPlan?: TreatmentPlanStep[];
  /** Calcite Saturation Index (LSI) water balance analysis */
  waterBalance?: WaterBalanceAnalysis;
}

/** CSI / LSI water balance result attached to analysis */
export interface WaterBalanceAnalysis {
  value: number;
  adjustedAlkalinity: number;
  classification: CSIClassification;
  label: string;
  summary: string;
  recommendedAction: string;
  priority: PriorityLevel;
  factors: CSIFactors;
  explanation: CSIExplanation;
}

export type CSIClassification =
  | 'aggressively_corrosive'
  | 'corrosive'
  | 'balanced'
  | 'slight_scaling'
  | 'scaling';

export interface CSIFactors {
  ph: number;
  temperatureF: number;
  temperatureFactor: number;
  calciumHardness: number;
  calciumFactor: number;
  totalAlkalinity: number;
  cyanuricAcid: number;
  adjustedAlkalinity: number;
  alkalinityFactor: number;
  constant: number;
}

export interface CSIExplanation {
  meaning: string;
  whyItMatters: string;
  scalingRisk: string;
  corrosionRisk: string;
  suggestedCorrection: string;
}

/** How a water test was entered */
export type TestSource = 'taylor_k2006_salt' | 'test_strip';

/** Strip reading confidence band */
export type StripAccuracyLevel = 'high' | 'medium' | 'low';

/** How strip values were captured */
export type StripCaptureMethod = 'manual' | 'camera' | 'camera_verified';

/** Stable key for a strip product definition (brand registry) */
export type StripBrandId = string;

export interface StripPadReading {
  padId: string;
  parameter: string;
  selectedValue: number;
  confidence: number;
  confidenceLevel: StripAccuracyLevel;
  manuallyEdited?: boolean;
}

export interface StripCaptureQuality {
  focusScore: number;
  lightingScore: number;
  alignmentScore: number;
  stabilityScore: number;
}

/** Metadata for tests recorded via test strips */
export interface StripTestMetadata {
  brandId: StripBrandId;
  manufacturer: string;
  productName: string;
  testSource: 'test_strip';
  captureMethod: StripCaptureMethod;
  overallConfidence: number;
  accuracyLevel: StripAccuracyLevel;
  padReadings: StripPadReading[];
  captureQuality?: StripCaptureQuality;
  limitationsAcknowledged: boolean;
}

export interface WaterTest {
  id: string;
  date: string;
  readings: WaterReadings;
  pool: PoolInfo;
  notes?: string;
  analysis?: WaterAnalysisResult;
  /** How the test was recorded; legacy tests default to Taylor */
  testSource?: TestSource;
  /** Present when testSource is test_strip */
  stripMetadata?: StripTestMetadata;
}

export interface ChemicalStrengths {
  liquidChlorine: number;
  householdBleach: number;
  calciumChloride: number;
  bakingSoda: number;
  sodaAsh: number;
  muriaticAcid: number;
  dryAcid: number;
  cyanuricAcid: number;
  salt: number;
}

export interface AppSettings {
  preferredVolumeUnit: VolumeUnit;
  preferredTemperatureUnit: TemperatureUnit;
  defaultPoolVolume: number;
  defaultPoolType: PoolType;
  defaultSanitizerType: SanitizerType;
  chemicalStrengths: ChemicalStrengths;
  theme: ThemeMode;
  poolName: string;
  preferredFasDpdSampleSize: FasDpdSampleSize;
  preferredTaEntryMode: TaylorEntryMode;
  preferredChEntryMode: TaylorEntryMode;
  /** Chemistry profile — drives analysis thresholds and dosing targets */
  poolProfile: PoolProfileConfig;
  /** Automatically enable flashlight while Quick Test scanning */
  scannerAutoFlashlight: boolean;
  /** Use relaxed scanner quality checks (recommended) */
  scannerRelaxQuality: boolean;
}

export interface AppData {
  version: number;
  settings: AppSettings;
  tests: WaterTest[];
  equipment: PoolEquipment[];
  maintenanceTasks: MaintenanceTask[];
  chemicalInventory: ChemicalInventoryItem[];
}

/** Pool equipment tracked for maintenance reference */
export type EquipmentType =
  | 'pump'
  | 'filter'
  | 'heater'
  | 'saltwater_generator'
  | 'chlorinator'
  | 'cleaner'
  | 'lights'
  | 'automation'
  | 'other';

export interface PoolEquipment {
  id: string;
  type: EquipmentType;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  installDate: string;
  warrantyExpiration: string;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating or updating equipment (id/timestamps assigned by service) */
export interface EquipmentInput {
  type: EquipmentType;
  name: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: string;
  warrantyExpiration?: string;
  notes?: string;
  active?: boolean;
}

/** Routine pool maintenance task category */
export type MaintenanceCategory =
  | 'cleaning'
  | 'water_testing'
  | 'chemical_treatment'
  | 'filter_maintenance'
  | 'equipment_service'
  | 'seasonal_opening'
  | 'seasonal_closing'
  | 'other';

/** How often a maintenance task repeats */
export type MaintenanceFrequency =
  | 'one_time'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'custom';

export interface MaintenanceTask {
  id: string;
  title: string;
  category: MaintenanceCategory;
  frequency: MaintenanceFrequency;
  dueDate: string;
  lastCompletedDate: string;
  relatedEquipmentId: string;
  notes: string;
  active: boolean;
  /** Days between completions when frequency is custom */
  customIntervalDays?: number;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating or updating maintenance tasks */
export interface MaintenanceInput {
  title: string;
  category: MaintenanceCategory;
  frequency: MaintenanceFrequency;
  dueDate?: string;
  lastCompletedDate?: string;
  relatedEquipmentId?: string;
  notes?: string;
  active?: boolean;
  customIntervalDays?: number;
}

/** Pool chemical tracked in on-hand inventory */
export type ChemicalType =
  | 'liquid_chlorine'
  | 'bleach'
  | 'muriatic_acid'
  | 'dry_acid'
  | 'baking_soda'
  | 'soda_ash'
  | 'calcium_chloride'
  | 'cyanuric_acid'
  | 'salt'
  | 'other';

export type InventoryQuantityUnit =
  | 'gallons'
  | 'liters'
  | 'pounds'
  | 'ounces'
  | 'kilograms'
  | 'bags'
  | 'bottles'
  | 'other';

export interface ChemicalInventoryItem {
  id: string;
  productName: string;
  chemicalType: ChemicalType;
  concentration: string;
  quantityRemaining: number | null;
  quantityUnit: InventoryQuantityUnit;
  purchaseDate: string;
  expirationDate: string;
  cost: number | null;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating or updating chemical inventory items */
export interface ChemicalInventoryInput {
  productName: string;
  chemicalType: ChemicalType;
  concentration?: string;
  quantityRemaining?: number | null;
  quantityUnit?: InventoryQuantityUnit;
  purchaseDate?: string;
  expirationDate?: string;
  cost?: number | null;
  notes?: string;
  active?: boolean;
}

export type SortField = 'date' | 'freeChlorine' | 'ph' | 'overallScore';
export type SortDirection = 'asc' | 'desc';

export interface TestFilter {
  search: string;
  dateFrom?: string;
  dateTo?: string;
  status?: ReadingStatus | 'all';
  rating?: OverallRating | 'all';
  testSource?: TestSource | 'all';
  profileKey?: string | 'all';
}
