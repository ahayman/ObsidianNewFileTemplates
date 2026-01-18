/**
 * Date and Time Utility Functions
 *
 * Provides formatting, parsing, and validation utilities for date/time prompts.
 * All functions use local timezone.
 */

// ============================================
// Date Formats
// ============================================

export type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
export type TimeFormat = '12h' | '24h';

// Import output format types from types.ts
import type { DateOutputFormat, TimeOutputFormat } from '../types';

// ============================================
// Output Formatting Functions (for filenames)
// ============================================

/**
 * Formats a Date object to a string for filename output
 * Uses filename-safe characters (hyphens instead of slashes)
 */
export function formatDateOutput(date: Date, format: DateOutputFormat = 'YYYY-MM-DD'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = MONTH_NAMES;
  const monthNamesShort = MONTH_NAMES_SHORT;

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYYMMDD':
      return `${year}${month}${day}`;
    case 'MM-DD-YYYY':
      return `${month}-${day}-${year}`;
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    case 'MMM DD, YYYY':
      return `${monthNamesShort[date.getMonth()]} ${day}, ${year}`;
    case 'MMMM DD, YYYY':
      return `${monthNames[date.getMonth()]} ${day}, ${year}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * Formats time (hours/minutes/seconds) to a string for filename output
 * Uses colons which are sanitized to ⦂ (two dot punctuation) when saving
 */
export function formatTimeOutput(hours: number, minutes: number, format: TimeOutputFormat = 'h:mm A', seconds: number = 0): string {
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');
  const hours24 = String(hours).padStart(2, '0');
  const hours12 = hours % 12 || 12;
  const hours12Padded = String(hours12).padStart(2, '0');
  const ampm = hours < 12 ? 'AM' : 'PM';

  switch (format) {
    case 'HH:mm:ss':
      return `${hours24}:${paddedMinutes}:${paddedSeconds}`;
    case 'HH:mm':
      return `${hours24}:${paddedMinutes}`;
    case 'HHmm':
      return `${hours24}${paddedMinutes}`;
    case 'h:mm A':
      return `${hours12}:${paddedMinutes} ${ampm}`;
    case 'hh:mm A':
      return `${hours12Padded}:${paddedMinutes} ${ampm}`;
    default:
      return `${hours12}:${paddedMinutes} ${ampm}`;
  }
}

/**
 * Formats a datetime for filename output
 * Uses 'T' separator when both date and time are ISO formats (YYYY-MM-DD and HH:mm:ss)
 */
export function formatDateTimeOutput(
  date: Date,
  dateFormat: DateOutputFormat = 'YYYY-MM-DD',
  timeFormat: TimeOutputFormat = 'h:mm A'
): string {
  const dateStr = formatDateOutput(date, dateFormat);
  const timeStr = formatTimeOutput(date.getHours(), date.getMinutes(), timeFormat, date.getSeconds());
  // Use 'T' separator when both date and time are ISO formats
  const isDateISO = dateFormat === 'YYYY-MM-DD';
  const isTimeISO = timeFormat === 'HH:mm:ss';
  const separator = isDateISO && isTimeISO ? 'T' : ' ';
  return `${dateStr}${separator}${timeStr}`;
}

// ============================================
// Custom Format Functions
// ============================================

/**
 * Supported format tokens:
 * - YYYY: 4-digit year (2026)
 * - YY: 2-digit year (26)
 * - MMMM: Full month name (January)
 * - MMM: Short month name (Jan)
 * - MM: 2-digit month (01)
 * - M: 1-2 digit month (1)
 * - DD: 2-digit day (05)
 * - D: 1-2 digit day (5)
 * - HH: 2-digit 24-hour (14)
 * - H: 1-2 digit 24-hour (14)
 * - hh: 2-digit 12-hour (02)
 * - h: 1-2 digit 12-hour (2)
 * - mm: 2-digit minutes (05)
 * - m: 1-2 digit minutes (5)
 * - ss: 2-digit seconds (09)
 * - s: 1-2 digit seconds (9)
 * - A: AM/PM uppercase
 * - a: am/pm lowercase
 */

// Date tokens that indicate date components in format
const DATE_TOKENS = ['YYYY', 'YY', 'MMMM', 'MMM', 'MM', 'M', 'DD', 'D'];

// Time tokens that indicate time components in format
const TIME_TOKENS = ['HH', 'H', 'hh', 'h', 'mm', 'm', 'ss', 's', 'A', 'a'];

/**
 * Checks if a format string contains date tokens
 */
export function hasDateTokens(format: string): boolean {
  return DATE_TOKENS.some(token => format.includes(token));
}

/**
 * Checks if a format string contains time tokens
 */
export function hasTimeTokens(format: string): boolean {
  return TIME_TOKENS.some(token => format.includes(token));
}

/**
 * Formats a Date object using a custom format string
 * Supports tokens: YYYY, YY, MMMM, MMM, MM, M, DD, D, HH, H, hh, h, mm, m, ss, s, A, a
 *
 * Uses placeholder-based replacement to avoid double-substitution issues
 * (e.g., 'a' in "January" being replaced by AM/PM token)
 */
export function formatCustom(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours24 < 12 ? 'AM' : 'PM';

  // Define tokens from longest to shortest to avoid partial matches
  // Each entry: [regex pattern, replacement value]
  const tokens: [RegExp, string][] = [
    // Year
    [/YYYY/g, String(year)],
    [/YY/g, String(year).slice(-2)],
    // Month (longest first)
    [/MMMM/g, MONTH_NAMES[month]],
    [/MMM/g, MONTH_NAMES_SHORT[month]],
    [/MM/g, String(month + 1).padStart(2, '0')],
    [/(?<!A)M(?!M)/g, String(month + 1)],
    // Day
    [/DD/g, String(day).padStart(2, '0')],
    [/(?<![A-Za-z])D(?!D)/g, String(day)],
    // Hours (24h)
    [/HH/g, String(hours24).padStart(2, '0')],
    [/(?<![A-Za-z])H(?!H)/g, String(hours24)],
    // Hours (12h)
    [/hh/g, String(hours12).padStart(2, '0')],
    [/(?<![A-Za-z])h(?!h)/g, String(hours12)],
    // Minutes
    [/mm/g, String(minutes).padStart(2, '0')],
    [/(?<![A-Za-z])m(?!m)/g, String(minutes)],
    // Seconds
    [/ss/g, String(seconds).padStart(2, '0')],
    [/(?<![A-Za-z])s(?!s)/g, String(seconds)],
    // AM/PM (must use specific patterns to avoid matching letters in month names)
    [/(?<![A-Za-z])A(?![A-Za-z])/g, ampm],
    [/(?<![A-Za-z])a(?![A-Za-z])/g, ampm.toLowerCase()],
  ];

  // Use placeholder-based replacement to avoid double-substitution
  // (e.g., 'a' in "January" being replaced by AM/PM)
  let result = format;
  const replacements: string[] = [];

  // First pass: replace all tokens with unique placeholders
  for (const [regex, value] of tokens) {
    result = result.replace(regex, () => {
      const placeholder = `\x00${replacements.length}\x00`;
      replacements.push(value);
      return placeholder;
    });
  }

  // Second pass: replace placeholders with actual values
  for (let i = 0; i < replacements.length; i++) {
    result = result.replaceAll(`\x00${i}\x00`, replacements[i]);
  }

  return result;
}

/**
 * Gets an example output for a custom format string using current date/time
 */
export function getCustomFormatExample(format: string): string {
  return formatCustom(new Date(), format);
}

// ============================================
// Internal Formatting Functions (for picker display)
// ============================================

/**
 * Formats a Date object to a date string (internal use)
 */
export function formatDate(date: Date, format: DateFormat = 'YYYY-MM-DD'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * Formats a Date object to a time string
 */
export function formatTime(date: Date, format: TimeFormat = '24h'): string {
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (format === '12h') {
    const hours12 = hours24 % 12 || 12;
    const ampm = hours24 < 12 ? 'AM' : 'PM';
    return `${hours12}:${minutes} ${ampm}`;
  }

  return `${String(hours24).padStart(2, '0')}:${minutes}`;
}

/**
 * Formats a Date object to a datetime string (ISO format without seconds)
 */
export function formatDateTime(date: Date): string {
  const dateStr = formatDate(date, 'YYYY-MM-DD');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${dateStr}T${hours}:${minutes}`;
}

