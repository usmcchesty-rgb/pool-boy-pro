export type CalcGuidanceType =
  | 'liquidChlorine'
  | 'householdBleach'
  | 'bakingSoda'
  | 'sodaAsh'
  | 'muriaticAcidPh'
  | 'muriaticAcidTa'
  | 'dryAcid'
  | 'calciumChloride'
  | 'cyanuricAcid'
  | 'salt';

interface CalcGuidance {
  expectedResult: string;
  pumpRuntime: string;
  waitTime: string;
  retestNote: string;
  safetyNote?: string;
}

/** Standard technician guidance for calculator results — no formula changes */
export function getCalculatorGuidance(calcType: CalcGuidanceType): CalcGuidance {
  switch (calcType) {
    case 'liquidChlorine':
    case 'householdBleach':
      return {
        expectedResult: 'Raise free chlorine toward your target ppm for effective sanitization.',
        pumpRuntime: 'Run pump 2–4 hours to circulate evenly.',
        waitTime: 'Wait 30 minutes before swimming after liquid chlorine addition.',
        retestNote: 'Retest free chlorine after 4 hours.',
        safetyNote: 'Never add chlorine and acid in the same session — wait at least 4 hours between treatments.',
      };
    case 'bakingSoda':
      return {
        expectedResult: 'Raise total alkalinity to stabilize pH and buffer against changes.',
        pumpRuntime: 'Run pump 2–4 hours to dissolve and circulate.',
        waitTime: 'Wait 4–6 hours before adding other chemicals.',
        retestNote: 'Retest alkalinity and pH after 6 hours — baking soda also raises pH slightly.',
      };
    case 'sodaAsh':
      return {
        expectedResult: 'Raise pH toward the 7.2–7.6 ideal range.',
        pumpRuntime: 'Run pump 2–4 hours to circulate.',
        waitTime: 'Wait 4 hours before adding other chemicals.',
        retestNote: 'Retest pH after 4–6 hours.',
        safetyNote: 'Do not add soda ash and acid on the same day.',
      };
    case 'muriaticAcidPh':
    case 'dryAcid':
      return {
        expectedResult: 'Lower pH toward the 7.2–7.6 ideal range.',
        pumpRuntime: 'Run pump 2–4 hours. Add acid to deep end with pump running.',
        waitTime: 'Wait 4 hours before adding other chemicals.',
        retestNote: 'Retest pH after 4–6 hours.',
        safetyNote: 'Never pour acid over tiles. Never add acid and chlorine together.',
      };
    case 'muriaticAcidTa':
      return {
        expectedResult: 'Lower total alkalinity toward the 80–120 ppm ideal range.',
        pumpRuntime: 'Run pump 2–4 hours. Point returns upward to aerate.',
        waitTime: 'Wait 4–6 hours. Aerate to minimize pH drop.',
        retestNote: 'Retest alkalinity and pH after 24 hours.',
      };
    case 'calciumChloride':
      return {
        expectedResult: 'Raise calcium hardness to protect plaster and equipment.',
        pumpRuntime: 'Run pump 4 hours to circulate.',
        waitTime: 'Wait 2–4 hours before swimming. Pre-dissolve in a bucket of pool water.',
        retestNote: 'Retest calcium hardness after 24 hours.',
        safetyNote: 'Balance pH before raising calcium for best results.',
      };
    case 'cyanuricAcid':
      return {
        expectedResult: 'Raise cyanuric acid to protect chlorine from sunlight.',
        pumpRuntime: 'Run pump continuously until fully dissolved (24–48 hours).',
        waitTime: 'Wait 24–48 hours. Add to skimmer sock or dissolve in bucket.',
        retestNote: 'Retest CYA after 48 hours.',
      };
    case 'salt':
      return {
        expectedResult: 'Raise salt level for salt chlorine generator operation.',
        pumpRuntime: 'Run pump until salt is fully dissolved (typically 24 hours).',
        waitTime: 'Wait 24 hours before relying on salt cell output.',
        retestNote: 'Retest salt after 24 hours. Brush pool floor to help dissolve.',
      };
  }
}
