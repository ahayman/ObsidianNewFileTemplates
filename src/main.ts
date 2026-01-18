import { Plugin, TFolder, TAbstractFile, TFile, Menu, Notice } from "obsidian";
import { PluginSettings, DEFAULT_SETTINGS, TitleTemplate, PromptValues, UserPrompt } from "./types";
import { FileService, getNextCounterValue } from "./services";
import { openTemplateSelectModal } from "./modals";
import { openPromptEntryModal, PromptEntryResult } from "./modals/PromptEntryModal";
import { openFilePromptEntryModal } from "./modals/FilePromptEntryModal";
import { FileTemplateSettingsTab } from "./settings";
import { parseTitleTemplateToFilename, getTemplatesSettings } from "./utils";
import { hasCounterVariable } from "./utils/templateParser";
import {
  hasPrompts,
  extractPrompts,
  extractPromptsFromContent,
  substitutePromptsInContent,
} from "./utils/promptParser";
import {
  isTemplaterEnabled,
  doesTemplaterAutoProcess,
  processTemplaterInFile,
} from "./services/TemplaterService";
import { PromptSuggest, promptHighlighter } from "./editor";

export default class FileTemplatePlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private fileService!: FileService;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Initialize services
    this.fileService = new FileService(this.app);

    // Register main command to open template selection modal
    this.addCommand({
      id: "open-template-modal",
      name: "Create New Templated File",
      callback: () => {
        this.openTemplateModal();
      },
    });

    // Register command to enter file prompts in current file
    this.addCommand({
      id: "enter-file-prompts",
      name: "Enter File Prompts",
      checkCallback: (checking: boolean) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === "md") {
          if (!checking) {
            this.enterFilePrompts(activeFile);
          }
          return true;
        }
        return false;
      },
    });

    // Register context menu for folders
    this.registerFolderContextMenu();

    // Register individual template commands
    this.registerTemplateCommands();

    // Add settings tab
    this.addSettingTab(new FileTemplateSettingsTab(this.app, this));

    // Add ribbon icon for quick access (especially useful on mobile)
    this.addRibbonIcon("file-plus", "Create New Templated File", () => {
      this.openTemplateModal();
    });

    // Register editor suggest for prompt syntax autocomplete
    this.registerEditorSuggest(new PromptSuggest(this.app));

    // Register editor extension for prompt syntax highlighting
    this.registerEditorExtension(promptHighlighter);
  }

  async onunload(): Promise<void> {
    // Cleanup handled automatically by Obsidian
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * Called when settings change (from settings tab)
   * Used to notify that commands may need re-registration
   */
  onSettingsChange(): void {
    // Note: Commands registered with addCommand persist until plugin reload
    // New templates will have commands registered, but removed templates
    // will still have their commands until reload
    this.registerTemplateCommands();
  }

  /**
   * Opens the template selection modal
   * @param targetFolder - Optional folder override (from context menu)
   */
  private openTemplateModal(targetFolder?: TFolder): void {
    if (this.settings.templates.length === 0) {
      new Notice("No templates configured. Add templates in settings.");
      return;
    }

    openTemplateSelectModal(
      this.app,
      this.settings.templates,
      (template, folder) => {
        this.createFileFromTemplate(template, folder);
      },
      targetFolder
    );
  }

  /**
   * Registers the folder context menu item
   */
  private registerFolderContextMenu(): void {
    this.registerEvent(
      this.app.workspace.on(
        "file-menu",
        (menu: Menu, file: TAbstractFile, source: string) => {
          // Only add menu item for folders
          if (!(file instanceof TFolder)) {
            return;
          }

          menu.addItem((item) => {
            item
              .setTitle("New Templated File")
              .setIcon("file-plus")
              .onClick(() => {
                this.openTemplateModal(file);
              });
          });
        }
      )
    );
  }

  /**
   * Registers commands for each user-defined template
   */
  private registerTemplateCommands(): void {
    // Register a command for each template
    for (const template of this.settings.templates) {
      const commandId = `create-${template.id}`;

      // Check if command already exists (avoid duplicates)
      // Note: Obsidian doesn't provide a way to check, so we just add
      // Duplicates are handled by Obsidian internally
      this.addCommand({
        id: commandId,
        name: `Create a new ${template.name} File`,
        callback: () => {
          this.createFileFromTemplate(template);
        },
      });
    }
  }

  /**
   * Creates a new file from a template
   * @param template - The template to use
   * @param targetFolder - Optional folder override
   */
  private async createFileFromTemplate(
    template: TitleTemplate,
    targetFolder?: TFolder
  ): Promise<void> {
    try {
      // Get file template content first (needed to extract file prompts)
      let rawTemplateContent: string | null = null;
      let filePrompts: UserPrompt[] = [];

      if (template.fileTemplate) {
        rawTemplateContent = await this.fileService.getTemplateContent(
          template.fileTemplate
        );
        if (rawTemplateContent) {
          // Extract prompts from file template content
          filePrompts = extractPromptsFromContent(rawTemplateContent);
        } else {
          new Notice(`Template file not found: ${template.fileTemplate}`);
        }
      }

      // Check if we need to show prompt entry modal
      const hasTitlePrompts = hasPrompts(template.titlePattern);
      const hasFilePrompts = filePrompts.length > 0;

      let promptResult: PromptEntryResult | null = null;
      // Extract title prompts once and reuse - IDs must match between modal and substitution
      let titlePrompts: UserPrompt[] = [];

      if (hasTitlePrompts || hasFilePrompts) {
        // Extract title prompts from pattern (pattern is the source of truth)
        titlePrompts = hasTitlePrompts
          ? extractPrompts(template.titlePattern)
          : [];

        // Show prompt entry modal with both title and file prompts
        promptResult = await openPromptEntryModal(
          this.app,
          template,
          titlePrompts,
          filePrompts
        );

        // If user cancelled, abort file creation
        if (promptResult === null) {
          return;
        }
      }

      // Determine the target folder
      let folderPath: string;
      if (targetFolder) {
        // Use the provided folder (from context menu)
        folderPath = targetFolder.path;
      } else if (template.folder === "current") {
        // Use the current folder
        folderPath = this.fileService.getCurrentFolder();
      } else {
        // Use the template's configured folder
        folderPath = template.folder;
      }

      // Get counter value if template uses {{counter}}
      let counterValue: number | undefined;
      if (hasCounterVariable(template.titlePattern)) {
        counterValue = getNextCounterValue(this.app, template, folderPath);
      }

      // Generate the filename from the title pattern
      // Uses user's date/time format settings from Templates plugin
      const templatesSettings = getTemplatesSettings(this.app);
      const filename = parseTitleTemplateToFilename(
        template.titlePattern,
        templatesSettings,
        undefined, // targetDate - use default (now)
        counterValue,
        titlePrompts.length > 0 ? titlePrompts : undefined,
        promptResult?.titleValues
      );

      // Process file template content
      let content = "";
      if (rawTemplateContent) {
        // Step 1: Substitute file prompts first (before any other processing)
        let processedContent = rawTemplateContent;
        if (filePrompts.length > 0 && promptResult?.fileValues) {
          processedContent = substitutePromptsInContent(
            processedContent,
            filePrompts,
            promptResult.fileValues
          );
        }

        // Step 2: Process file template variables ({{title}}, {{date}}, etc.)
        content = this.fileService.processFileTemplate(processedContent, filename);
      }

      // Create the file
      const result = await this.fileService.createFile(folderPath, filename, content);

      // Process with Templater if enabled and applicable
      // Only process if:
      // 1. Template has useTemplater enabled
      // 2. Templater is installed
      // 3. Templater does NOT auto-process on file creation
      if (
        template.useTemplater &&
        isTemplaterEnabled(this.app) &&
        !doesTemplaterAutoProcess(this.app)
      ) {
        try {
          await processTemplaterInFile(this.app, result.file);
        } catch (error) {
          console.error("Templater processing failed:", error);
          new Notice("Warning: Templater processing failed. File created but template syntax may not be processed.");
        }
      }

      // Notify user
      if (result.conflictResolved) {
        new Notice(`Created: ${result.finalFilename}.md (renamed to avoid conflict)`);
      } else {
        new Notice(`Created: ${result.finalFilename}.md`);
      }

      // Open the new file
      await this.fileService.openFile(result.file);
    } catch (error) {
      console.error("Failed to create file from template:", error);
      new Notice(`Failed to create file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Creates a file from a template by ID
   * Used by per-template commands
   */
  private createFileFromTemplateById(templateId: string): void {
    const template = this.settings.templates.find((t) => t.id === templateId);
    if (!template) {
      new Notice("Template not found. It may have been deleted.");
      return;
    }
    this.createFileFromTemplate(template);
  }

  /**
   * Enter file prompts for an existing file
   * Extracts prompts from the file content, shows modal, and substitutes values
   */
  private async enterFilePrompts(file: TFile): Promise<void> {
    try {
      // Read the file content
      const content = await this.app.vault.read(file);

      // Extract prompts from content (ignores prompts in code blocks)
      const prompts = extractPromptsFromContent(content);

      // If no prompts found, show toast and return
      if (prompts.length === 0) {
        new Notice("No prompts found in this file.");
        return;
      }

      // Show prompt entry modal
      const values = await openFilePromptEntryModal(this.app, file, prompts);

      // If user cancelled, abort
      if (values === null) {
        return;
      }

      // Substitute prompts in content with values
      const newContent = substitutePromptsInContent(content, prompts, values);

      // Save the file
      await this.app.vault.modify(file, newContent);

      new Notice(`Updated: ${file.basename}.md`);
    } catch (error) {
      console.error("Failed to process file prompts:", error);
      new Notice(`Failed to process file prompts: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
