/**
 * Prompt Parser Utility
 *
 * Parses user prompt placeholders in title patterns.
 * Prompts use the syntax: {% Prompt Name %}
 * Unlike built-in variables ({{var}}), prompts require user input at file creation time.
 */

import { UserPrompt, PromptValues } from "../types";
import { isValidDate, isValidTime, isValidDateTime } from "./dateTimeUtils";

/**
 * Regular expression to match user prompts: {% Prompt Name %}
 * Captures the prompt name (trimmed of whitespace)
 * Note: Use PROMPT_PATTERN_GLOBAL for operations that need the 'g' flag
 */
const PROMPT_PATTERN = /\{%\s*(.+?)\s*%\}/;
const PROMPT_PATTERN_GLOBAL = /\{%\s*(.+?)\s*%\}/g;

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
 * Extracts all user prompts from a title pattern
 *
 * @param pattern - The title pattern containing {% Prompt Name %} placeholders
 * @returns Array of UserPrompt objects with unique IDs
 *
 * @example
 * extractPrompts("{% Author %}-{% Title %}") // [{id: "...", name: "Author", valueType: "text"}, ...]
 */
export function extractPrompts(pattern: string): UserPrompt[] {
  const prompts: UserPrompt[] = [];
  const seenNames = new Set<string>();

  let match;
  const regex = new RegExp(PROMPT_PATTERN_GLOBAL);
  while ((match = regex.exec(pattern)) !== null) {
    const name = match[1].trim();
    // Skip duplicates (same prompt name used multiple times)
    if (!seenNames.has(name.toLowerCase())) {
      seenNames.add(name.toLowerCase());
      prompts.push({
        id: generatePromptId(),
        name: name,
        valueType: "text", // Default to text, can be changed in settings
      });
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
    names.add(match[1].trim().toLowerCase());
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

  return pattern.replace(PROMPT_PATTERN_GLOBAL, (match, promptName: string) => {
    const name = promptName.trim().toLowerCase();
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

  return pattern.replace(PROMPT_PATTERN_GLOBAL, (match, promptName: string) => {
    const name = promptName.trim().toLowerCase();
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
  // Check for empty value
  if (!value || value.trim() === "") {
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

  return { valid: true };
}

/**
 * Creates the prompt syntax string for insertion into a pattern
 *
 * @param name - The prompt name
 * @returns Formatted prompt syntax string
 */
export function createPromptSyntax(name: string): string {
  return `{% ${name} %}`;
}

/**
 * Syncs the userPrompts array with prompts found in the pattern
 * Preserves existing prompt configurations (like valueType) where names match
 *
 * @param pattern - The title pattern
 * @param existingPrompts - Existing prompt configurations
 * @returns Updated array of prompts matching the pattern
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
    if (existing) {
      // Preserve existing ID, valueType, and format config
      return {
        ...newPrompt,
        id: existing.id,
        valueType: existing.valueType,
        dateConfig: existing.dateConfig,
        timeConfig: existing.timeConfig,
      };
    }
    return newPrompt;
  });
}
