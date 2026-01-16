/**
 * Type definitions for the New File Templates
 */

/**
 * Represents a user-defined prompt that will be filled in at file creation time
 */
export interface UserPrompt {
  /** Unique identifier for the prompt */
  id: string;
  /** Display name shown to user when prompting for value */
  name: string;
  /** Type of value expected: 'text' for any string, 'numeric' for numbers only */
  valueType: 'text' | 'numeric';
}

/**
 * Values collected from user for prompts at file creation time
 */
export interface PromptValues {
  [promptId: string]: string;
}

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
  /** Whether to process the file template with Templater plugin */
  useTemplater?: boolean;
  /** Starting value for {{counter}} variable when no matching files exist (default: 1) */
  counterStartsAt?: number;
  /** User-defined prompts that will be filled in at file creation time */
  userPrompts?: UserPrompt[];
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
  | "day"       // Current day
  | "counter";  // Auto-incrementing integer
