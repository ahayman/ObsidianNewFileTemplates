/**
 * Template Parser Utility
 *
 * Parses title patterns and substitutes template variables with actual values.
 * Supported variables:
 * - {{date}}      - Current date (YYYY-MM-DD)
 * - {{time}}      - Current time (HH-mm-ss, file-safe format)
 * - {{datetime}}  - Combined date and time (YYYY-MM-DD_HH-mm-ss)
 * - {{timestamp}} - Unix timestamp in milliseconds
 * - {{year}}      - Current year (YYYY)
 * - {{month}}     - Current month (MM, zero-padded)
 * - {{day}}       - Current day (DD, zero-padded)
 */

/**
 * Pads a number with leading zeros to reach the specified length
 */
function padZero(num: number, length: number = 2): string {
  return String(num).padStart(length, "0");
}

/**
 * Gets all template variable values for a given date
 */
export function getTemplateVariables(date: Date = new Date()): Record<string, string> {
  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  const seconds = padZero(date.getSeconds());

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hours}-${minutes}-${seconds}`;

  return {
    date: dateStr,
    time: timeStr,
    datetime: `${dateStr}_${timeStr}`,
    timestamp: String(date.getTime()),
    year: String(year),
    month: month,
    day: day,
  };
}

/**
 * List of all supported template variables
 */
export const SUPPORTED_VARIABLES = [
  "date",
  "time",
  "datetime",
  "timestamp",
  "year",
  "month",
  "day",
] as const;

export type TemplateVariable = (typeof SUPPORTED_VARIABLES)[number];

/**
 * Regular expression to match template variables: {{variableName}}
 */
const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Parses a template pattern and substitutes all variables with their values
 *
 * @param pattern - The template pattern containing {{variable}} placeholders
 * @param date - Optional date to use for variable values (defaults to current date)
 * @returns The parsed string with all variables substituted
 *
 * @example
 * parseTemplate("{{date}}-notes") // "2024-01-15-notes"
 * parseTemplate("{{year}}/{{month}}/{{day}}") // "2024/01/15"
 */
export function parseTemplate(pattern: string, date: Date = new Date()): string {
  const variables = getTemplateVariables(date);

  return pattern.replace(VARIABLE_PATTERN, (match, variableName: string) => {
    const value = variables[variableName.toLowerCase()];
    if (value !== undefined) {
      return value;
    }
    // Return the original match if variable is not recognized
    return match;
  });
}

/**
 * Validates a template pattern and returns any unrecognized variables
 *
 * @param pattern - The template pattern to validate
 * @returns Array of unrecognized variable names (empty if all valid)
 *
 * @example
 * validateTemplate("{{date}}-{{invalid}}") // ["invalid"]
 * validateTemplate("{{date}}-{{time}}") // []
 */
export function validateTemplate(pattern: string): string[] {
  const unrecognized: string[] = [];
  const variables = new Set(SUPPORTED_VARIABLES as readonly string[]);

  let match;
  const regex = new RegExp(VARIABLE_PATTERN);
  while ((match = regex.exec(pattern)) !== null) {
    const variableName = match[1].toLowerCase();
    if (!variables.has(variableName)) {
      unrecognized.push(match[1]);
    }
  }

  return unrecognized;
}

/**
 * Extracts all variable names from a template pattern
 *
 * @param pattern - The template pattern to extract variables from
 * @returns Array of variable names found in the pattern
 *
 * @example
 * extractVariables("{{date}}-{{time}}-notes") // ["date", "time"]
 */
export function extractVariables(pattern: string): string[] {
  const variables: string[] = [];

  let match;
  const regex = new RegExp(VARIABLE_PATTERN);
  while ((match = regex.exec(pattern)) !== null) {
    variables.push(match[1].toLowerCase());
  }

  return variables;
}

/**
 * Generates a preview of what a template will produce
 * Useful for showing users what their pattern will create
 *
 * @param pattern - The template pattern to preview
 * @param date - Optional date to use (defaults to current date)
 * @returns The parsed preview string
 */
export function previewTemplate(pattern: string, date: Date = new Date()): string {
  return parseTemplate(pattern, date);
}

/**
 * Sanitizes a filename by replacing or removing invalid characters
 * This is applied after template parsing to ensure valid filenames
 *
 * Character handling:
 * - : replaced with ⦂ (two dot punctuation U+2982)
 * - | replaced with ∣ (divides U+2223)
 * - * " \ / < > ? and control characters are removed
 *
 * @param filename - The filename to sanitize
 * @returns Sanitized filename safe for file systems
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/:/g, "⦂")           // Replace colon with two dot punctuation
    .replace(/\|/g, "∣")          // Replace pipe with divides symbol
    .replace(/[*"\\/<>?\x00-\x1f]/g, "") // Remove other invalid characters
    .replace(/^\.+/, "")          // Remove leading dots
    .replace(/\.+$/, "")          // Remove trailing dots
    .replace(/\s+/g, " ")         // Normalize whitespace
    .trim();
}

/**
 * Parses a template pattern and returns a sanitized, file-safe result
 *
 * @param pattern - The template pattern to parse
 * @param date - Optional date to use (defaults to current date)
 * @returns Sanitized filename safe for file systems
 */
export function parseTemplateToFilename(pattern: string, date: Date = new Date()): string {
  const parsed = parseTemplate(pattern, date);
  return sanitizeFilename(parsed);
}
