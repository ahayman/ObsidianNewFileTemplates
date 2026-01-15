import { Plugin, TFolder, TAbstractFile, Menu, Notice } from "obsidian";
import { PluginSettings, DEFAULT_SETTINGS, TitleTemplate } from "./types";
import { FileService, getNextCounterValue } from "./services";
import { openTemplateSelectModal } from "./modals";
import { FileTemplateSettingsTab } from "./settings";
import { parseTitleTemplateToFilename, getTemplatesSettings } from "./utils";
import { hasCounterVariable } from "./utils/templateParser";
import {
  isTemplaterEnabled,
  doesTemplaterAutoProcess,
  processTemplaterInFile,
} from "./services/TemplaterService";

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
        counterValue
      );

      // Get file template content if specified
      let content = "";
      if (template.fileTemplate) {
        const templateContent = await this.fileService.getTemplateContent(
          template.fileTemplate
        );
        if (templateContent) {
          content = this.fileService.processFileTemplate(templateContent, filename);
        } else {
          new Notice(`Template file not found: ${template.fileTemplate}`);
        }
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
}
