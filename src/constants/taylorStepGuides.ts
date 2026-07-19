import type { TaylorTestStep } from '../models/taylorKit';

export interface TaylorReagentGuide {
  name: string;
  role: string;
}

export interface TaylorStepGuide {
  title: string;
  purpose: string;
  reagents?: TaylorReagentGuide[];
  steps: string[];
  expectedColors?: string[];
  endpoint?: string;
  commonMistakes?: string[];
  troubleshooting: string[];
}

export const TAYLOR_STEP_GUIDES: Partial<Record<TaylorTestStep, TaylorStepGuide>> = {
  pool: {
    title: 'Before You Test',
    purpose:
      'Good results start with a clean sample cell and accurate pool information. This step makes sure your recommendations match your pool.',
    steps: [
      'Rinse each comparator cell with pool water — do not use tap water.',
      'Collect water from elbow depth, away from return jets and skimmers.',
      'Note pool volume, type, and sanitizer so dosing targets are correct.',
      'Record water temperature at the time you take the sample.',
    ],
    commonMistakes: [
      'Using a dry or tap-water-rinsed cell that changes the sample.',
      'Sampling near a return jet where chlorine is concentrated.',
      'Guessing pool volume — even a rough estimate is better than leaving it blank.',
    ],
    troubleshooting: [
      'Sample looks cloudy in the cell — rinse again with pool water and re-fill.',
      'Not sure of pool volume — check build records, or use a rough estimate and update later.',
      'Temperature varies across the pool — test in the deep end away from returns.',
    ],
  },
  freeChlorine: {
    title: 'Free Chlorine (FAS-DPD Test)',
    purpose:
      'Free chlorine is the active sanitizer killing germs and algae. This test tells you how much usable chlorine is in the water right now.',
    reagents: [
      {
        name: 'R-0870 DPD powder',
        role: 'Turns free chlorine pink so you can see it. Without pink, there may be no free chlorine or the powder did not dissolve.',
      },
      {
        name: 'R-0871 FAS-DPD titrating reagent',
        role: 'Clear drops that remove the pink color one bit at a time. Each drop you add counts toward your result.',
      },
      {
        name: 'R-0009 (if needed)',
        role: 'Adjusts sample pH so the test reads accurately when water pH is outside 6.5–7.5.',
      },
    ],
    steps: [
      'Fill the comparator to the 10 mL or 25 mL line with pool water.',
      'If your kit instructions say so, add 2 drops R-0009 when sample pH is not 6.5–7.5.',
      'Add 2 level scoops R-0870 powder. Swirl until dissolved — the sample should turn pink or magenta.',
      'Add R-0871 one drop at a time while gently swirling the tube after each drop.',
      'Stop when the pink color disappears and the sample stays clear. Count every drop you added.',
    ],
    expectedColors: [
      'After R-0870: bright pink or magenta (any shade of pink counts).',
      'During R-0871: pink fades lighter with each drop.',
      'Endpoint: completely clear — no pink tint left when viewed from above.',
    ],
    endpoint:
      'The test is finished when one more drop would not change the color — the sample stays clear.',
    commonMistakes: [
      'Not swirling after each drop — the color may not fully change before you add another.',
      'Counting drops too fast without mixing.',
      'Testing in direct sunlight — UV can bleach the pink before you finish.',
      'Too little R-0870 powder — the sample may never turn pink.',
      'Old or damp powder — may not react properly.',
    ],
    troubleshooting: [
      'Water never turns pink after R-0870 — possible zero chlorine, old reagent, too little powder, or sunlight bleaching. Try fresh powder indoors, then retest.',
      'Pink disappears too quickly before you count — work in shade, use a fresh sample, and add powder again.',
      'Color is too dark to tell the endpoint — dilute is not part of this test; use good lighting and hold the tube against white paper.',
      'Accidentally added extra drops — start over with a fresh sample for accuracy.',
      'Spilled sample — rinse the cell with pool water and begin again.',
      'Wrong reagent bottle — confirm R-0871 (titrating reagent), not R-0009 or others.',
      'Color fades quickly in sunlight — finish the test in shade or indoors.',
      'Need to start over — discard the sample, rinse with pool water, and repeat from step one.',
    ],
  },
  combinedChlorine: {
    title: 'Combined Chlorine Test',
    purpose:
      'Combined chlorine (chloramines) is used-up sanitizer that can cause odor and eye irritation. This step runs on the same sample right after free chlorine.',
    reagents: [
      {
        name: 'R-0003',
        role: 'Releases combined chlorine so it shows up as pink again. If nothing turns pink, combined chlorine is zero — that is ideal.',
      },
      {
        name: 'R-0871 (same bottle as before)',
        role: 'Same clear drops as the free chlorine test. Count only the new drops added after R-0003.',
      },
    ],
    steps: [
      'Keep the same sample from the free chlorine test — do not pour it out.',
      'Add 5 drops R-0003. Swirl and mix for about 10 seconds.',
      'If combined chlorine is present, the sample turns pink again.',
      'If it stays clear, combined chlorine is 0.0 ppm — you are done with this test.',
      'If pink returns, add R-0871 one drop at a time while swirling until clear again.',
      'Count only the additional drops added after R-0003 — not the drops from the free chlorine test.',
    ],
    expectedColors: [
      'After R-0003: either stays clear (0 ppm combined chlorine) or turns pink again.',
      'If titrating: pink fades to clear — same endpoint as the free chlorine test.',
    ],
    endpoint:
      'Either the sample stays clear after R-0003 (0 ppm), or you titrate until the pink is gone and count additional drops.',
    commonMistakes: [
      'Discarding the free chlorine sample and starting fresh — combined chlorine must use the same sample.',
      'Including free chlorine drops in the combined count — only count drops after R-0003.',
      'Not waiting 10 seconds after R-0003 before deciding if pink returned.',
    ],
    troubleshooting: [
      'Sample stayed clear after R-0003 — combined chlorine is 0.0 ppm. That is ideal. No more titration needed.',
      'Pink returned but fades too fast — work in shade and swirl consistently after each R-0871 drop.',
      'Not sure if color is pink or clear — hold the tube against white paper in good light.',
      'Added R-0003 to a fresh sample by mistake — you must use the free chlorine sample. Redo both tests if needed.',
      'Need to start over — redo the free chlorine test first, then return to combined chlorine.',
    ],
  },
  ph: {
    title: 'pH Test',
    purpose:
      'pH measures how acidic or basic your water is. Correct pH keeps swimmers comfortable and helps sanitizer work efficiently.',
    reagents: [
      {
        name: 'R-0004 pH indicator',
        role: 'Turns the sample a color that matches the pH color chart on your comparator.',
      },
      {
        name: 'R-0015 Acid Demand (optional)',
        role: 'Used when pH is too high — counts drops needed to estimate how much acid to add.',
      },
      {
        name: 'R-0016 Base Demand (optional)',
        role: 'Used when pH is too low — counts drops needed to estimate how much soda ash to add.',
      },
    ],
    steps: [
      'Fill the comparator to the 44 mL line with pool water.',
      'Add 5 drops R-0004. Swirl to mix.',
      'Match the sample color to the pH scale on your comparator.',
      'Record the pH number that best matches — do not guess between colors.',
    ],
    expectedColors: [
      'Yellow-orange tones = lower pH (more acidic).',
      'Red to deep red = higher pH (more basic).',
      'Compare in good daylight or white LED light — not colored pool lights.',
    ],
    endpoint: 'Read the pH value from the color chart — there is no titration endpoint for the basic pH test.',
    commonMistakes: [
      'Reading pH in colored pool light at night.',
      'Using too much or too little R-0004 — always use exactly 5 drops.',
      'Running acid and base demand when pH is already in range — not needed.',
    ],
    troubleshooting: [
      'Color does not match any chart block — use the closest match and note uncertainty in test notes.',
      'Sample too dark or murky — use a fresh pool water sample.',
      'Not sure whether to run demand test — the app will tell you based on your pH reading.',
      'Wrong reagent added — only R-0004 is used for the basic pH reading.',
    ],
  },
  totalAlkalinity: {
    title: 'Total Alkalinity Test',
    purpose:
      'Total alkalinity buffers pH so it does not swing wildly after rain, bather load, or chemical additions. Think of it as pH stability.',
    reagents: [
      {
        name: 'R-0007',
        role: 'First reagent that starts the alkalinity reaction.',
      },
      {
        name: 'R-0008',
        role: 'Turns the sample green when alkalinity is ready to measure.',
      },
      {
        name: 'R-0009',
        role: 'Red drops you count one at a time until the sample turns red — each drop equals 10 ppm.',
      },
    ],
    steps: [
      'Fill the comparator to the 25 mL line with pool water.',
      'Add 2 drops R-0007 and 5 drops R-0008. Swirl — the sample should turn green.',
      'Add R-0009 one drop at a time while swirling after each drop.',
      'Stop when the color changes from green to red. Count every drop.',
    ],
    expectedColors: [
      'After R-0008: green.',
      'Endpoint: red — the green should be completely gone.',
    ],
    endpoint: 'The sample turns from green to red. That color change is the endpoint.',
    commonMistakes: [
      'Missing the exact red endpoint and stopping too early or too late.',
      'Not swirling between drops.',
      'Using the wrong cell volume — alkalinity uses the 25 mL line.',
    ],
    troubleshooting: [
      'Sample never turns green — check reagent order and amounts, then start fresh.',
      'Color change is slow — keep swirling and add one drop at a time.',
      'Hard to tell green vs red in dim light — use bright white light.',
      'Lost count — start over with a fresh sample.',
      'Need to start over — rinse with pool water and repeat.',
    ],
  },
  calciumHardness: {
    title: 'Calcium Hardness Test',
    purpose:
      'Calcium hardness protects plaster and equipment. Too low can etch surfaces; too high can cause scale and cloudy water.',
    reagents: [
      {
        name: 'R-0010L',
        role: 'Buffer that prepares the sample for hardness testing.',
      },
      {
        name: 'R-0011L',
        role: 'Turns the sample red when calcium is present and ready to titrate.',
      },
      {
        name: 'R-0012',
        role: 'Blue drops counted one at a time until the sample turns blue — each drop equals 25 ppm.',
      },
    ],
    steps: [
      'Fill the comparator to the 25 mL line with pool water.',
      'Add 20 drops R-0010L and 5 drops R-0011L. Swirl — sample should turn red.',
      'Add R-0012 one drop at a time while swirling after each drop.',
      'Stop when the color changes from red to blue. Count every drop.',
    ],
    expectedColors: [
      'After R-0011L: red.',
      'Endpoint: blue — red should be completely replaced.',
    ],
    endpoint: 'The sample turns from red to blue. That is the endpoint.',
    commonMistakes: [
      'Skipping R-0010L or using wrong drop counts.',
      'Confusing purple-ish transition shades — wait for a clear blue.',
      'Counting drops without swirling.',
    ],
    troubleshooting: [
      'Sample never turns red — verify reagents and start with a fresh sample.',
      'Blue endpoint is hard to see — view against white paper in good light.',
      'Added too many drops past blue — result will be high; retest if unsure.',
      'Need to start over — rinse and repeat with new pool water.',
    ],
  },
  cyanuricAcid: {
    title: 'Cyanuric Acid (Stabilizer) Test',
    purpose:
      'CYA (stabilizer) protects chlorine from sunlight. Outdoor pools need some; too much slows sanitizing.',
    reagents: [
      {
        name: 'R-0013',
        role: 'Reagent that creates cloudiness — you read CYA from how cloudy the sample becomes.',
      },
    ],
    steps: [
      'Fill the mixing bottle to the 25 mL mark with pool water.',
      'Add one bottle of R-0013 (or the kit-specified amount). Mix until dissolved.',
      'View the sample through the turbidity scale on the test vial.',
      'Pour or dilute per kit instructions until you can just see the black dot at the bottom.',
      'Read the CYA level in ppm from the scale.',
    ],
    expectedColors: [
      'Sample becomes progressively cloudier as CYA reacts.',
      'You are reading turbidity (cloudiness), not a color change.',
    ],
    endpoint:
      'The reading is taken when the black dot at the bottom of the view tube just disappears through the cloudiness.',
    commonMistakes: [
      'Reading before R-0013 is fully mixed.',
      'Viewing in poor light — hard to see when the dot disappears.',
      'Not following the pour-back steps in your kit instructions.',
    ],
    troubleshooting: [
      'Dot never disappears — CYA may be very high; follow kit high-range procedure.',
      'Dot disappears immediately — CYA may be very low (near zero).',
      'Cloudy sample with no clear endpoint — remix and retry in good light.',
      'Need to start over — use fresh pool water and a new R-0013 dose.',
    ],
  },
  salt: {
    title: 'Salt Test (K-2006-SALT)',
    purpose:
      'Salt level tells your salt chlorine generator how much dissolved salt is available to make chlorine. Only critical for salt (SWG) pools.',
    reagents: [
      {
        name: 'Salt titration reagents (from your K-2006-SALT kit)',
        role: 'Convert a pool water sample to a salt reading in ppm following your kit booklet.',
      },
    ],
    steps: [
      'Follow the salt test procedure in your Taylor K-2006-SALT instruction booklet.',
      'Use the sample size and reagents specified for your kit version.',
      'Titrate or read to the endpoint shown in your instructions.',
      'Record the salt level in ppm.',
    ],
    expectedColors: [
      'Follow the color change described in your kit manual — varies by kit version.',
    ],
    endpoint: 'Use the endpoint described in your K-2006-SALT instructions.',
    commonMistakes: [
      'Using six-way strip salt reading instead of the titration kit.',
      'Not calibrating to kit-specific sample volume.',
    ],
    troubleshooting: [
      'Result seems impossibly low or high — double-check kit steps and sample size.',
      'Color endpoint unclear — use white background and good lighting.',
      'Salt pool but generator not running — salt level still matters for when it runs again.',
      'Need to start over — rinse equipment with pool water and retest.',
    ],
  },
};
