/**
 * Moment.js Token Definitions and Parser
 *
 * Provides comprehensive token definitions for moment.js format strings,
 * used for syntax highlighting and autocomplete in format(...) syntax.
 */

/**
 * Represents a moment.js format token
 */
export interface MomentToken {
  /** The token string (e.g., "YYYY", "MM") */
  token: string;
  /** Human-readable description */
  description: string;
  /** Example output */
  example: string;
  /** Category for grouping */
  category: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'ampm' | 'timezone' | 'other';
}

/**
 * Comprehensive list of moment.js format tokens
 * Sorted by token length (longest first) for correct matching
 */
export const MOMENT_TOKENS: MomentToken[] = [
  // Year
  { token: 'YYYY', description: '4-digit year', example: '2026', category: 'year' },
  { token: 'YY', description: '2-digit year', example: '26', category: 'year' },

  // Month
  { token: 'MMMM', description: 'Full month name', example: 'January', category: 'month' },
  { token: 'MMM', description: 'Abbreviated month', example: 'Jan', category: 'month' },
  { token: 'MM', description: 'Month (zero-padded)', example: '01', category: 'month' },
  { token: 'Mo', description: 'Month with ordinal', example: '1st', category: 'month' },
  { token: 'M', description: 'Month', example: '1', category: 'month' },

  // Day of Month
  { token: 'DDDD', description: 'Day of year (padded)', example: '018', category: 'day' },
  { token: 'DDD', description: 'Day of year', example: '18', category: 'day' },
  { token: 'DD', description: 'Day (zero-padded)', example: '05', category: 'day' },
  { token: 'Do', description: 'Day with ordinal', example: '5th', category: 'day' },
  { token: 'D', description: 'Day', example: '5', category: 'day' },

  // Day of Week
  { token: 'dddd', description: 'Full weekday name', example: 'Monday', category: 'day' },
  { token: 'ddd', description: 'Abbreviated weekday', example: 'Mon', category: 'day' },
  { token: 'dd', description: 'Min weekday name', example: 'Mo', category: 'day' },
  { token: 'do', description: 'Day of week ordinal', example: '1st', category: 'day' },
  { token: 'd', description: 'Day of week (0-6)', example: '1', category: 'day' },
  { token: 'e', description: 'Day of week (locale)', example: '1', category: 'day' },
  { token: 'E', description: 'Day of week (ISO)', example: '1', category: 'day' },

  // Hour
  { token: 'HH', description: 'Hour 24h (zero-padded)', example: '14', category: 'hour' },
  { token: 'H', description: 'Hour 24h', example: '14', category: 'hour' },
  { token: 'hh', description: 'Hour 12h (zero-padded)', example: '02', category: 'hour' },
  { token: 'h', description: 'Hour 12h', example: '2', category: 'hour' },
  { token: 'kk', description: 'Hour 1-24 (zero-padded)', example: '14', category: 'hour' },
  { token: 'k', description: 'Hour 1-24', example: '14', category: 'hour' },

  // Minute
  { token: 'mm', description: 'Minutes (zero-padded)', example: '05', category: 'minute' },
  { token: 'm', description: 'Minutes', example: '5', category: 'minute' },

  // Second
  { token: 'ss', description: 'Seconds (zero-padded)', example: '09', category: 'second' },
  { token: 's', description: 'Seconds', example: '9', category: 'second' },
  { token: 'SSS', description: 'Milliseconds (3 digits)', example: '123', category: 'second' },
  { token: 'SS', description: 'Milliseconds (2 digits)', example: '12', category: 'second' },
  { token: 'S', description: 'Milliseconds (1 digit)', example: '1', category: 'second' },

  // AM/PM
  { token: 'A', description: 'AM/PM uppercase', example: 'PM', category: 'ampm' },
  { token: 'a', description: 'am/pm lowercase', example: 'pm', category: 'ampm' },

  // Week
  { token: 'ww', description: 'Week of year (padded)', example: '03', category: 'other' },
  { token: 'wo', description: 'Week of year ordinal', example: '3rd', category: 'other' },
  { token: 'w', description: 'Week of year', example: '3', category: 'other' },
  { token: 'WW', description: 'ISO week (padded)', example: '03', category: 'other' },
  { token: 'Wo', description: 'ISO week ordinal', example: '3rd', category: 'other' },
  { token: 'W', description: 'ISO week', example: '3', category: 'other' },

  // Quarter
  { token: 'Qo', description: 'Quarter ordinal', example: '1st', category: 'other' },
  { token: 'Q', description: 'Quarter', example: '1', category: 'other' },

  // Timestamp
  { token: 'X', description: 'Unix timestamp (seconds)', example: '1737208800', category: 'other' },
  { token: 'x', description: 'Unix timestamp (ms)', example: '1737208800000', category: 'other' },

  // Timezone
  { token: 'ZZ', description: 'Timezone offset', example: '+0500', category: 'timezone' },
  { token: 'Z', description: 'Timezone offset (:)', example: '+05:00', category: 'timezone' },
  { token: 'zz', description: 'Timezone name', example: 'EST', category: 'timezone' },
  { token: 'z', description: 'Timezone abbr', example: 'EST', category: 'timezone' },

  // Week year
  { token: 'gggg', description: 'Locale week year', example: '2026', category: 'year' },
  { token: 'gg', description: 'Locale week year (2 digit)', example: '26', category: 'year' },
  { token: 'GGGG', description: 'ISO week year', example: '2026', category: 'year' },
  { token: 'GG', description: 'ISO week year (2 digit)', example: '26', category: 'year' },
];

