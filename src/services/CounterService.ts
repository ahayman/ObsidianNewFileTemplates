/**
 * Counter Service
 *
 * Handles auto-incrementing counter functionality for title templates.
 * Scans existing files in a folder to determine the next counter value.
 */

import { App, TFile, TFolder, normalizePath } from "obsidian";
import { TitleTemplate } from "../types";
import { hasCounterVariable } from "../utils/templateParser";
import {
  TemplatesSettings,
  getTemplatesSettings,
  DEFAULT_DATE_FORMAT,
  DEFAULT_FILENAME_TIME_FORMAT,
} from "../utils/templatesIntegration";

/**
 * Escapes special regex characters in a string
 *
 * @param str - The string to escape
 * @returns Escaped string safe for use in regex
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Applies only the character substitutions from filename sanitization.
 *
 * This is a lighter version of sanitizeFilename that only handles character
 * replacements (: → ⦂, | → ∣) without trimming or whitespace normalization.
 * Used when building regex patterns to match sanitized filenames.
 *
 * @param str - The string to sanitize
 * @returns String with sanitized characters
 */
export function sanitizeForPattern(str: string): string {
  return str
    .replace(/:/g, "⦂")           // Replace colon with two dot punctuation
    .replace(/\|/g, "∣")          // Replace pipe with divides symbol
    .replace(/[*"\\/<>?\x00-\x1f]/g, ""); // Remove other invalid characters
}

/**
 * Converts a moment.js format string to a regex pattern
 *
 * Maps common moment.js tokens to regex patterns that match their output.
 * For unknown tokens, falls back to matching any characters.
 *
 * @param format - The moment.js format string
 * @returns Regex pattern string
 */
export function momentFormatToRegex(format: string): string {
  // Order matters - longer tokens must be processed first to avoid partial matches
  // e.g., "YYYY" must be matched before "YY", "MMMM" before "MMM" before "MM" before "M"
  const tokenReplacements: [string, string][] = [
    // Year - longest first
    ["YYYY", "\\d{4}"],
    ["YY", "\\d{2}"],
    // Month - longest first
    ["MMMM", "[A-Za-z]+"],    // Full month name (January, etc.)
    ["MMM", "[A-Za-z]{3}"],   // Short month name (Jan, etc.)
    ["MM", "\\d{2}"],
    ["Mo", "\\d{1,2}(?:st|nd|rd|th)"], // Ordinal
    ["M", "\\d{1,2}"],
    // Day of month - longest first
    ["DDDD", "\\d{3}"],       // Day of year (3 digits)
    ["DDD", "\\d{1,3}"],      // Day of year without padding
    ["DD", "\\d{2}"],
    ["Do", "\\d{1,2}(?:st|nd|rd|th)"], // Ordinal
    ["D", "\\d{1,2}"],
    // Day of week - longest first
    ["dddd", "[A-Za-z]+"],    // Full day name (Monday, etc.)
    ["ddd", "[A-Za-z]{3}"],   // Short day name (Mon, etc.)
    ["dd", "[A-Za-z]{2}"],    // Min day name (Mo, etc.)
    ["d", "\\d"],             // Day of week (0-6)
    // Hour - longest first
    ["HH", "\\d{2}"],         // 24-hour with padding
    ["H", "\\d{1,2}"],        // 24-hour without padding
    ["hh", "\\d{2}"],         // 12-hour with padding
    ["h", "\\d{1,2}"],        // 12-hour without padding
    // Minute
    ["mm", "\\d{2}"],
    ["m", "\\d{1,2}"],
    // Second
    ["ss", "\\d{2}"],
    ["s", "\\d{1,2}"],
    // Fractional seconds - longest first
    ["SSSSSS", "\\d{6}"],
    ["SSSSS", "\\d{5}"],
    ["SSSS", "\\d{4}"],
    ["SSS", "\\d{3}"],
    ["SS", "\\d{2}"],
    ["S", "\\d{1}"],
    // AM/PM
    ["A", "[AP]M"],
    ["a", "[ap]m"],
    // Timezone
    ["ZZ", "[+-]\\d{4}"],
    ["Z", "[+-]\\d{2}:\\d{2}"],
    // Unix timestamp
    ["X", "\\d+"],
    ["x", "\\d+"],
    // Week
    ["ww", "\\d{2}"],
    ["w", "\\d{1,2}"],
    ["WW", "\\d{2}"],
    ["W", "\\d{1,2}"],
    // Quarter
    ["Q", "[1-4]"],
  ];

  // Strategy: Replace tokens with unique placeholders, escape literals, then restore patterns
  const placeholderMap: Map<string, string> = new Map();
  let result = format;
  let placeholderIndex = 0;

  // Replace each token with a unique placeholder
  for (const [token, pattern] of tokenReplacements) {
    // Create a regex that matches the token as a whole word boundary isn't reliable here
    // so we just do simple string replacement from longest to shortest
    while (result.includes(token)) {
      const placeholder = `\x00${placeholderIndex}\x00`;
      placeholderMap.set(placeholder, pattern);
      result = result.replace(token, placeholder);
      placeholderIndex++;
    }
  }

  // Escape any remaining special characters (these are literal text)
  result = escapeRegex(result);

  // Restore placeholders with their regex patterns
  for (const [placeholder, pattern] of placeholderMap) {
    // The placeholder itself got escaped, so we need to match the escaped version
    const escapedPlaceholder = escapeRegex(placeholder);
    result = result.split(escapedPlaceholder).join(pattern);
  }

  // Handle sanitized characters in filenames
  // Colons (:) are sanitized to ⦂ (U+2982) - match either
  result = result.split(":").join("[:⦂]");
  // Pipes (|) are sanitized to ∣ (U+2223) - match either
  result = result.split("\\|").join("[|∣]");

  return result;
}

/**
 * Gets the regex pattern for a template variable
 *
 * @param varName - The variable name (without braces)
 * @param format - Optional custom format for date/time variables
 * @param settings - Optional templates settings for date/time format defaults
 * @returns Regex pattern string
 */
export function getVariableRegexPattern(
  varName: string,
  format?: string,
  settings?: TemplatesSettings
): string {
  const lowerName = varName.toLowerCase();

  // Get the date format from settings or use default
  const dateFormat = settings?.dateFormat || DEFAULT_DATE_FORMAT;
  // Time format is 12-hour with AM/PM (h:mm:ss A)
  const timeFormat = DEFAULT_FILENAME_TIME_FORMAT;

  switch (lowerName) {
    case "counter":
      // Counter is always captured - caller wraps in parentheses if needed
      return "\\d+";

    case "date":
      if (format) {
        return momentFormatToRegex(format);
      }
      // Use user's configured date format
      return momentFormatToRegex(dateFormat);

    case "time":
      if (format) {
        return momentFormatToRegex(format);
      }
      // 12-hour format with AM/PM: h:mm:ss A
      return momentFormatToRegex(timeFormat);

    case "datetime":
      // Combined: {dateFormat}T{HH:mm:ss} (ISO 8601 format)
      // Use user's date format + T + HH:mm:ss time format
      return momentFormatToRegex(dateFormat) + "T" + momentFormatToRegex("HH:mm:ss");

    case "timestamp":
      // Unix timestamp (10-13 digits for seconds/milliseconds)
      return "\\d{10,13}";

    case "year":
      return "\\d{4}";

    case "month":
      return "\\d{2}";

    case "day":
      return "\\d{2}";

    default:
      // Unknown variable - match non-greedy any characters
      return ".*?";
  }
}

/**
 * Checks if a string contains any template variables
 */
function containsVariables(str: string): boolean {
  return /\{\{\w+(?::[^}]+)?\}\}/i.test(str);
}

/**
 * Checks if a string contains any user prompts
 */
function containsPrompts(str: string): boolean {
  return /\{%\s*.+?\s*%\}/.test(str);
}

/**
 * Checks if a string contains any dynamic content (variables or prompts)
 */
function containsDynamicContent(str: string): boolean {
  return containsVariables(str) || containsPrompts(str);
}

/**
 * Builds a regex pattern from a title template that can match existing files.
 *
 * Uses a smart approach to minimize pattern complexity:
 * - If counter is at start with static text before: anchor to start, flexible after
 * - If counter is at end with static text after: anchor to end, flexible before
 * - If counter has static text on one side: anchor to that side, flexible on the other
 * - Only use full precision when variables exist on both sides of counter
 *
 * This makes the pattern resilient to:
 * - Custom date formats
 * - User modifications to titles
 * - Minor variations in format
 *
 * @param titlePattern - The title template pattern
 * @param settings - Optional templates settings for date/time format defaults
 * @returns Compiled RegExp with counter as captured group, or null if no counter
 */
export function buildMatchingPattern(
  titlePattern: string,
  settings?: TemplatesSettings
): RegExp | null {
  // Check if pattern has a counter variable
  if (!hasCounterVariable(titlePattern)) {
    return null;
  }

  // Find the counter variable position
  const counterMatch = titlePattern.match(/\{\{counter\}\}/i);
  if (!counterMatch || counterMatch.index === undefined) {
    return null;
  }

  const counterStart = counterMatch.index;
  const counterEnd = counterStart + counterMatch[0].length;

  // Split the pattern into before and after counter
  const beforeCounter = titlePattern.slice(0, counterStart);
  const afterCounter = titlePattern.slice(counterEnd);

  // Check if before/after contain dynamic content (variables or prompts)
  const hasDynamicBefore = containsDynamicContent(beforeCounter);
  const hasDynamicAfter = containsDynamicContent(afterCounter);

  // Sanitize static text portions
  const sanitizedBefore = sanitizeForPattern(beforeCounter);
  const sanitizedAfter = sanitizeForPattern(afterCounter);

  // Build pattern based on what's around the counter
  let regexPattern: string;

  if (!hasDynamicBefore && !hasDynamicAfter) {
    // Case 1: Static text on both sides (or no text)
    // Pattern: ^{before}(\d+){after}$
    regexPattern = `^${escapeRegex(sanitizedBefore)}(\\d+)${escapeRegex(sanitizedAfter)}$`;
  } else if (!hasDynamicBefore && hasDynamicAfter) {
    // Case 2: Static text before, dynamic content after (variables or prompts)
    // Pattern: ^{before}(\d+).*$
    // We only need to match the static prefix and capture the counter
    regexPattern = `^${escapeRegex(sanitizedBefore)}(\\d+).*$`;
  } else if (hasDynamicBefore && !hasDynamicAfter) {
    // Case 3: Dynamic content before, static text after
    // Pattern: ^.*?(\d+){after}$
    // Use non-greedy match before, then capture counter and match static suffix
    regexPattern = `^.*?(\\d+)${escapeRegex(sanitizedAfter)}$`;
  } else {
    // Case 4: Dynamic content on both sides - need full precision
    // Build the complete pattern with all variables/prompts converted to regex
    regexPattern = buildFullMatchingPattern(titlePattern, settings);
  }

  return new RegExp(regexPattern);
}

/**
 * Represents a dynamic element (variable or prompt) found in a pattern
 */
interface DynamicElement {
  type: "variable" | "prompt";
  fullMatch: string;
  index: number;
  varName?: string;
  format?: string;
}

/**
 * Finds all dynamic elements (variables and prompts) in a pattern
 */
function findDynamicElements(pattern: string): DynamicElement[] {
  const elements: DynamicElement[] = [];

  // Find all variables: {{varName}} or {{varName:format}}
  const variableRegex = /\{\{(\w+)(?::([^}]+))?\}\}/g;
  let match;
  while ((match = variableRegex.exec(pattern)) !== null) {
    elements.push({
      type: "variable",
      fullMatch: match[0],
      index: match.index,
      varName: match[1],
      format: match[2],
    });
  }

  // Find all prompts: {% Prompt Name %}
  const promptRegex = /\{%\s*.+?\s*%\}/g;
  while ((match = promptRegex.exec(pattern)) !== null) {
    elements.push({
      type: "prompt",
      fullMatch: match[0],
      index: match.index,
    });
  }

  // Sort by position in the pattern
  elements.sort((a, b) => a.index - b.index);

  return elements;
}

