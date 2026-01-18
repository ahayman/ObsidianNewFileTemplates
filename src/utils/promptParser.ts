/**
 * Prompt Parser Utility
 *
 * Parses user prompt placeholders in title patterns.
 * Prompts use the syntax: {% Prompt Name %} or {% Prompt Name:type:format %}
 * Optional prompts use: {%? Prompt Name ?%} or {%? Prompt Name:type:format ?%}
 * Unlike built-in variables ({{var}}), prompts require user input at file creation time.
 *
 * Extended syntax examples:
 * - {% Event Name:text %}         - Required text input
 * - {% Event No:number %}         - Required numeric input
 * - {% Date:date:ISO %}           - Required date with ISO preset
 * - {%? Subtitle ?%}              - Optional text input
 * - {%? Date:date:ISO ?%}         - Optional date with ISO preset
 * - {% Date:datetime:format(MMM YYYY DD, H:mm:ss A) %} - Custom format
 */

import {
  UserPrompt,
  PromptValues,
  ParsedPromptSyntax,
  DATE_FORMAT_PRESETS,
  TIME_FORMAT_PRESETS,
  VALUE_TYPE_ALIASES,
  DateOutputFormat,
  TimeOutputFormat,
  PromptValueType
} from "../types";
import { isValidDate, isValidTime, isValidDateTime } from "./dateTimeUtils";

/**
 * Regular expression to match user prompts:
 * - Required: {% Prompt Name %} or {% Name:type:format %}
 * - Optional: {%? Prompt Name ?%} or {%? Name:type:format ?%}
 *
 * Capture groups:
 * - Group 1: Optional marker "?" (present if optional)
 * - Group 2: Content between markers
 * - Group 3: Closing optional marker "?" (present if optional)
 *
 * Note: Use PROMPT_PATTERN_GLOBAL for operations that need the 'g' flag
 */
const PROMPT_PATTERN = /\{%(\??)\s*(.+?)\s*(\??)%\}/;
const PROMPT_PATTERN_GLOBAL = /\{%(\??)\s*(.+?)\s*(\??)%\}/g;

/**
 * Characters that are invalid in filenames and should be disallowed in prompt values
 */
