/**
 * Templater Service
 *
 * Handles integration with the Templater plugin for processing
 * templates that contain Templater syntax.
 */

import { App, TFile } from "obsidian";

/**
 * Interface representing the Templater plugin structure.
 * This is based on reverse-engineering Templater's internal API.
 */
interface TemplaterPluginInstance {
  templater: {
    overwrite_file_commands(file: TFile): Promise<void>;
    parse_template(
      config: { target_file: TFile; run_mode: number },
      content: string
    ): Promise<string>;
  };
  settings: {
    trigger_on_file_creation: boolean;
  };
}

/**
 * Regex pattern to detect Templater syntax in content.
 * Matches <% ... %> patterns including:
 * - <% tp.date.now() %>
 * - <%* javascript code %>
 * - Multi-line content
 */
const TEMPLATER_SYNTAX_PATTERN = /<%[\s\S]*?%>/;

/**
 * Gets the Templater plugin instance if installed.
 *
 * @param app - The Obsidian App instance
 * @returns The Templater plugin instance, or null if not installed
 */
export function getTemplaterPlugin(app: App): TemplaterPluginInstance | null {
  // @ts-ignore - Accessing internal plugin API
  const plugin = app.plugins?.plugins?.["templater-obsidian"];
  return plugin || null;
}

/**
 * Checks if the Templater plugin is installed and enabled.
 *
 * @param app - The Obsidian App instance
 * @returns True if Templater is available
 */
export function isTemplaterEnabled(app: App): boolean {
  return getTemplaterPlugin(app) !== null;
}

/**
 * Checks if content contains Templater syntax (<% ... %>).
 *
 * @param content - The content to check
 * @returns True if Templater syntax is detected
 */
export function hasTemplaterSyntax(content: string): boolean {
  if (!content) {
    return false;
  }
  return TEMPLATER_SYNTAX_PATTERN.test(content);
}

/**
 * Checks if Templater is configured to automatically process
 * files on creation.
 *
 * @param app - The Obsidian App instance
 * @returns True if Templater will auto-process new files
 */
export function doesTemplaterAutoProcess(app: App): boolean {
  const plugin = getTemplaterPlugin(app);
  return plugin?.settings?.trigger_on_file_creation ?? false;
}

/**
 * Checks a file for Templater syntax by reading its content.
 *
 * @param app - The Obsidian App instance
 * @param filePath - Path to the file to check
 * @returns True if the file contains Templater syntax
 */
export async function checkFileForTemplaterSyntax(
  app: App,
  filePath: string
): Promise<boolean> {
  if (!filePath) {
    return false;
  }

  // Defensive check for test environments where vault may not be fully mocked
  if (!app.vault?.getAbstractFileByPath) {
    return false;
  }

  const file = app.vault.getAbstractFileByPath(filePath);
  if (!(file instanceof TFile)) {
    return false;
  }

  try {
    const content = await app.vault.read(file);
    return hasTemplaterSyntax(content);
  } catch {
    return false;
  }
}

/**
 * Processes a file with Templater to evaluate its template syntax.
 *
 * @param app - The Obsidian App instance
 * @param file - The file to process
 * @throws Error if Templater processing fails
 */
export async function processTemplaterInFile(
  app: App,
  file: TFile
): Promise<void> {
  const plugin = getTemplaterPlugin(app);

  if (!plugin) {
    // Templater not available, skip silently
    return;
  }

  await plugin.templater.overwrite_file_commands(file);
}

/**
 * Determines the Templater status for a given file template.
 * Used by the UI to decide what to display.
 */
export interface TemplaterStatus {
  /** Whether the file template contains Templater syntax */
  hasTemplaterSyntax: boolean;
  /** Whether Templater plugin is installed */
  templaterAvailable: boolean;
  /** Whether Templater will auto-process on file creation */
  templaterAutoProcesses: boolean;
}

/**
 * Gets the Templater status for a file template.
 *
 * @param app - The Obsidian App instance
 * @param fileTemplatePath - Path to the file template (optional)
 * @returns The Templater status for UI decisions
 */
export async function getTemplaterStatus(
  app: App,
  fileTemplatePath?: string
): Promise<TemplaterStatus> {
  const templaterAvailable = isTemplaterEnabled(app);
  const templaterAutoProcesses = doesTemplaterAutoProcess(app);

  let hasSyntax = false;
  if (fileTemplatePath) {
    hasSyntax = await checkFileForTemplaterSyntax(app, fileTemplatePath);
  }

  return {
    hasTemplaterSyntax: hasSyntax,
    templaterAvailable,
    templaterAutoProcesses,
  };
}
