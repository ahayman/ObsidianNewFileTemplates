import { Plugin } from "obsidian";
import { PluginSettings, DEFAULT_SETTINGS } from "./types";

export default class FileTemplatePlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

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
    // TODO: Implement settings tab
  }

  async onunload(): Promise<void> {
    // Cleanup if needed
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private openTemplateModal(): void {
    // TODO: Implement template selection modal
    console.log("Opening template modal...");
  }

  private registerFolderContextMenu(): void {
    // TODO: Implement folder context menu
  }

  private registerTemplateCommands(): void {
    // Register a command for each user-defined template
    for (const template of this.settings.templates) {
      this.addCommand({
        id: `create-${template.id}`,
        name: `Create a new ${template.name} File`,
        callback: () => {
          this.createFileFromTemplate(template.id);
        },
      });
    }
  }

  private createFileFromTemplate(templateId: string): void {
    // TODO: Implement file creation from template
    console.log(`Creating file from template: ${templateId}`);
  }
}