const INVALID_FILENAME_CHARS = /[*"\\/<>?|:\x00-\x1f]/g;

/**
 * Generates a unique ID for a new prompt
 */
export function generatePromptId(): string {
  return `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Parses the content of a prompt placeholder to extract name, type, and format
 *
 * Supports the following syntax formats:
 * - "Name"                          -> text type, no format
 * - "Name:type"                     -> specified type, no format
 * - "Name:type:preset"              -> specified type with preset format
 * - "Name:type:preset1,preset2"     -> datetime with separate date/time presets
 * - "Name:type:format(...)"         -> custom format string
 *
 * @param rawContent - The raw content between {% and %} (or {%? and ?%})
 * @param isOptional - Whether this prompt is optional (from {%? ?%} syntax)
 * @returns Parsed prompt syntax with name, type, and format configuration
 */
export function parsePromptSyntax(rawContent: string, isOptional: boolean = false): ParsedPromptSyntax {
  const content = rawContent.trim();

  // Check for custom format syntax: format(...)
  const customFormatMatch = content.match(/^([^:]+):(\w+):format\((.+)\)$/);
  if (customFormatMatch) {
    const [, name, typeStr, customFormat] = customFormatMatch;
    const valueType = VALUE_TYPE_ALIASES[typeStr.toLowerCase()] || 'text';

    const result: ParsedPromptSyntax = {
      name: name.trim(),
      valueType,
      customFormat: customFormat,
            isOptional,
    };

    // For custom format, we set the format to 'custom' and store the custom string
    if (valueType === 'date') {
      result.dateFormat = 'custom';
    } else if (valueType === 'time') {
      result.timeFormat = 'custom';
    } else if (valueType === 'datetime') {
      // Single custom format applies to both date and time
      result.dateFormat = 'custom';
      result.timeFormat = 'custom';
    }

    return result;
  }

  // Split by colon to get parts, but only the first two colons matter for name:type:format
  // The format part might contain colons (e.g., time formats like HH:mm)
  const firstColonIdx = content.indexOf(':');

  // No colon - just a name
  if (firstColonIdx === -1) {
    return {
      name: content,
      valueType: 'text',
            isOptional,
    };
  }

  const name = content.substring(0, firstColonIdx).trim();
  const rest = content.substring(firstColonIdx + 1);

  // Find the second colon (if any) for the format part
  const secondColonIdx = rest.indexOf(':');

  // Only type specified, no format
  if (secondColonIdx === -1) {
    const typeStr = rest.trim();
    const valueType = VALUE_TYPE_ALIASES[typeStr.toLowerCase()] || 'text';
    return {
      name,
      valueType,
      isOptional,
    };
  }

  const typeStr = rest.substring(0, secondColonIdx).trim();
  const formatStr = rest.substring(secondColonIdx + 1).trim();
  const valueType = VALUE_TYPE_ALIASES[typeStr.toLowerCase()] || 'text';

  const result: ParsedPromptSyntax = {
    name,
    valueType,
        isOptional,
  };

  // Parse format based on type
  if (valueType === 'date') {
    // Single preset for date
    const dateFormat = DATE_FORMAT_PRESETS[formatStr];
    if (dateFormat) {
      result.dateFormat = dateFormat;
    } else {
      // Try to match as direct format string
      result.dateFormat = formatStr as DateOutputFormat;
    }
  } else if (valueType === 'time') {
    // Single preset for time
    const timeFormat = TIME_FORMAT_PRESETS[formatStr];
    if (timeFormat) {
      result.timeFormat = timeFormat;
    } else {
      // Try to match as direct format string
      result.timeFormat = formatStr as TimeOutputFormat;
    }
  } else if (valueType === 'datetime') {
    // Check for comma-separated presets (date,time)
    if (formatStr.includes(',')) {
      const [datePreset, timePreset] = formatStr.split(',').map(s => s.trim());
      result.dateFormat = DATE_FORMAT_PRESETS[datePreset] || (datePreset as DateOutputFormat);
      result.timeFormat = TIME_FORMAT_PRESETS[timePreset] || (timePreset as TimeOutputFormat);
    } else {
      // Single preset applies to both (using same preset name)
      result.dateFormat = DATE_FORMAT_PRESETS[formatStr] || (formatStr as DateOutputFormat);
      result.timeFormat = TIME_FORMAT_PRESETS[formatStr] || (formatStr as TimeOutputFormat);
    }
  }

  return result;
}

/**
 * Gets just the prompt name from a raw content string
 * Used for comparison/matching when the full parsed config isn't needed
 */
export function getPromptName(rawContent: string): string {
  const content = rawContent.trim();
  const colonIdx = content.indexOf(':');
  if (colonIdx === -1) {
    return content;
  }
  return content.substring(0, colonIdx).trim();
}

/**
 * Extracts all user prompts from a title pattern
 *
 * @param pattern - The title pattern containing {% Prompt Name %} or {%? Optional ?%} placeholders
 * @returns Array of UserPrompt objects with unique IDs
 *
 * @example
 * extractPrompts("{% Author %}-{% Title %}") // [{id: "...", name: "Author", valueType: "text"}, ...]
 * extractPrompts("{% Date:date:ISO %}") // [{id: "...", name: "Date", valueType: "date", dateConfig: {...}}]
 * extractPrompts("{%? Subtitle ?%}") // [{id: "...", name: "Subtitle", isOptional: true}, ...]
 */
export function extractPrompts(pattern: string): UserPrompt[] {
  const prompts: UserPrompt[] = [];
  const seenNames = new Set<string>();

  let match;
  const regex = new RegExp(PROMPT_PATTERN_GLOBAL);
  while ((match = regex.exec(pattern)) !== null) {
    // Capture groups: [0]=full match, [1]=opening "?", [2]=content, [3]=closing "?"
    const openingMarker = match[1];
    const rawContent = match[2];
    const closingMarker = match[3];

    // Prompt is optional if both markers are "?"
    const isOptional = openingMarker === '?' && closingMarker === '?';

    const parsed = parsePromptSyntax(rawContent, isOptional);

    // Skip duplicates (same prompt name used multiple times)
    if (!seenNames.has(parsed.name.toLowerCase())) {
      seenNames.add(parsed.name.toLowerCase());

      const prompt: UserPrompt = {
        id: generatePromptId(),
        name: parsed.name,
        valueType: parsed.valueType,
        isOptional: parsed.isOptional,
      };

      // Add date config if applicable
      if (parsed.valueType === 'date' || parsed.valueType === 'datetime') {
        prompt.dateConfig = {
          outputFormat: parsed.dateFormat,
          customFormat: parsed.customFormat,
        };
      }

      // Add time config if applicable
      if (parsed.valueType === 'time' || parsed.valueType === 'datetime') {
        prompt.timeConfig = {
          outputFormat: parsed.timeFormat,
          customFormat: parsed.customFormat,
        };
      }

      prompts.push(prompt);
    }
  }

  return prompts;
}

/**
 * Checks if a pattern contains any user prompts
 *
 * @param pattern - The title pattern to check
 * @returns true if the pattern contains {% %} syntax
 */
export function hasPrompts(pattern: string): boolean {
  return PROMPT_PATTERN.test(pattern);
}

/**
 * Counts the number of unique prompts in a pattern
 *
 * @param pattern - The title pattern to check
 * @returns Number of unique prompt placeholders
 */
export function countPrompts(pattern: string): number {
  const names = new Set<string>();
  let match;
  const regex = new RegExp(PROMPT_PATTERN_GLOBAL);
  while ((match = regex.exec(pattern)) !== null) {
    // Group 2 is the content (group 1 and 3 are optional markers)
    const name = getPromptName(match[2]);
    names.add(name.toLowerCase());
  }
  return names.size;
}

/**
 * Substitutes user prompt placeholders with their values
 *
 * @param pattern - The title pattern containing {% Prompt Name %} placeholders
 * @param prompts - Array of UserPrompt objects with their IDs
 * @param values - Map of prompt IDs to user-entered values
 * @returns Pattern with prompts replaced by their values
 *
 * @example
 * const prompts = [{id: "1", name: "Author", valueType: "text"}];
 * const values = {"1": "John"};
 * substitutePrompts("{% Author %}-Book", prompts, values) // "John-Book"
 */
export function substitutePrompts(
  pattern: string,
  prompts: UserPrompt[],
  values: PromptValues
): string {
  // Create a map from prompt name (lowercase) to its value
  const nameToValue = new Map<string, string>();
  for (const prompt of prompts) {
    const value = values[prompt.id];
    if (value !== undefined) {
      nameToValue.set(prompt.name.toLowerCase(), value);
    }
  }

  // Callback receives: match, group1 (open marker), group2 (content), group3 (close marker)
  return pattern.replace(PROMPT_PATTERN_GLOBAL, (match, _openMarker: string, rawContent: string) => {
    const name = getPromptName(rawContent).toLowerCase();
    const value = nameToValue.get(name);
    if (value !== undefined) {
      return value;
    }
    // Return empty string if no value provided (or keep placeholder for preview)
    return "";
  });
}

/**
 * Generates a preview of the pattern with prompt values
 * Shows placeholder text for unfilled prompts
 *
 * @param pattern - The title pattern
 * @param prompts - Array of UserPrompt objects
 * @param values - Map of prompt IDs to values (may be partial)
 * @returns Preview string with filled values and placeholders for unfilled
 */
export function previewWithPrompts(
  pattern: string,
  prompts: UserPrompt[],
  values: PromptValues
): string {
  const nameToValue = new Map<string, string>();
  const nameToPrompt = new Map<string, UserPrompt>();

  for (const prompt of prompts) {
    nameToPrompt.set(prompt.name.toLowerCase(), prompt);
    const value = values[prompt.id];
    if (value !== undefined && value !== "") {
      nameToValue.set(prompt.name.toLowerCase(), value);
    }
  }

  // Callback receives: match, group1 (open marker), group2 (content), group3 (close marker)
  return pattern.replace(PROMPT_PATTERN_GLOBAL, (match, _openMarker: string, rawContent: string) => {
    const name = getPromptName(rawContent).toLowerCase();
    const value = nameToValue.get(name);
    if (value !== undefined) {
      return value;
    }
    // Show placeholder for unfilled prompts
    const prompt = nameToPrompt.get(name);
    if (prompt) {
      return `[${prompt.name}]`;
    }
    return match;
  });
}

/**
 * Validation result for prompt values
 */
export interface PromptValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a single prompt value
 *
 * @param value - The value to validate
 * @param prompt - The prompt configuration
 * @returns Validation result
 */
export function validatePromptValue(
  value: string,
  prompt: UserPrompt
): PromptValidationResult {
  // Check for empty value - optional prompts allow empty
  if (!value || value.trim() === "") {
    if (prompt.isOptional) {
      return { valid: true };
    }
    return {
      valid: false,
      error: "Value cannot be empty",
    };
  }

  // Type-specific validation
  switch (prompt.valueType) {
    case "numeric": {
      const num = Number(value);
      if (isNaN(num)) {
        return {
          valid: false,
          error: "Value must be a number",
        };
      }
      break;
    }

    case "date": {
      if (!isValidDate(value)) {
        return {
          valid: false,
          error: "Must be a valid date (YYYY-MM-DD)",
        };
      }
      break;
    }

    case "time": {
      if (!isValidTime(value)) {
        return {
          valid: false,
          error: "Must be a valid time (HH:MM)",
        };
      }
      break;
    }

    case "datetime": {
      if (!isValidDateTime(value)) {
        return {
          valid: false,
          error: "Must be a valid date and time",
        };
      }
      break;
    }
  }

  // Check for invalid filename characters (skip for date/time/datetime as they use safe formats)
  if (prompt.valueType === "text" || prompt.valueType === "numeric") {
    if (INVALID_FILENAME_CHARS.test(value)) {
      return {
        valid: false,
        error: "Value contains invalid characters (* \" \\ / < > ? | :)",
      };
    }
  }

  return { valid: true };
}

/**
 * Validates all prompt values
 *
 * @param prompts - Array of UserPrompt objects
 * @param values - Map of prompt IDs to values
 * @returns Object with validation results for each prompt
 */
export function validateAllPromptValues(
  prompts: UserPrompt[],
  values: PromptValues
): Map<string, PromptValidationResult> {
  const results = new Map<string, PromptValidationResult>();

  for (const prompt of prompts) {
    const value = values[prompt.id] ?? "";
    results.set(prompt.id, validatePromptValue(value, prompt));
  }

  return results;
}

/**
 * Checks if all prompts have valid values
 *
 * @param prompts - Array of UserPrompt objects
 * @param values - Map of prompt IDs to values
 * @returns true if all prompts have valid values
 */
export function allPromptsValid(
  prompts: UserPrompt[],
  values: PromptValues
): boolean {
  for (const prompt of prompts) {
    const value = values[prompt.id] ?? "";
    const result = validatePromptValue(value, prompt);
    if (!result.valid) {
      return false;
    }
  }
  return true;
}

/**
 * Sanitizes a prompt value by removing invalid filename characters
 *
 * @param value - The value to sanitize
 * @returns Sanitized value safe for filenames
 */
export function sanitizePromptValue(value: string): string {
  return value
    .replace(INVALID_FILENAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates a prompt name
 *
 * @param name - The prompt name to validate
 * @returns Validation result
 */
export function validatePromptName(name: string): PromptValidationResult {
  if (!name || name.trim() === "") {
    return {
      valid: false,
      error: "Prompt name cannot be empty",
    };
  }

  // Check for special characters that might break the syntax
  if (name.includes("%") || name.includes("{") || name.includes("}")) {
    return {
      valid: false,
      error: "Prompt name cannot contain %, {, or }",
    };
  }

  // Colons are used as delimiters in the extended syntax
  if (name.includes(":")) {
    return {
      valid: false,
      error: "Prompt name cannot contain colons (:)",
    };
  }

  return { valid: true };
}

/**
 * Reverse mapping from date format strings to preset names
 */
const DATE_FORMAT_TO_PRESET: Record<string, string> = {
  'YYYY-MM-DD': 'ISO',
  'YYYYMMDD': 'compact',
  'MM-DD-YYYY': 'US',
  'DD-MM-YYYY': 'EU',
  'MMM DD, YYYY': 'short',
  'MMMM DD, YYYY': 'long',
};

/**
 * Reverse mapping from time format strings to preset names
 */
const TIME_FORMAT_TO_PRESET: Record<string, string> = {
  'HH:mm:ss': 'ISO',
  'HH:mm': '24-hour',
  'HHmm': '24-compact',
  'h:mm A': '12-hour',
  'hh:mm A': '12-padded',
};

/**
 * Mapping from valueType to syntax type keyword
 */
const VALUE_TYPE_TO_SYNTAX: Record<string, string> = {
  'text': 'text',
  'numeric': 'number',
  'date': 'date',
  'time': 'time',
  'datetime': 'datetime',
};

/**
 * Creates the prompt syntax string for insertion into a pattern
 * Always includes type and format for full configuration
 *
 * @param name - The prompt name
 * @param isOptional - Whether the prompt should be optional
 * @returns Formatted prompt syntax string (simple form)
 * @deprecated Use createFullPromptSyntax for full configuration
 */
export function createPromptSyntax(name: string, isOptional: boolean = false): string {
  if (isOptional) {
    return `{%? ${name} ?%}`;
  }
  return `{% ${name} %}`;
}

/**
 * Creates the full prompt syntax string with type and format
 *
 * @param prompt - The UserPrompt configuration
 * @returns Full formatted prompt syntax string
 *
 * @example
 * createFullPromptSyntax({ name: "Author", valueType: "text" }) // "{% Author:text %}"
 * createFullPromptSyntax({ name: "Count", valueType: "numeric" }) // "{% Count:number %}"
 * createFullPromptSyntax({ name: "Date", valueType: "date", dateConfig: { outputFormat: "YYYY-MM-DD" }}) // "{% Date:date:ISO %}"
 */
export function createFullPromptSyntax(prompt: UserPrompt): string {
  const typeKeyword = VALUE_TYPE_TO_SYNTAX[prompt.valueType] || 'text';
  let formatPart = '';

  if (prompt.valueType === 'date') {
    const outputFormat = prompt.dateConfig?.outputFormat;
    if (outputFormat === 'custom' && prompt.dateConfig?.customFormat) {
      formatPart = `:format(${prompt.dateConfig.customFormat})`;
    } else if (outputFormat) {
      const preset = DATE_FORMAT_TO_PRESET[outputFormat];
      if (preset) {
        formatPart = `:${preset}`;
      }
    }
  } else if (prompt.valueType === 'time') {
    const outputFormat = prompt.timeConfig?.outputFormat;
    if (outputFormat === 'custom' && prompt.timeConfig?.customFormat) {
      formatPart = `:format(${prompt.timeConfig.customFormat})`;
    } else if (outputFormat) {
      const preset = TIME_FORMAT_TO_PRESET[outputFormat];
      if (preset) {
        formatPart = `:${preset}`;
      }
    }
  } else if (prompt.valueType === 'datetime') {
    const dateFormat = prompt.dateConfig?.outputFormat;
    const timeFormat = prompt.timeConfig?.outputFormat;
    const dateCustom = prompt.dateConfig?.customFormat;
    const timeCustom = prompt.timeConfig?.customFormat;

    // Check for single custom format (both custom with same format)
    if (dateFormat === 'custom' && timeFormat === 'custom' && dateCustom && dateCustom === timeCustom) {
      formatPart = `:format(${dateCustom})`;
    } else {
      // Build separate date and time presets
      let datePart = '';
      let timePart = '';

      if (dateFormat === 'custom' && dateCustom) {
        datePart = `format(${dateCustom})`;
      } else if (dateFormat) {
        datePart = DATE_FORMAT_TO_PRESET[dateFormat] || '';
      }

      if (timeFormat === 'custom' && timeCustom) {
        timePart = `format(${timeCustom})`;
      } else if (timeFormat) {
        timePart = TIME_FORMAT_TO_PRESET[timeFormat] || '';
      }

      if (datePart && timePart) {
        formatPart = `:${datePart},${timePart}`;
      } else if (datePart) {
        formatPart = `:${datePart}`;
      } else if (timePart) {
        formatPart = `:${timePart}`;
      }
    }
  }

  const content = `${prompt.name}:${typeKeyword}${formatPart}`;

  if (prompt.isOptional) {
    return `{%? ${content} ?%}`;
  }
  return `{% ${content} %}`;
}

/**
 * Regular expression to match fenced code blocks (``` or ~~~)
 * Used to exclude prompts inside code blocks from processing
 */
const CODE_BLOCK_PATTERN = /^(`{3,}|~{3,}).*$[\s\S]*?^\1\s*$/gm;

/**
 * Removes code blocks from content for prompt processing
 * Returns content with code blocks replaced by placeholders
 */
function removeCodeBlocks(content: string): { cleanContent: string; codeBlocks: string[] } {
  const codeBlocks: string[] = [];
  const cleanContent = content.replace(CODE_BLOCK_PATTERN, (match) => {
    const index = codeBlocks.length;
    codeBlocks.push(match);
    return `__CODE_BLOCK_${index}__`;
  });
  return { cleanContent, codeBlocks };
}

/**
 * Restores code blocks that were removed for processing
 */
function restoreCodeBlocks(content: string, codeBlocks: string[]): string {
  let result = content;
  for (let i = 0; i < codeBlocks.length; i++) {
    result = result.replace(`__CODE_BLOCK_${i}__`, codeBlocks[i]);
  }
  return result;
}

/**
 * Extracts all user prompts from file content
 * Similar to extractPrompts but ignores prompts inside code blocks
 *
 * @param content - The file content containing {% Prompt Name %} placeholders
 * @returns Array of UserPrompt objects with unique IDs
 *
 * @example
 * extractPromptsFromContent("Hello {% Name %}") // [{id: "...", name: "Name", valueType: "text"}]
 * extractPromptsFromContent("```\n{% Code %}\n```\n{% Name %}") // [{id: "...", name: "Name", ...}] (Code ignored)
 */
export function extractPromptsFromContent(content: string): UserPrompt[] {
  // Remove code blocks before extracting prompts
  const { cleanContent } = removeCodeBlocks(content);

  // Use the existing extractPrompts function on cleaned content
  return extractPrompts(cleanContent);
}

/**
 * Checks if file content contains any user prompts (outside of code blocks)
 *
 * @param content - The file content to check
 * @returns true if the content contains {% %} syntax outside code blocks
 */
export function hasPromptsInContent(content: string): boolean {
  const { cleanContent } = removeCodeBlocks(content);
  return hasPrompts(cleanContent);
}

/**
 * Substitutes user prompt placeholders with their values in file content
 * Preserves prompts inside code blocks (doesn't substitute them)
 *
 * @param content - The file content containing {% Prompt Name %} placeholders
 * @param prompts - Array of UserPrompt objects with their IDs
 * @param values - Map of prompt IDs to user-entered values
 * @returns Content with prompts replaced by their values (code blocks preserved)
 *
 * @example
 * const prompts = [{id: "1", name: "Name", valueType: "text"}];
 * const values = {"1": "John"};
 * substitutePromptsInContent("Hello {% Name %}", prompts, values) // "Hello John"
 */
export function substitutePromptsInContent(
  content: string,
  prompts: UserPrompt[],
  values: PromptValues
): string {
  // Remove code blocks to protect them
  const { cleanContent, codeBlocks } = removeCodeBlocks(content);

  // Substitute prompts in the cleaned content
  const substituted = substitutePrompts(cleanContent, prompts, values);

  // Restore code blocks
  return restoreCodeBlocks(substituted, codeBlocks);
}

/**
 * Creates a regex pattern that matches a specific prompt by name
 * Matches all variations: {% Name %}, {% Name:type %}, {% Name:type:format %}, {%? Name ?%}
 *
 * @param name - The prompt name to match
 * @returns RegExp that matches the prompt syntax
 */
function createPromptMatchRegex(name: string): RegExp {
  // Escape special regex characters in the name
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match both required and optional forms with any inline configuration
  // Captures the full prompt syntax including {% %} or {%? ?%}
  return new RegExp(`\\{%\\??\\s*${escapedName}(?:\\s*:[^%]*)?\\s*\\??%\\}`, 'gi');
}

/**
 * Replaces a prompt's syntax in the pattern with new syntax
 * Handles all variations and multiple occurrences of the same prompt name
 *
 * @param pattern - The title pattern containing prompt syntax
 * @param oldName - The name of the prompt to replace
 * @param newSyntax - The new syntax to insert (from createFullPromptSyntax)
 * @returns Pattern with prompt syntax replaced
 *
 * @example
 * replacePromptSyntax("{% Author %} - {% Title %}", "Author", "{% Author:text %}")
 * // "{% Author:text %} - {% Title %}"
 */
export function replacePromptSyntax(
  pattern: string,
  oldName: string,
  newSyntax: string
): string {
  const regex = createPromptMatchRegex(oldName);
  // Replace only the first occurrence (each prompt name should appear once for editing)
  // But the regex is global to handle case insensitivity
  let replaced = false;
  return pattern.replace(regex, (match) => {
    if (!replaced) {
      replaced = true;
      return newSyntax;
    }
    // For subsequent occurrences, also replace (they should all use the same config)
    return newSyntax;
  });
}

/**
 * Removes a prompt's syntax from the pattern
 * Handles all variations of the prompt syntax
 *
 * @param pattern - The title pattern containing prompt syntax
 * @param name - The name of the prompt to remove
 * @returns Pattern with prompt syntax removed
 *
 * @example
 * removePromptSyntax("{% Author %} - {% Title %}", "Author")
 * // " - {% Title %}"
 */
export function removePromptSyntax(pattern: string, name: string): string {
  const regex = createPromptMatchRegex(name);
  return pattern.replace(regex, '');
}

/**
 * Syncs prompts with the pattern, preserving IDs from existing prompts where names match.
 * The pattern is the single source of truth for all prompt configuration.
 *
 * @param pattern - The title pattern (source of truth)
 * @param existingPrompts - Optional existing prompts to preserve IDs from
 * @returns Array of prompts derived from the pattern
 */
export function syncPromptsWithPattern(
  pattern: string,
  existingPrompts: UserPrompt[] = []
): UserPrompt[] {
  const patternPrompts = extractPrompts(pattern);
  const existingByName = new Map<string, UserPrompt>();

  for (const prompt of existingPrompts) {
    existingByName.set(prompt.name.toLowerCase(), prompt);
  }

  return patternPrompts.map((newPrompt) => {
    const existing = existingByName.get(newPrompt.name.toLowerCase());

    if (!existing) {
      // New prompt - use the parsed configuration from the pattern
      return newPrompt;
    }

    // Preserve the existing ID, but use all configuration from the pattern
    return {
      ...newPrompt,
      id: existing.id,
    };
  });
}
