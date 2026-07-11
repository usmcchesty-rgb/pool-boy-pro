import { describe, expect, it } from 'vitest';
import type { DosingRecommendation, PoolEquipment } from '../models/types';
import { createEquipmentRecord, EMPTY_EQUIPMENT_INPUT } from '../models/equipment';
import { createInventoryRecord, EMPTY_INVENTORY_INPUT } from '../models/inventory';
import {
  enrichRecommendation,
  findMatchingInventory,
  formatRunPumpTitle,
  getDashboardIntegrationSummary,
  getInventoryItemDisplayStatus,
  getInventorySummaryCounts,
  getRecommendationInventoryStatus,
  inferChemicalTypesFromRecommendation,
  isTrackableChemicalRecommendation,
  suggestMaintenanceFromRecommendation,
  suggestMaintenanceFromTreatmentStep,
} from './systemIntegration';

function makeRec(overrides: Partial<DosingRecommendation>): DosingRecommendation {
  return {
    order: 1,
    chemical: 'Liquid Chlorine',
    amount: '1 gal',
    unit: '',
    reason: 'Raise free chlorine',
    expectedResult: 'FC in range',
    priority: 'high',
    pumpRuntime: 'Run pump 2–4 hours to circulate.',
    waitTime: 'Wait 30 minutes',
    retestNote: 'Retest FC',
    category: 'chlorine_raise',
    ...overrides,
  };
}

describe('recommendation inventory integration', () => {
  it('infers chemical types from recommendation category and name', () => {
    const types = inferChemicalTypesFromRecommendation(
      makeRec({ chemical: 'Muriatic Acid', category: 'acid_ph' })
    );
    expect(types).toContain('muriatic_acid');
  });

  it('finds matching active inventory products', () => {
    const inventory = [
      createInventoryRecord(
        { ...EMPTY_INVENTORY_INPUT, productName: 'Pool Chlorine', chemicalType: 'liquid_chlorine' },
        'i1'
      ),
      createInventoryRecord(
        { ...EMPTY_INVENTORY_INPUT, productName: 'Bleach', chemicalType: 'bleach', active: false },
        'i2'
      ),
    ];
    const status = getRecommendationInventoryStatus(makeRec({}), inventory);
    expect(status.available).toBe(true);
    expect(status.matches).toHaveLength(1);
    expect(status.matches[0].productName).toBe('Pool Chlorine');
  });

  it('reports unavailable when no matching inventory exists', () => {
    const status = getRecommendationInventoryStatus(makeRec({}), []);
    expect(status.available).toBe(false);
    expect(status.matches).toHaveLength(0);
  });

  it('lists multiple matching products', () => {
    const inventory = [
      createInventoryRecord(
        { ...EMPTY_INVENTORY_INPUT, productName: 'Brand A Chlorine', chemicalType: 'liquid_chlorine' },
        'i1'
      ),
      createInventoryRecord(
        { ...EMPTY_INVENTORY_INPUT, productName: 'Brand B Chlorine', chemicalType: 'liquid_chlorine' },
        'i2'
      ),
    ];
    const matches = findMatchingInventory(['liquid_chlorine'], inventory);
    expect(matches).toHaveLength(2);
  });

  it('skips inventory tracking for non-chemical recommendations', () => {
    expect(
      isTrackableChemicalRecommendation(
        makeRec({ chemical: 'No chemical addition', category: 'chlorine_wait' })
      )
    ).toBe(false);
  });
});

describe('equipment and maintenance integration', () => {
  const pump = createEquipmentRecord(
    { ...EMPTY_EQUIPMENT_INPUT, name: 'Pentair Variable Speed Pump', type: 'pump' },
    'p1'
  );
  const filter = createEquipmentRecord(
    { ...EMPTY_EQUIPMENT_INPUT, name: 'Sand Filter', type: 'filter' },
    'f1'
  );
  const equipment: PoolEquipment[] = [pump, filter];

  it('formats pump step title with equipment name', () => {
    expect(formatRunPumpTitle(pump)).toBe('Run "Pentair Variable Speed Pump"');
  });

  it('enriches recommendations with equipment references', () => {
    const enriched = enrichRecommendation(makeRec({}), [], equipment);
    expect(enriched.equipmentRefs.some((ref) => ref.equipment.id === 'p1')).toBe(true);
  });

  it('suggests maintenance from backwash recommendation text', () => {
    const suggestion = suggestMaintenanceFromRecommendation(
      makeRec({ chemical: 'Backwash Filter', reason: 'Clean filter media' }),
      equipment
    );
    expect(suggestion?.input.title).toBe('Backwash Filter');
    expect(suggestion?.input.relatedEquipmentId).toBe('f1');
  });

  it('suggests maintenance from pump treatment step', () => {
    const suggestion = suggestMaintenanceFromTreatmentStep(
      {
        order: 2,
        kind: 'pump',
        title: 'Run pump',
        description: 'Run pump 2–4 hours',
      },
      equipment
    );
    expect(suggestion?.input.title).toBe('Run "Pentair Variable Speed Pump"');
  });
});

describe('inventory and dashboard integration', () => {
  it('summarizes inventory status counts', () => {
    const inventory = [
      createInventoryRecord(
        {
          ...EMPTY_INVENTORY_INPUT,
          productName: 'Expired',
          expirationDate: '2020-01-01',
        },
        '1'
      ),
      createInventoryRecord(
        {
          ...EMPTY_INVENTORY_INPUT,
          productName: 'Low',
          quantityRemaining: 0.5,
          quantityUnit: 'gallons',
          expirationDate: '2027-01-01',
        },
        '2'
      ),
      createInventoryRecord(
        {
          ...EMPTY_INVENTORY_INPUT,
          productName: 'Good',
          quantityRemaining: 5,
          expirationDate: '2027-01-01',
        },
        '3'
      ),
    ];

    const counts = getInventorySummaryCounts(inventory);
    expect(counts.expired).toBe(1);
    expect(counts.low).toBe(1);
    expect(getInventoryItemDisplayStatus(inventory[2])).toBe('available');
  });

  it('builds dashboard integration summary', () => {
    const summary = getDashboardIntegrationSummary([], [], [], 2);
    expect(summary.outstandingRecommendationCount).toBe(2);
    expect(summary.inventoryCounts.available).toBe(0);
  });
});
