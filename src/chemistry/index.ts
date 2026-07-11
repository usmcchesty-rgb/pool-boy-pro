export {
  analyzeWater,
  calculateOverallScore,
  getOverallRating,
  getOverallStatus,
  buildSummary,
  ratingLabel,
} from './analysis';
export {
  classifyParameterLevel,
  levelToReadingStatus,
  getPriorityForLevel,
  isLevelLow,
  isLevelHigh,
  levelScoreMultiplier,
  levelLabel,
  priorityLabel,
} from './classification';
export { getParameterThresholds, PARAMETER_WEIGHTS, RECOMMENDATION_PRIORITY, getDosingTargets } from './ranges';
export {
  DEFAULT_POOL_PROFILE,
  buildChemistryProfile,
  getActiveTargetRanges,
  resolveProfileFromPool,
  resolvePoolProfile,
} from './poolProfiles';
export type { ChemistryProfile, DosingTargets, PoolProfileConfig } from './poolProfiles';
export {
  calcLiquidChlorine,
  calcHouseholdBleach,
  calcBakingSoda,
  calcSodaAsh,
  calcMuriaticAcidPh,
  calcMuriaticAcidTa,
  calcDryAcid,
  calcCalciumChloride,
  calcCyanuricAcid,
  calcSalt,
  getVolumeGallons,
} from './calculator';
export type { ChemicalDose, CalculatorInput } from './calculator';
export {
  generateRecommendations,
  analyzeTest,
  sortRecommendationsByPriority,
} from './recommendations';
export {
  applySafetyAndSequencing,
  buildTreatmentPlan,
  buildTreatmentPlanFromRecommendations,
  enrichLegacyRecommendation,
  inferTreatmentCategory,
  sortRecommendationsBySequence,
} from './treatmentPlan';
export { getCalculatorGuidance } from './calcGuidance';
export {
  LSI_CONSTANT,
  CYA_ALKALINITY_FACTOR,
  CALCIUM_FACTOR_OFFSET,
  CSI_SCORE_WEIGHT,
  calculateAdjustedAlkalinity,
  calculateCSI,
  calculateCSIFromReadings,
  calculateTemperatureFactor,
  classifyCSI,
  explainCSI,
  analyzeWaterBalance,
  applyWaterBalanceToScore,
  formatCSIValue,
} from './csi';
export type { CSICalculation, CSIClassificationResult, CSIInput } from './csi';
export {
  STRENGTH_FIELD_META,
  getStrengthKeyForCalcType,
  validateChemicalStrength,
  getCalcStrengthInfo,
  resolveStrengths,
} from './strengthConfig';
export type { StrengthFieldMeta, StrengthValidation } from './strengthConfig';
export {
  getFasDpdMultiplier,
  calculateFreeChlorine,
  calculateCombinedChlorine,
  calculateTotalAlkalinityFromDrops,
  calculateCalciumHardnessFromDrops,
  resolveTotalAlkalinity,
  resolveCalciumHardness,
  buildReadingsFromTaylorInputs,
  formatFasDpdFormula,
  applySaltReading,
} from './taylorKit';
