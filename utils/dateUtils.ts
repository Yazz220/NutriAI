/**
 * Date utility functions for consistent date handling across the app
 * 
 * These utilities ensure all date operations use the same format and timezone handling,
 * preventing subtle bugs from inconsistent date string generation.
 */

/**
 * Converts a Date object to ISO date string (YYYY-MM-DD format)
 * This is the canonical date formatting function used throughout the app.
 * 
 * @param date - Date object to convert (defaults to current date)
 * @returns ISO date string in YYYY-MM-DD format
 * 
 * @example
 * toISODate() // "2025-01-15"
 * toISODate(new Date('2025-01-01')) // "2025-01-01"
 */
export function toISODate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Gets today's date as an ISO string
 * Convenience function for the most common use case
 * 
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayISO(): string {
  return toISODate();
}

/**
 * Checks if a given ISO date string represents today
 * 
 * @param dateISO - ISO date string to check
 * @returns true if the date is today
 */
export function isToday(dateISO: string): boolean {
  return dateISO === getTodayISO();
}

/**
 * Gets the ISO date string for N days ago
 * 
 * @param daysAgo - Number of days in the past (positive number)
 * @returns ISO date string
 * 
 * @example
 * getDaysAgoISO(7) // Date 7 days ago in YYYY-MM-DD format
 */
export function getDaysAgoISO(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return toISODate(date);
}

/**
 * Gets the ISO date string for N days from now
 * 
 * @param daysAhead - Number of days in the future (positive number)
 * @returns ISO date string
 */
export function getDaysAheadISO(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return toISODate(date);
}

/**
 * Parses an ISO date string back to a Date object
 * 
 * @param dateISO - ISO date string in YYYY-MM-DD format
 * @returns Date object set to midnight UTC
 */
export function parseISODate(dateISO: string): Date {
  return new Date(dateISO + 'T00:00:00.000Z');
}

/**
 * Gets a date range array of ISO strings
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of ISO date strings from start to end (inclusive)
 * 
 * @example
 * getDateRange(new Date('2025-01-01'), new Date('2025-01-03'))
 * // ["2025-01-01", "2025-01-02", "2025-01-03"]
 */
export function getDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(toISODate(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Gets an array of ISO date strings for the last N days (including today)
 * 
 * @param days - Number of days to include
 * @returns Array of ISO date strings, oldest first
 * 
 * @example
 * getLastNDaysISO(7) // Last 7 days including today
 */
export function getLastNDaysISO(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(getDaysAgoISO(i));
  }
  return dates;
}

/**
 * Formats an ISO date string for display
 * 
 * @param dateISO - ISO date string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 * 
 * @example
 * formatISODate("2025-01-15") // "Jan 15, 2025"
 * formatISODate("2025-01-15", { weekday: 'short' }) // "Wed, Jan 15, 2025"
 */
export function formatISODate(
  dateISO: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  const date = parseISODate(dateISO);
  return date.toLocaleDateString(undefined, options);
}

/**
 * Gets a human-friendly relative date label
 * 
 * @param dateISO - ISO date string
 * @returns "Today", "Yesterday", or formatted date
 */
export function getRelativeDateLabel(dateISO: string): string {
  if (isToday(dateISO)) return 'Today';
  
  const yesterday = getDaysAgoISO(1);
  if (dateISO === yesterday) return 'Yesterday';
  
  return formatISODate(dateISO);
}
