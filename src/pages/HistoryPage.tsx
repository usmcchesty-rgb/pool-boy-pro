import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { NavButton } from '../components/ui/NavButton';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TestComparePanel } from '../components/history/TestComparePanel';
import { formatDateTime, formatRating } from '../utilities/format';
import {
  RATING_FILTER_OPTIONS,
  SOURCE_FILTER_OPTIONS,
  filterHistoryTests,
  getProfileFilterOptions,
  getTestProfileSummary,
  sortHistoryTests,
} from '../utilities/historyFilters';
import { getTestSourceDisplayLabel } from '../utilities/testSourceDisplay';
import { PageHeader } from '../components/layout/PageHeader';
import type { OverallRating, SortDirection, SortField, TestSource } from '../models/types';

export function HistoryPage() {
  const { tests, deleteTest } = useApp();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rating, setRating] = useState<OverallRating | 'all'>('all');
  const [testSource, setTestSource] = useState<TestSource | 'all'>('all');
  const [profileKey, setProfileKey] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);

  const profileOptions = useMemo(() => getProfileFilterOptions(tests), [tests]);

  const filtered = useMemo(
    () =>
      filterHistoryTests(tests, {
        search,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        rating,
        testSource,
        profileKey,
      }),
    [tests, search, dateFrom, dateTo, rating, testSource, profileKey]
  );

  const sorted = useMemo(
    () => sortHistoryTests(filtered, sortField, sortDir),
    [filtered, sortField, sortDir]
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  }

  const compareTests = sorted.filter((t) => selected.has(t.id));
  const activeFilterCount = [
    dateFrom,
    dateTo,
    rating !== 'all',
    testSource !== 'all',
    profileKey !== 'all',
    search.trim(),
  ].filter(Boolean).length;

  return (
    <div className="page history">
      <PageHeader
        title="Test History"
        subtitle={`${sorted.length} of ${tests.length} test${tests.length !== 1 ? 's' : ''} shown`}
        actions={
          <NavButton to="/test">+ New Test</NavButton>
        }
      />

      <Card className="history-filters">
        <div className="filter-row">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Notes, rating, profile…"
          />
          <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Select
            label="Health rating"
            value={rating}
            onChange={(e) => setRating(e.target.value as OverallRating | 'all')}
          >
            {RATING_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Select
            label="Test source"
            value={testSource}
            onChange={(e) => setTestSource(e.target.value as TestSource | 'all')}
          >
            {SOURCE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          {profileOptions.length > 1 && (
            <Select
              label="Pool profile"
              value={profileKey}
              onChange={(e) => setProfileKey(e.target.value)}
            >
              {profileOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          )}
          <Select
            label="Sort by"
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
          >
            <option value="date">Date</option>
            <option value="overallScore">Score</option>
            <option value="freeChlorine">Free Chlorine</option>
            <option value="ph">pH</option>
          </Select>
          <Select label="Order" value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDirection)}>
            <option value="desc">Newest / highest first</option>
            <option value="asc">Oldest / lowest first</option>
          </Select>
        </div>
        <div className="filter-actions">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setDateFrom('');
                setDateTo('');
                setRating('all');
                setTestSource('all');
                setProfileKey('all');
              }}
            >
              Clear filters ({activeFilterCount})
            </Button>
          )}
          <Button
            variant={compareMode ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setCompareMode(!compareMode);
              setSelected(new Set());
            }}
          >
            {compareMode ? 'Exit Compare' : 'Compare Tests'}
          </Button>
          {compareMode && (
            <span className="history-compare-hint">
              Select 2–3 tests {selected.size > 0 ? `(${selected.size} selected)` : ''}
            </span>
          )}
        </div>
      </Card>

      {compareMode && selected.size >= 2 && (
        <Card title={`Comparing ${compareTests.length} Tests`}>
          <p className="field__hint history-compare-note">
            Oldest selected test is the baseline. Trends show whether each value moved toward or away from ideal.
          </p>
          <TestComparePanel tests={compareTests} />
        </Card>
      )}

      {sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon="☰"
            title={tests.length === 0 ? 'No tests yet' : 'No tests match your filters'}
            description={
              tests.length === 0
                ? 'Run your first water test to start tracking pool chemistry over time.'
                : 'Try clearing filters or broadening your search.'
            }
            action={
              tests.length === 0 ? (
                <NavButton to="/test">+ New Test</NavButton>
              ) : activeFilterCount > 0 ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setDateFrom('');
                    setDateTo('');
                    setRating('all');
                    setTestSource('all');
                    setProfileKey('all');
                  }}
                >
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <ul className="history-list">
          {sorted.map((test) => (
            <li key={test.id} className="history-item">
              {compareMode && (
                <input
                  type="checkbox"
                  className="history-item__checkbox"
                  checked={selected.has(test.id)}
                  onChange={() => toggleSelect(test.id)}
                  aria-label={`Select test from ${formatDateTime(test.date)}`}
                  disabled={!selected.has(test.id) && selected.size >= 3}
                />
              )}
              <Link to={`/history/${test.id}`} className="history-item__link">
                <div className="history-item__main">
                  <time className="history-item__date" dateTime={test.date}>
                    {formatDateTime(test.date)}
                  </time>
                  <div className="history-item__meta">
                    <span className="history-item__source">{getTestSourceDisplayLabel(test)}</span>
                    <span className="history-item__profile">{getTestProfileSummary(test)}</span>
                  </div>
                  {test.notes && <span className="history-item__notes">{test.notes}</span>}
                </div>
                <div className="history-item__stats">
                  <span className="history-item__reading">FC {test.readings.freeChlorine} ppm</span>
                  <span className="history-item__reading">pH {test.readings.ph}</span>
                  <span className="history-item__score">
                    {test.analysis?.overallScore ?? '—'}/100
                  </span>
                  {test.analysis && (
                    <span className="history-item__rating">
                      {formatRating(test.analysis.overallRating)}
                    </span>
                  )}
                  {test.analysis && (
                    <StatusBadge status={test.analysis.overallStatus} size="sm" />
                  )}
                </div>
              </Link>
              {!compareMode && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm('Delete this test?')) deleteTest(test.id);
                  }}
                  aria-label={`Delete test from ${formatDateTime(test.date)}`}
                >
                  Delete
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