/**
 * Builds a full matching pattern when dynamic content exists on both sides of counter.
 * This is the fallback for complex patterns where we need precision.
 * Handles both {{variables}} and {% prompts %}.
 */
function buildFullMatchingPattern(
  titlePattern: string,
  settings?: TemplatesSettings
): string {
  const elements = findDynamicElements(titlePattern);

  let regexPattern = "";
  let lastIndex = 0;

  for (const element of elements) {
    // Add escaped literal text before this element
    const literalText = titlePattern.slice(lastIndex, element.index);
    const sanitizedLiteral = sanitizeForPattern(literalText);
    regexPattern += escapeRegex(sanitizedLiteral);

    if (element.type === "variable" && element.varName) {
      const lowerName = element.varName.toLowerCase();

      // Get the regex pattern for this variable
      const varPattern = getVariableRegexPattern(element.varName, element.format, settings);

      if (lowerName === "counter") {
        // Counter becomes a capturing group
        regexPattern += `(${varPattern})`;
      } else {
        // Other variables are non-capturing
        regexPattern += varPattern;
      }
    } else if (element.type === "prompt") {
      // Prompts match any characters (non-greedy)
      regexPattern += ".*?";
    }

    lastIndex = element.index + element.fullMatch.length;
  }

  // Add any remaining literal text (sanitized)
  const remainingLiteral = titlePattern.slice(lastIndex);
  const sanitizedRemaining = sanitizeForPattern(remainingLiteral);
  regexPattern += escapeRegex(sanitizedRemaining);

  return `^${regexPattern}$`;
}

