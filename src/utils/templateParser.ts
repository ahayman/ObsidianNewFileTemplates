/**
 * Template Parser Utility
 *
 * Parses title patterns and substitutes template variables with actual values.
 * Supported variables:
 * - {{date}}      - Current date (YYYY-MM-DD)
 * - {{time}}      - Current time (h:mm:ss A, 12-hour format)
 * - {{datetime}}  - Combined date and time (YYYY-MM-DDTHH:mm:ss, ISO 8601)
 * - {{timestamp}} - Unix timestamp in milliseconds
 * - {{year}}      - Current year (YYYY)
 * - {{month}}     - Current month (MM, zero-padded)
 * - {{day}}       - Current day (DD, zero-padded)
 * - {{counter}}   - Auto-incrementing integer (computed from existing files)
 *
 * Also supports user prompts with syntax: {% Prompt Name %}
 */

import { UserPrompt, PromptValues } from "../types";
import { substitutePrompts } from "./promptParser";

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

  // 12-hour time format with AM/PM
  const hour24 = date.getHours();
  const hour12 = hour24 % 12 || 12;
  const ampm = hour24 < 12 ? "AM" : "PM";
  const timeStr = `${hour12}:${minutes}:${seconds} ${ampm}`;

  return {
    date: dateStr,
    time: timeStr,
    datetime: `${dateStr}T${hours}:${minutes}:${seconds}`,
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
  "counter",
] as const;

export type TemplateVariable = (typeof SUPPORTED_VARIABLES)[number];

/**
 * Regular expression to match template variables: {{variableName}}
 */
const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Regular expression to match user prompts: {% Prompt Name %}
 * These are handled separately and should not be flagged as invalid variables
 */
const PROMPT_PATTERN = /\{%\s*.+?\s*%\}/g;

/**
 * Checks if a template pattern contains the {{counter}} variable
 *
 * @param pattern - The template pattern to check
 * @returns true if the pattern contains {{counter}}
 */
export function hasCounterVariable(pattern: string): boolean {
  return /\{\{counter\}\}/i.test(pattern);
}

/**
 * Counts the number of occurrences of a specific variable in a pattern
 *
 * @param pattern - The template pattern to search
 * @param variable - The variable name to count (without braces)
 * @returns The number of times the variable appears
 */
export function countVariableOccurrences(pattern: string, variable: string): number {
  const regex = new RegExp(`\\{\\{${variable}\\}\\}`, "gi");
  const matches = pattern.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Validation result for template patterns
 */
export interface TemplateValidationResult {
  valid: boolean;
  error?: string;
  unrecognizedVariables?: string[];
}

/**
 * Validates a template pattern including counter-specific rules
 *
 * @param pattern - The template pattern to validate
 * @returns Validation result with error message if invalid
 */
export function validateTemplatePattern(pattern: string): TemplateValidationResult {
  // Check for unrecognized variables
  const unrecognized = validateTemplate(pattern);
  if (unrecognized.length > 0) {
    return {
      valid: false,
      error: `Unrecognized variables: ${unrecognized.join(", ")}`,
      unrecognizedVariables: unrecognized,
    };
  }

  // Check that {{counter}} appears at most once
  const counterCount = countVariableOccurrences(pattern, "counter");
  if (counterCount > 1) {
    return {
      valid: false,
      error: "Template can only contain one {{counter}} variable",
    };
  }

  return { valid: true };
}

/**
 * Parses a template pattern and substitutes all variables with their values
 *
 * @param pattern - The template pattern containing {{variable}} placeholders
 * @param date - Optional date to use for variable values (defaults to current date)
 * @param counterValue - Optional counter value to substitute for {{counter}}
 * @param prompts - Optional user prompts configuration
 * @param promptValues - Optional map of prompt IDs to user-entered values
 * @returns The parsed string with all variables substituted
 *
 * @example
 * parseTemplate("{{date}}-notes") // "2024-01-15-notes"
 * parseTemplate("{{year}}/{{month}}/{{day}}") // "2024/01/15"
 * parseTemplate("Note {{counter}}", new Date(), 5) // "Note 5"
 * parseTemplate("{% Author %}-{{date}}", new Date(), undefined, prompts, values) // "John-2024-01-15"
 */
export function parseTemplate(
  pattern: string,
  date: Date = new Date(),
  counterValue?: number,
  prompts?: UserPrompt[],
  promptValues?: PromptValues
): string {
  const variables = getTemplateVariables(date);

  // First, substitute user prompts if provided
  let result = pattern;
  if (prompts && promptValues) {
    result = substitutePrompts(result, prompts, promptValues);
  }

  // Then substitute built-in variables
  return result.replace(VARIABLE_PATTERN, (match, variableName: string) => {
    const lowerName = variableName.toLowerCase();

    // Handle counter variable specially
    if (lowerName === "counter") {
      if (counterValue !== undefined) {
        return String(counterValue);
      }
      // Return placeholder for preview if no value provided
      return "#";
    }

    const value = variables[lowerName];
    if (value !== undefined) {
      return value;
    }
    // Return the original match if variable is not recognized
    return match;
  });
}

/**
 * Validates a template pattern and returns any unrecognized variables
 * Note: User prompts ({% Prompt Name %}) are valid and not flagged as unrecognized
 *
 * @param pattern - The template pattern to validate
 * @returns Array of unrecognized variable names (empty if all valid)
 *
 * @example
 * validateTemplate("{{date}}-{{invalid}}") // ["invalid"]
 * validateTemplate("{{date}}-{{time}}") // []
 * validateTemplate("{{date}}-{% Author %}") // [] (prompts are valid)
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
 * @param counterValue - Optional counter value (shows "#" placeholder if not provided)
 * @param prompts - Optional user prompts configuration
 * @param promptValues - Optional map of prompt IDs to user-entered values
 * @returns The parsed preview string
 */
export function previewTemplate(
  pattern: string,
  date: Date = new Date(),
  counterValue?: number,
  prompts?: UserPrompt[],
  promptValues?: PromptValues
): string {
  return parseTemplate(pattern, date, counterValue, prompts, promptValues);
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
 * @param counterValue - Optional counter value for {{counter}} variable
 * @param prompts - Optional user prompts configuration
 * @param promptValues - Optional map of prompt IDs to user-entered values
 * @returns Sanitized filename safe for file systems
 */
export function parseTemplateToFilename(
  pattern: string,
  date: Date = new Date(),
  counterValue?: number,
  prompts?: UserPrompt[],
  promptValues?: PromptValues
): string {
  const parsed = parseTemplate(pattern, date, counterValue, prompts, promptValues);
  return sanitizeFilename(parsed);
}
