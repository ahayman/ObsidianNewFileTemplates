/**
 * Type definitions for the File Template Plugin
 */

/**
 * Represents a title template configuration
 */
export interface TitleTemplate {
  /** Unique identifier for the template */
  id: string;
  /** Display name shown in UI and command palette */
  name: string;
  /** Pattern for generating the file title (e.g., "{{date}}-{{title}}") */
  titlePattern: string;
  /** Target folder path or "current" for active folder */
  folder: string;
  /** Optional path to a file template to apply */
  fileTemplate?: string;
}

/**
 * Plugin settings structure
 */
export interface PluginSettings {
  /** List of user-defined title templates */
  templates: TitleTemplate[];
  /** Default folder for templates (used in file picker) */
  templateFolder: string;
}

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: PluginSettings = {
  templates: [],
  templateFolder: "Templates",
};

/**
 * Supported template variables for title patterns
 */
export type TemplateVariable =
  | "date"      // Current date (YYYY-MM-DD)
  | "time"      // Current time (HH:mm:ss)
  | "datetime"  // Combined date and time
  | "title"     // User-provided title
  | "timestamp" // Unix timestamp
  | "year"      // Current year
  | "month"     // Current month
  | "day";      // Current day