/**
 * Formats a time value (hours/minutes) to a string
 */
export function formatTimeValue(hours: number, minutes: number, format: TimeFormat = '24h'): string {
  const paddedMinutes = String(minutes).padStart(2, '0');

  if (format === '12h') {
    const hours12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hours12}:${paddedMinutes} ${ampm}`;
  }

  return `${String(hours).padStart(2, '0')}:${paddedMinutes}`;
}

// ============================================
// Parsing Functions
// ============================================

/**
 * Parses a date string (YYYY-MM-DD) to a Date object
 * Returns null if invalid
 */
export function parseDate(value: string): Date | null {
  if (!value) return null;

  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    // Verify the date is valid (handles invalid dates like Feb 30)
    if (
      date.getFullYear() === parseInt(year) &&
      date.getMonth() === parseInt(month) - 1 &&
      date.getDate() === parseInt(day)
    ) {
      return date;
    }
  }

  return null;
}

/**
 * Parses a time string (HH:mm or H:mm AM/PM) to hours and minutes
 * Returns null if invalid
 */
export function parseTime(value: string): { hours: number; minutes: number } | null {
  if (!value) return null;

  // Try 24-hour format (HH:mm)
  const match24 = value.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1]);
    const minutes = parseInt(match24[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes };
    }
  }

  // Try 12-hour format (H:mm AM/PM)
  const match12 = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1]);
    const minutes = parseInt(match12[2]);
    const ampm = match12[3].toUpperCase();

    if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
      if (ampm === 'PM' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
      }
      return { hours, minutes };
    }
  }

  return null;
}

/**
 * Parses a datetime string (YYYY-MM-DDTHH:mm) to a Date object
 * Returns null if invalid
 */
export function parseDateTime(value: string): Date | null {
  if (!value) return null;

  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, dateStr, hours, minutes] = match;
  const date = parseDate(dateStr);
  if (!date) return null;

  const h = parseInt(hours);
  const m = parseInt(minutes);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  date.setHours(h, m, 0, 0);
  return date;
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validates a date string (YYYY-MM-DD format)
 */
export function isValidDate(value: string): boolean {
  return parseDate(value) !== null;
}

/**
 * Validates a time string (HH:mm format)
 */
export function isValidTime(value: string): boolean {
  return parseTime(value) !== null;
}

/**
 * Validates a datetime string (YYYY-MM-DDTHH:mm format)
 */
export function isValidDateTime(value: string): boolean {
  return parseDateTime(value) !== null;
}

// ============================================
// Calendar Utility Functions
// ============================================

/**
 * Returns the number of days in a given month
 * Month is 1-indexed (1 = January, 12 = December)
 */
export function getMonthDays(month: number, year: number): number {
  // Use Date's automatic overflow handling
  // Day 0 of next month = last day of current month
  return new Date(year, month, 0).getDate();
}

/**
 * Returns the day of the week for the first day of a month
 * Returns 0 = Sunday, 6 = Saturday
 */
export function getFirstDayOfMonth(month: number, year: number): number {
  return new Date(year, month - 1, 1).getDay();
}

/**
 * Checks if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Checks if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Generates a calendar grid for a given month
 * Returns a 2D array of Date objects (6 weeks × 7 days)
 * Includes dates from adjacent months to fill the grid
 */
export function generateCalendarGrid(month: number, year: number): Date[][] {
  const grid: Date[][] = [];
  const firstDay = getFirstDayOfMonth(month, year);
  const daysInMonth = getMonthDays(month, year);
  const daysInPrevMonth = getMonthDays(month - 1 || 12, month === 1 ? year - 1 : year);

  let dayCounter = 1;
  let nextMonthDay = 1;

  for (let week = 0; week < 6; week++) {
    const weekRow: Date[] = [];

    for (let day = 0; day < 7; day++) {
      const cellIndex = week * 7 + day;

      if (cellIndex < firstDay) {
        // Previous month
        const prevMonthDay = daysInPrevMonth - (firstDay - cellIndex - 1);
        const prevYear = month === 1 ? year - 1 : year;
        const prevMonth = month === 1 ? 12 : month - 1;
        weekRow.push(new Date(prevYear, prevMonth - 1, prevMonthDay));
      } else if (dayCounter <= daysInMonth) {
        // Current month
        weekRow.push(new Date(year, month - 1, dayCounter++));
      } else {
        // Next month
        const nextYear = month === 12 ? year + 1 : year;
        const nextMonth = month === 12 ? 1 : month + 1;
        weekRow.push(new Date(nextYear, nextMonth - 1, nextMonthDay++));
      }
    }

    grid.push(weekRow);
  }

  return grid;
}

/**
 * Gets the previous month and year
 */
export function getPreviousMonth(month: number, year: number): { month: number; year: number } {
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }
  return { month: month - 1, year };
}

/**
 * Gets the next month and year
 */
export function getNextMonth(month: number, year: number): { month: number; year: number } {
  if (month === 12) {
    return { month: 1, year: year + 1 };
  }
  return { month: month + 1, year };
}

/**
 * Month names for display
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Short month names
 */
export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Day names for calendar header
 */
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Short day names
 */
export const DAY_NAMES_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ============================================
// Time Utility Functions
// ============================================

/**
 * Generates an array of hour values for the time picker
 */
export function generateHours(format: TimeFormat = '24h'): string[] {
  if (format === '12h') {
    return Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i));
  }
  return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
}

/**
 * Generates an array of minute values for the time picker
 */
export function generateMinutes(step: number = 1): string[] {
  const minutes: string[] = [];
  for (let i = 0; i < 60; i += step) {
    minutes.push(String(i).padStart(2, '0'));
  }
  return minutes;
}

/**
 * Gets the current time as hours and minutes
 */
export function getCurrentTime(): { hours: number; minutes: number } {
  const now = new Date();
  return {
    hours: now.getHours(),
    minutes: now.getMinutes()
  };
}

/**
 * Rounds minutes to the nearest step
 */
export function roundMinutesToStep(minutes: number, step: number): number {
  return Math.round(minutes / step) * step % 60;
}
