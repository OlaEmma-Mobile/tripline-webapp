/**
 * Add business days (Mon-Fri) to a date.
 */
export function addBusinessDays(start: Date, days: number): Date {
  let result = new Date(start);
  let remaining = Math.max(0, Math.floor(days));

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }

  return result;
}

/**
 * Calculate business days between two dates (start -> end).
 */
export function businessDaysBetween(start: Date, end: Date): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (endDate <= startDate) return 0;

  let count = 0;
  const cursor = new Date(startDate);
  while (cursor < endDate) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
  }

  return count;
}
