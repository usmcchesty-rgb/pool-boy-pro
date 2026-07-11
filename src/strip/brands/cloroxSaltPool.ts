import type { StripBrandDefinition } from '../types';

/**
 * Clorox® Pool & Spa Salt Pool Test Strips (Walmart SKU).
 * Package: 25 six-way balancers + 10 salt level strips.
 * Chart values match the bottle color chart for manual comparison.
 */
export const CLOROX_SALT_POOL_STRIP: StripBrandDefinition = {
  id: 'clorox_salt_pool',
  manufacturer: 'Clorox',
  productName: 'Clorox Salt Pool Test Strips',
  shortLabel: 'Clorox Strip',
  description:
    'Six-way balancer strip (hardness, total chlorine, free chlorine, pH, alkalinity, stabilizer) plus dedicated salt level strip.',
  dipWaitSeconds: { min: 1, max: 2 },
  readWithinSeconds: 15,
  stripAspectRatio: 5.5,
  pads: [
    {
      id: 'totalHardness',
      parameter: 'totalHardness',
      label: 'Total Hardness',
      unit: 'ppm',
      scaleValues: [0, 100, 250, 500, 1000],
      stripType: 'six_way',
      order: 1,
      hint: 'First pad on the six-way strip (calcium hardness scale).',
    },
    {
      id: 'totalChlorine',
      parameter: 'totalChlorine',
      label: 'Total Chlorine',
      unit: 'ppm',
      scaleValues: [0, 1, 3, 5, 10],
      stripType: 'six_way',
      order: 2,
    },
    {
      id: 'freeChlorine',
      parameter: 'freeChlorine',
      label: 'Free Chlorine',
      unit: 'ppm',
      scaleValues: [0, 1, 3, 5, 10],
      stripType: 'six_way',
      order: 3,
    },
    {
      id: 'ph',
      parameter: 'ph',
      label: 'pH',
      unit: '',
      scaleValues: [6.8, 7.2, 7.5, 7.8, 8.4],
      stripType: 'six_way',
      order: 4,
    },
    {
      id: 'totalAlkalinity',
      parameter: 'totalAlkalinity',
      label: 'Total Alkalinity',
      unit: 'ppm',
      scaleValues: [0, 40, 80, 120, 180, 240],
      stripType: 'six_way',
      order: 5,
    },
    {
      id: 'cyanuricAcid',
      parameter: 'cyanuricAcid',
      label: 'Stabilizer (CYA)',
      unit: 'ppm',
      scaleValues: [0, 30, 50, 80, 100, 150],
      stripType: 'six_way',
      order: 6,
      hint: 'Cyanuric acid stabilizer pad on the six-way strip.',
    },
    {
      id: 'salt',
      parameter: 'salt',
      label: 'Salt',
      unit: 'ppm',
      scaleValues: [500, 1000, 2000, 3000, 4000, 5000],
      stripType: 'salt',
      order: 7,
      hint: 'Use the separate salt level strip included in the package.',
    },
  ],
};
