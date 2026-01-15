/**
 * Templates Integration Utility
 *
 * Provides integration with Obsidian's core Templates plugin,
 * including accessing user settings and processing template variables.
 */

import { App, moment } from "obsidian";

/**
 * Settings from the core Templates plugin
 */
export interface TemplatesSettings {
  /** Path to templates folder */
  folder: string;
  /** User's configured date format (moment.js) */
  dateFormat: string;
  /** User's configured time format (moment.js) */
  timeFormat: string;
}

/**
 * Default format values (same as Obsidian's defaults)
 */
export const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
export const DEFAULT_TIME_FORMAT = "HH:mm";

/**
 * Gets the Templates plugin settings from Obsidian's internal plugins API.
 *
 * Note: The `app.internalPlugins` API is not part of Obsidian's public API
 * and may change without notice. We use defensive coding with fallback defaults.
 *
 * @param app - The Obsidian App instance
 * @returns Templates settings with fallback defaults
 */
export function getTemplatesSettings(app: App): TemplatesSettings {
  try {
    // Access the internal plugins API (undocumented)
    const internalPlugins = (app as any).internalPlugins;
    if (!internalPlugins) {
      return getDefaultSettings();
    }

    const templatesPlugin = internalPlugins.getPluginById?.("templates");
    if (!templatesPlugin?.enabled) {
      return getDefaultSettings();
    }

    const options = templatesPlugin.instance?.options || {};

    return {
      folder: options.folder?.trim() || "",
      dateFormat: options.dateFormat || DEFAULT_DATE_FORMAT,
      timeFormat: options.timeFormat || DEFAULT_TIME_FORMAT,
    };
  } catch {
    // If anything fails, return defaults
    return getDefaultSettings();
  }
}

/**
 * Returns default settings when Templates plugin is unavailable
 */
function getDefaultSettings(): TemplatesSettings {
  return {
    folder: "",
    dateFormat: DEFAULT_DATE_FORMAT,
    timeFormat: DEFAULT_TIME_FORMAT,
  };
}

/**
 * Checks if the core Templates plugin is enabled
 *
 * @param app - The Obsidian App instance
 * @returns True if Templates plugin is enabled
 */
export function isTemplatesPluginEnabled(app: App): boolean {
  try {
    const internalPlugins = (app as any).internalPlugins;
    const templatesPlugin = internalPlugins?.getPluginById?.("templates");
    return templatesPlugin?.enabled === true;
  } catch {
    return false;
  }
}

/**
 * Processes template variables in content, matching Obsidian's Templates behavior.
 *
 * Supported variables:
 * - {{title}} - Note title (filename without extension)
 * - {{date}} - Current date in user's configured format
 * - {{date:FORMAT}} - Current date with custom moment.js format
 * - {{time}} - Current time in user's configured format
 * - {{time:FORMAT}} - Current time with custom moment.js format
 *
 * @param content - Template content with {{variable}} placeholders
 * @param title - The note title for {{title}} variable
 * @param settings - Templates settings (date/time formats)
 * @param targetDate - Optional date to use (defaults to now)
 * @returns Processed content with variables replaced
 */
export function processTemplateContent(
  content: string,
  title: string,
  settings: TemplatesSettings,
  targetDate?: moment.Moment
): string {
  const now = targetDate || moment();

  // Process {{title}}
  content = content.replace(/\{\{title\}\}/gi, title);

  // Process {{date}} and {{date:FORMAT}}
  content = content.replace(
    /\{\{date(?::([^}]+))?\}\}/gi,
    (_, customFormat) => {
      const format = customFormat || settings.dateFormat;
      return now.format(format);
    }
  );

  // Process {{time}} and {{time:FORMAT}}
  content = content.replace(
    /\{\{time(?::([^}]+))?\}\}/gi,
    (_, customFormat) => {
      const format = customFormat || settings.timeFormat;
      return now.format(format);
    }
  );

  return content;
}

/**
 * Default file-safe time format (uses hyphens instead of colons)
 */
export const DEFAULT_FILENAME_TIME_FORMAT = "HH-mm-ss";

/**
 * Parses a title template pattern using moment.js and user's Templates settings.
 *
 * Supported variables:
 * - {{date}} - Current date in user's configured format
 * - {{date:FORMAT}} - Current date with custom moment.js format
 * - {{time}} - Current time in file-safe format (HH-mm-ss)
 * - {{time:FORMAT}} - Current time with custom moment.js format
 * - {{datetime}} - Combined date and time
 * - {{timestamp}} - Unix timestamp in milliseconds
 *
 * @param pattern - Title pattern with {{variable}} placeholders
 * @param settings - Templates settings (date/time formats)
 * @param targetDate - Optional date to use (defaults to now)
 * @returns Parsed title string
 */
export function parseTitleTemplate(
  pattern: string,
  settings: TemplatesSettings,
  targetDate?: moment.Moment
): string {
  const now = targetDate || moment();

  let result = pattern;

  // Process {{datetime}} - combined date and time (file-safe)
  result = result.replace(/\{\{datetime\}\}/gi, () => {
    const dateStr = now.format(settings.dateFormat);
    const timeStr = now.format(DEFAULT_FILENAME_TIME_FORMAT);
    return `${dateStr}_${timeStr}`;
  });

  // Process {{timestamp}} - Unix timestamp
  result = result.replace(/\{\{timestamp\}\}/gi, () => {
    return String(now.valueOf());
  });

  // Process {{date}} and {{date:FORMAT}}
  result = result.replace(
    /\{\{date(?::([^}]+))?\}\}/gi,
    (_, customFormat) => {
      const format = customFormat || settings.dateFormat;
      return now.format(format);
    }
  );

  // Process {{time}} and {{time:FORMAT}}
  // Default time format for filenames uses hyphens (file-safe)
  result = result.replace(
    /\{\{time(?::([^}]+))?\}\}/gi,
    (_, customFormat) => {
      const format = customFormat || DEFAULT_FILENAME_TIME_FORMAT;
      return now.format(format);
    }
  );

  return result;
}

/**
 * Sanitizes a filename by replacing or removing invalid characters
 *
 * Character handling:
 * - : replaced with ⦂ (two dot punctuation U+2982)
 * - | replaced with ∣ (divides U+2223)
 * - * " \ / < > ? and control characters are removed
 *
 * @param filename - The filename to sanitize
 * @returns Sanitized filename safe for file systems
 */
export function sanitizeForFilename(filename: string): string {
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
 * Parses a title template pattern and returns a sanitized, file-safe result
 *
 * @param pattern - Title pattern with {{variable}} placeholders
 * @param settings - Templates settings (date/time formats)
 * @param targetDate - Optional date to use (defaults to now)
 * @returns Sanitized filename safe for file systems
 */
export function parseTitleTemplateToFilename(
  pattern: string,
  settings: TemplatesSettings,
  targetDate?: moment.Moment
): string {
  const parsed = parseTitleTemplate(pattern, settings, targetDate);
  return sanitizeForFilename(parsed);
}
