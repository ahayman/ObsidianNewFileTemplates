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
  /** Type of value expected */
  valueType: 'text' | 'numeric' | 'date' | 'time' | 'datetime';
  /** Optional configuration for date prompts */
  dateConfig?: {
    /** Output format for date value inserted into filename */
    outputFormat?: DateOutputFormat;
    /** Custom format string when outputFormat is 'custom' */
    customFormat?: string;
  };
  /** Optional configuration for time prompts */
  timeConfig?: {
    /** Output format for time value inserted into filename */
    outputFormat?: TimeOutputFormat;
    /** Custom format string when outputFormat is 'custom' */
    customFormat?: string;
  };
}

/**
 * Available date output formats for filenames
 */
export type DateOutputFormat =
  | 'YYYY-MM-DD'      // 2026-01-16 (ISO, default, sorts well)
  | 'YYYYMMDD'        // 20260116 (compact)
  | 'MM-DD-YYYY'      // 01-16-2026 (US style)
  | 'DD-MM-YYYY'      // 16-01-2026 (European style)
  | 'MMM DD, YYYY'    // Jan 16, 2026 (readable)
  | 'MMMM DD, YYYY'   // January 16, 2026 (full month)
  | 'custom';         // User-defined format

/**
 * Available time output formats for filenames
 * Note: Colons are automatically converted to ⦂ (two dot punctuation) when saving
 */
export type TimeOutputFormat =
  | 'HH:mm'           // 14:30 (24h)
  | 'HHmm'            // 1430 (24h compact)
  | 'h:mm A'          // 2:30 PM (12h, default)
  | 'hh:mm A'         // 02:30 PM (12h padded)
  | 'custom';         // User-defined format

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