/**
 * Tokens sorted by length (longest first) for matching
 * This ensures MMMM matches before MMM before MM before M
 */
export const TOKENS_BY_LENGTH = [...MOMENT_TOKENS].sort(
  (a, b) => b.token.length - a.token.length
);

/**
 * Map from token string to token info for quick lookup
 */
export const TOKEN_MAP: Map<string, MomentToken> = new Map(
  MOMENT_TOKENS.map(t => [t.token, t])
);

/**
 * Represents a parsed part of a format string
 */
export interface FormatPart {
  /** Type of part: token or literal text */
  type: 'token' | 'literal';
  /** The text value */
  value: string;
  /** Start position in original string */
  start: number;
  /** End position in original string */
  end: number;
  /** Token info if this is a token part */
  tokenInfo?: MomentToken;
}

/**
 * Parse a format string into tokens and literals
 *
 * @param format - The format string to parse (e.g., "MMMM DD, YYYY")
 * @returns Array of format parts with positions
 */
export function parseFormatString(format: string): FormatPart[] {
  const parts: FormatPart[] = [];
  let pos = 0;

  while (pos < format.length) {
    let matched = false;

    // Try to match a token (longest first)
    for (const token of TOKENS_BY_LENGTH) {
      if (format.substring(pos).startsWith(token.token)) {
        parts.push({
          type: 'token',
          value: token.token,
          start: pos,
          end: pos + token.token.length,
          tokenInfo: token,
        });
        pos += token.token.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // This is a literal character
      // Try to merge with previous literal
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.type === 'literal') {
        lastPart.value += format[pos];
        lastPart.end = pos + 1;
      } else {
        parts.push({
          type: 'literal',
          value: format[pos],
          start: pos,
          end: pos + 1,
        });
      }
      pos += 1;
    }
  }

  return parts;
}

/**
 * Get tokens filtered by a partial query string
 *
 * @param query - Partial token to match (case-insensitive)
 * @returns Filtered array of tokens
 */
export function filterTokens(query: string): MomentToken[] {
  if (!query) return MOMENT_TOKENS;

  const lowerQuery = query.toLowerCase();
  return MOMENT_TOKENS.filter(token =>
    token.token.toLowerCase().startsWith(lowerQuery) ||
    token.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get tokens grouped by category
 */
export function getTokensByCategory(): Map<string, MomentToken[]> {
  const byCategory = new Map<string, MomentToken[]>();

  for (const token of MOMENT_TOKENS) {
    const existing = byCategory.get(token.category) || [];
    existing.push(token);
    byCategory.set(token.category, existing);
  }

  return byCategory;
}

/**
 * Generate a live example for a token based on current date/time
 */
export function getTokenExample(token: MomentToken): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const hours24 = now.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const dayOfWeek = now.getDay();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayMin = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  switch (token.token) {
    case 'YYYY': return String(year);
    case 'YY': return String(year).slice(-2);
    case 'MMMM': return monthNames[month];
    case 'MMM': return monthAbbr[month];
    case 'MM': return pad(month + 1);
    case 'Mo': return ordinal(month + 1);
    case 'M': return String(month + 1);
    case 'DD': return pad(day);
    case 'Do': return ordinal(day);
    case 'D': return String(day);
    case 'dddd': return dayNames[dayOfWeek];
    case 'ddd': return dayAbbr[dayOfWeek];
    case 'dd': return dayMin[dayOfWeek];
    case 'd': return String(dayOfWeek);
    case 'HH': return pad(hours24);
    case 'H': return String(hours24);
    case 'hh': return pad(hours12);
    case 'h': return String(hours12);
    case 'mm': return pad(minutes);
    case 'm': return String(minutes);
    case 'ss': return pad(seconds);
    case 's': return String(seconds);
    case 'A': return hours24 >= 12 ? 'PM' : 'AM';
    case 'a': return hours24 >= 12 ? 'pm' : 'am';
    default: return token.example;
  }
}
