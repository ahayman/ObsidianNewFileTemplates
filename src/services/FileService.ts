/**
 * File Service
 *
 * Handles file creation, template content retrieval, and file system operations
 * for the New File Templates.
 */

import { App, TFile, TFolder, TAbstractFile, normalizePath, moment } from "obsidian";
import { sanitizeFilename } from "../utils/templateParser";
import {
  getTemplatesSettings,
  processTemplateContent,
  TemplatesSettings,
} from "../utils/templatesIntegration";

/**
 * Variables supported in file template content
 */
export interface FileTemplateVariables {
  title: string;
  date: string;
  time: string;
  datetime: string;
  timestamp: string;
  year: string;
  month: string;
  day: string;
}

/**
 * Result of a file creation operation
 */
export interface CreateFileResult {
  file: TFile;
  /** The final filename used (may differ from requested if conflict occurred) */
  finalFilename: string;
  /** Whether a conflict was resolved by appending a number */
  conflictResolved: boolean;
}

/**
 * Service class for file operations
 */
export class FileService {
  constructor(private app: App) {}

  /**
   * Creates a new file in the specified folder with optional content
   *
   * @param folderPath - The folder path where the file should be created
   * @param filename - The desired filename (without extension)
   * @param content - Optional content for the file
   * @returns The created file and metadata about the creation
   */
  async createFile(
    folderPath: string,
    filename: string,
    content: string = ""
  ): Promise<CreateFileResult> {
    const { vault } = this.app;

    // Sanitize the filename
    const sanitizedFilename = sanitizeFilename(filename);

    // Ensure the folder exists
    await this.ensureFolderExists(folderPath);

    // Resolve any filename conflicts
    const { finalFilename, conflictResolved } = await this.resolveFilenameConflict(
      folderPath,
      sanitizedFilename
    );

    // Create the full path
    const filePath = normalizePath(`${folderPath}/${finalFilename}.md`);

    // Create the file
    const file = await vault.create(filePath, content);

    return {
      file,
      finalFilename,
      conflictResolved,
    };
  }

  /**
   * Reads the content of a template file
   *
   * @param templatePath - Path to the template file
   * @returns The template content, or null if file doesn't exist
   */
  async getTemplateContent(templatePath: string): Promise<string | null> {
    const { vault } = this.app;

    const normalizedPath = normalizePath(templatePath);
    const file = vault.getAbstractFileByPath(normalizedPath);

    if (!(file instanceof TFile)) {
      return null;
    }

    return vault.read(file);
  }

  /**
   * Processes file template content by replacing variables.
   *
   * Matches Obsidian's core Templates plugin behavior:
   * - {{title}} - Note title (filename without extension)
   * - {{date}} - Current date in user's configured format
   * - {{date:FORMAT}} - Current date with custom moment.js format
   * - {{time}} - Current time in user's configured format
   * - {{time:FORMAT}} - Current time with custom moment.js format
   *
   * @param content - The template content with {{variable}} placeholders
   * @param title - The title/filename to use for {{title}} variable
   * @param targetDate - Optional moment date to use (defaults to now)
   * @returns Processed content with variables replaced
   */
  processFileTemplate(
    content: string,
    title: string,
    targetDate?: moment.Moment
  ): string {
    // Get user's date/time format settings from Templates plugin
    const settings = getTemplatesSettings(this.app);

    // Process template content using the same logic as Obsidian's Templates plugin
    return processTemplateContent(content, title, settings, targetDate);
  }

  /**
   * Gets the folder of the currently active file
   *
   * @returns The folder path, or root if no file is active
   */
  getCurrentFolder(): string {
    const activeFile = this.app.workspace.getActiveFile();

    if (activeFile && activeFile.parent) {
      return activeFile.parent.path;
    }

    // Return root folder if no active file
    return "/";
  }

  /**
   * Ensures a folder exists, creating it if necessary
   *
   * @param folderPath - The folder path to ensure exists
   */
  async ensureFolderExists(folderPath: string): Promise<void> {
    const { vault } = this.app;

    // Normalize and handle root folder
    const normalizedPath = normalizePath(folderPath);
    if (normalizedPath === "/" || normalizedPath === "") {
      return;
    }

    // Check if folder already exists
    const existingFolder = vault.getAbstractFileByPath(normalizedPath);
    if (existingFolder instanceof TFolder) {
      return;
    }

    // Create the folder (this will create parent folders as needed)
    await vault.createFolder(normalizedPath);
  }

  /**
   * Resolves filename conflicts by appending a number if necessary
   *
   * @param folderPath - The folder where the file will be created
   * @param filename - The desired filename (without extension)
   * @returns The final filename to use and whether a conflict was resolved
   */
  async resolveFilenameConflict(
    folderPath: string,
    filename: string
  ): Promise<{ finalFilename: string; conflictResolved: boolean }> {
    const { vault } = this.app;

    // Check if the original filename is available
    const originalPath = normalizePath(`${folderPath}/${filename}.md`);
    if (!vault.getAbstractFileByPath(originalPath)) {
      return { finalFilename: filename, conflictResolved: false };
    }

    // Find an available filename by appending a number
    let counter = 1;
    let finalFilename: string;
    let filePath: string;

    do {
      finalFilename = `${filename} ${counter}`;
      filePath = normalizePath(`${folderPath}/${finalFilename}.md`);
      counter++;
    } while (vault.getAbstractFileByPath(filePath) && counter < 1000);

    return { finalFilename, conflictResolved: true };
  }

  /**
   * Gets all folders in the vault
   *
   * @returns Array of folder paths
   */
  getAllFolders(): string[] {
    const folders: string[] = ["/"];
    const allFiles = this.app.vault.getAllLoadedFiles();

    for (const file of allFiles) {
      if (file instanceof TFolder && file.path !== "/") {
        folders.push(file.path);
      }
    }

    return folders.sort();
  }

  /**
   * Gets all markdown files in a specific folder (for template selection)
   *
   * @param folderPath - The folder to search in
   * @returns Array of file paths
   */
  getMarkdownFilesInFolder(folderPath: string): string[] {
    const normalizedPath = normalizePath(folderPath);
    const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

    if (!(folder instanceof TFolder)) {
      return [];
    }

    const files: string[] = [];
    this.collectMarkdownFiles(folder, files);

    return files.sort();
  }

  /**
   * Recursively collects markdown files from a folder
   */
  private collectMarkdownFiles(folder: TFolder, files: string[]): void {
    for (const child of folder.children) {
      if (child instanceof TFile && child.extension === "md") {
        files.push(child.path);
      } else if (child instanceof TFolder) {
        this.collectMarkdownFiles(child, files);
      }
    }
  }

  /**
   * Opens a file in the workspace
   *
   * @param file - The file to open
   * @param newLeaf - Whether to open in a new leaf/tab
   */
  async openFile(file: TFile, newLeaf: boolean = false): Promise<void> {
    const leaf = this.app.workspace.getLeaf(newLeaf);
    await leaf.openFile(file);
  }
}