/**
 * Extracts the counter value from a filename using a matching pattern
 *
 * @param filename - The filename to extract from (without extension)
 * @param pattern - The regex pattern with a capturing group for the counter
 * @returns The extracted counter value, or null if no match
 */
export function extractCounterFromFilename(
  filename: string,
  pattern: RegExp
): number | null {
  const match = filename.match(pattern);

  if (match && match[1]) {
    const value = parseInt(match[1], 10);
    return isNaN(value) ? null : value;
  }

  return null;
}

/**
 * Gets all counter values from files in a folder that match a template pattern
 *
 * @param app - The Obsidian App instance
 * @param pattern - The regex pattern for matching files
 * @param folderPath - The folder path to scan
 * @returns Array of counter values found
 */
export function getCounterValuesFromFolder(
  app: App,
  pattern: RegExp,
  folderPath: string
): number[] {
  const normalizedPath = normalizePath(folderPath);

  // Handle root folder
  const folder =
    normalizedPath === "/" || normalizedPath === ""
      ? app.vault.getRoot()
      : app.vault.getAbstractFileByPath(normalizedPath);

  if (!(folder instanceof TFolder)) {
    return [];
  }

  const values: number[] = [];

  // Only scan direct children (not recursive)
  for (const child of folder.children) {
    if (child instanceof TFile && child.extension === "md") {
      const value = extractCounterFromFilename(child.basename, pattern);
      if (value !== null) {
        values.push(value);
      }
    }
  }

  return values;
}

