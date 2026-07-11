import { formatProfileSummary } from '../chemistry/profileRangeDisplay';
import { getProfileKey, resolveProfileFromPool } from '../chemistry/poolProfiles';
import type {
  OverallRating,
  TestFilter,
  TestSource,
  WaterTest,
} from '../models/types';
import { formatRating } from './format';
import { getTestSourceDisplayLabel } from './testSourceDisplay';

export const TEST_SOURCE_LABELS: Record<TestSource, string> = {
  taylor_k2006_salt: 'Taylor Test',
  test_strip: 'Strip Test',
};

export const RATING_FILTER_OPTIONS: Array<{ value: OverallRating | 'all'; label: string }> = [
  { value: 'all', label: 'All ratings' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'critical', label: 'Critical' },
];

export const SOURCE_FILTER_OPTIONS: Array<{ value: TestSource | 'all'; label: string }> = [
  { value: 'all', label: 'All sources' },
  { value: 'taylor_k2006_salt', label: 'Taylor Test' },
  { value: 'test_strip', label: 'Strip Test' },
];

/** Resolve test source; legacy tests without the field are Taylor */
export function getTestSource(test: WaterTest): TestSource {
  return test.testSource ?? 'taylor_k2006_salt';
}

export function getTestSourceLabel(test: WaterTest): string {
  return TEST_SOURCE_LABELS[getTestSource(test)];
}

export function getTestProfileSummary(test: WaterTest): string {
  return formatProfileSummary(resolveProfileFromPool(test.pool));
}

export function getTestProfileKey(test: WaterTest): string {
  return getProfileKey(resolveProfileFromPool(test.pool));
}

/** Unique pool profiles present in a test list */
export function getProfileFilterOptions(
  tests: WaterTest[]
): Array<{ value: string; label: string }> {
  const seen = new Map<string, string>();
  for (const test of tests) {
    const key = getTestProfileKey(test);
    if (!seen.has(key)) {
      seen.set(key, getTestProfileSummary(test));
    }
  }
  return [
    { value: 'all', label: 'All profiles' },
    ...[...seen.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label })),
  ];
}

export function filterHistoryTests(tests: WaterTest[], filters: TestFilter): WaterTest[] {
  let result = [...tests];

  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter((test) => {
      const rating = test.analysis?.overallRating;
      return (
        test.notes?.toLowerCase().includes(q) ||
        test.date.includes(q) ||
        test.pool.poolType.includes(q) ||
        getTestSourceLabel(test).toLowerCase().includes(q) ||
        getTestSourceDisplayLabel(test).toLowerCase().includes(q) ||
        getTestProfileSummary(test).toLowerCase().includes(q) ||
        (rating && formatRating(rating).toLowerCase().includes(q))
      );
    });
  }

  if (filters.dateFrom) {
    result = result.filter((test) => test.date >= filters.dateFrom!);
  }

  if (filters.dateTo) {
    result = result.filter((test) => test.date <= filters.dateTo! + 'T23:59:59');
  }

  if (filters.rating && filters.rating !== 'all') {
    result = result.filter((test) => test.analysis?.overallRating === filters.rating);
  }

  if (filters.testSource && filters.testSource !== 'all') {
    result = result.filter((test) => getTestSource(test) === filters.testSource);
  }

  if (filters.profileKey && filters.profileKey !== 'all') {
    result = result.filter((test) => getTestProfileKey(test) === filters.profileKey);
  }

  return result;
}

export function sortHistoryTests(
  tests: WaterTest[],
  sortField: 'date' | 'freeChlorine' | 'ph' | 'overallScore',
  sortDir: 'asc' | 'desc'
): WaterTest[] {
  const list = [...tests];
  list.sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'date':
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'freeChlorine':
        cmp = a.readings.freeChlorine - b.readings.freeChlorine;
        break;
      case 'ph':
        cmp = a.readings.ph - b.readings.ph;
        break;
      case 'overallScore':
        cmp = (a.analysis?.overallScore ?? 0) - (b.analysis?.overallScore ?? 0);
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });
  return list;
}
