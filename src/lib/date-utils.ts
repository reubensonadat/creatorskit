/**
 * 🕒 YouTube Relative Date Formatter
 * Converts ISO timestamps (e.g. 2026-08-30T14:20:00Z) or legacy relative strings
 * into authentic live YouTube relative time strings dynamically.
 */

export function formatTimeAgo(dateInput?: string | null, fallback: string = '3 days ago'): string {
  if (!dateInput) return fallback;

  // If already formatted like "3 days ago" or "2 hours ago", return as is
  if (typeof dateInput === 'string' && dateInput.includes('ago')) {
    return dateInput;
  }

  const timestamp = new Date(dateInput).getTime();
  if (isNaN(timestamp)) {
    return dateInput;
  }

  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffSec < 604800) {
    const days = Math.floor(diffSec / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  if (diffSec < 2592000) {
    const weeks = Math.floor(diffSec / 604800);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  if (diffSec < 31536000) {
    const months = Math.floor(diffSec / 2592000);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  const years = Math.floor(diffSec / 31536000);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

/**
 * Converts legacy relative time strings (e.g. "3 days ago", "1 week ago", "2 hours ago")
 * into a solid ISO timestamp for long-term database storage.
 */
export function relativeStringToISODate(str?: string | null): string {
  if (!str) return new Date().toISOString();

  // If already an ISO or valid date string
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && str.includes('-')) {
    return parsed.toISOString();
  }

  const lower = str.toLowerCase().trim();
  const now = Date.now();

  const numMatch = lower.match(/\d+/);
  const num = numMatch ? parseInt(numMatch[0], 10) : 1;

  if (lower.includes('minute')) {
    return new Date(now - num * 60 * 1000).toISOString();
  }
  if (lower.includes('hour')) {
    return new Date(now - num * 3600 * 1000).toISOString();
  }
  if (lower.includes('day')) {
    return new Date(now - num * 86400 * 1000).toISOString();
  }
  if (lower.includes('week')) {
    return new Date(now - num * 7 * 86400 * 1000).toISOString();
  }
  if (lower.includes('month')) {
    return new Date(now - num * 30 * 86400 * 1000).toISOString();
  }
  if (lower.includes('year')) {
    return new Date(now - num * 365 * 86400 * 1000).toISOString();
  }

  return new Date().toISOString();
}