/**
 * Gets the next counter value for a template by scanning existing files
 *
 * Scans the target folder for files matching the template pattern,
 * extracts their counter values, and returns the next value (max + 1).
 * If no matching files exist, returns the template's startsAt value.
 *
 * @param app - The Obsidian App instance
 * @param template - The title template configuration
 * @param targetFolder - The folder path to scan
 * @returns The next counter value to use
 */
export function getNextCounterValue(
  app: App,
  template: TitleTemplate,
  targetFolder: string
): number {
  // Default starting value
  const startsAt = template.counterStartsAt ?? 1;

  // Check if template has counter variable
  if (!hasCounterVariable(template.titlePattern)) {
    return startsAt;
  }

  // Get user's templates settings for date/time formats
  const templatesSettings = getTemplatesSettings(app);

  // Build matching pattern using user's date/time format settings
  const pattern = buildMatchingPattern(template.titlePattern, templatesSettings);
  if (!pattern) {
    return startsAt;
  }

  // Get counter values from existing files
  const values = getCounterValuesFromFolder(app, pattern, targetFolder);

  // If no matching files, return starting value
  if (values.length === 0) {
    return startsAt;
  }

  // Return max + 1
  return Math.max(...values) + 1;
}

/**
 * Counter Service class for dependency injection and testing
 */
export class CounterService {
  constructor(private app: App) {}

  /**
   * Gets the next counter value for a template
   *
   * @param template - The title template configuration
   * @param targetFolder - The folder path to scan
   * @returns The next counter value to use
   */
  getNextCounterValue(template: TitleTemplate, targetFolder: string): number {
    return getNextCounterValue(this.app, template, targetFolder);
  }

  /**
   * Builds a matching pattern for a template
   *
   * @param titlePattern - The title template pattern
   * @returns Compiled RegExp or null if no counter
   */
  buildMatchingPattern(titlePattern: string): RegExp | null {
    return buildMatchingPattern(titlePattern);
  }

  /**
   * Extracts counter value from a filename
   *
   * @param filename - The filename to extract from
   * @param pattern - The regex pattern
   * @returns The extracted counter value or null
   */
  extractCounterFromFilename(
    filename: string,
    pattern: RegExp
  ): number | null {
    return extractCounterFromFilename(filename, pattern);
  }
}
