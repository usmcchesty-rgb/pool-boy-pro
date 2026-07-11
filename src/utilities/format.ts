import type { OverallRating, ParameterLevel, PriorityLevel, ReadingStatus } from '../models/types';
import { levelLabel, priorityLabel } from '../chemistry/classification';
import { ratingLabel } from '../chemistry/analysis';

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return formatDate(iso);
}

export function formatLevel(level: ParameterLevel): string {
  return levelLabel(level);
}

export function formatPriority(priority: PriorityLevel): string {
  return priorityLabel(priority);
}

export function formatRating(rating: OverallRating): string {
  return ratingLabel(rating);
}

export function statusLabel(status: ReadingStatus): string {
  const labels: Record<ReadingStatus, string> = {
    too_low: 'Too Low',
    ideal: 'Ideal',
    too_high: 'Too High',
  };
  return labels[status];
}

export function statusColor(status: ReadingStatus): string {
  const colors: Record<ReadingStatus, string> = {
    too_low: 'var(--status-low)',
    ideal: 'var(--status-ideal)',
    too_high: 'var(--status-high)',
  };
  return colors[status];
}
