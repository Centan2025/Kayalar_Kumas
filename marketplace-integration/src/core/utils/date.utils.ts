export function toISO(input: string | number | Date): string {
  if (input instanceof Date) return input.toISOString();
  if (typeof input === 'number') return new Date(input).toISOString();
  // Try parsing string
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function isWithinRange(date: string, from?: string, to?: string): boolean {
  const d = new Date(date).getTime();
  if (from && d < new Date(from).getTime()) return false;
  if (to && d > new Date(to).getTime()) return false;
  return true;
}

export function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}
