/**
 * Settings Tab Component
 *
 * Main settings tab for the New File Templates.
 * Wraps React components in Obsidian's PluginSettingTab.
 */

import { App, PluginSettingTab, Setting } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { StrictMode } from "react";
import { AppContext } from "./AppContext";
import { TemplateList } from "./TemplateList";
import { PluginSettings, TitleTemplate } from "../types";

/**
 * Plugin reference interface (to avoid circular imports)
 */
interface FileTemplatePluginRef {
  settings: PluginSettings;
  saveSettings: () => Promise<void>;
  onSettingsChange?: () => void;
}

/**
 * Settings tab for the New File Templates
 */
export class FileTemplateSettingsTab extends PluginSettingTab {
  private plugin: FileTemplatePluginRef;
  private root: Root | null = null;

  constructor(app: App, plugin: FileTemplatePluginRef) {
    super(app, plugin as any);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("file-template-settings");

    // Header
    containerEl.createEl("h2", { text: "File Template Settings" });

    // Description
    containerEl.createEl("p", {
      text: "Create title templates to quickly generate new notes with consistent naming patterns.",
      cls: "setting-item-description",
    });

    // Template folder setting (for file template suggestions)
    new Setting(containerEl)
      .setName("Template Folder")
      .setDesc("Default folder to look for file templates (optional)")
      .addText((text) =>
        text
          .setPlaceholder("e.g., Templates")
          .setValue(this.plugin.settings.templateFolder)
          .onChange(async (value) => {
            this.plugin.settings.templateFolder = value;
            await this.plugin.saveSettings();
          })
      );

    // Divider
    containerEl.createEl("hr");

    // Templates section header
    containerEl.createEl("h3", { text: "Title Templates" });

    // React container for template list
    const reactContainer = containerEl.createDiv({
      cls: "file-template-react-container",
    });

    // Mount React component
    this.root = createRoot(reactContainer);
    this.renderReactComponent();
  }

  /**
   * Renders the React component tree
   */
  private renderReactComponent(): void {
    if (!this.root) return;

    this.root.render(
      <StrictMode>
        <AppContext.Provider value={this.app}>
          <TemplateList
            templates={this.plugin.settings.templates}
            templateFolder={this.plugin.settings.templateFolder}
            onUpdate={this.handleTemplatesUpdate.bind(this)}
          />
        </AppContext.Provider>
      </StrictMode>
    );
  }

  /**
   * Handles template list updates
   */
  private async handleTemplatesUpdate(templates: TitleTemplate[]): Promise<void> {
    this.plugin.settings.templates = templates;
    await this.plugin.saveSettings();

    // Notify plugin of settings change (for command re-registration)
    if (this.plugin.onSettingsChange) {
      this.plugin.onSettingsChange();
    }

    // Re-render to reflect changes
    this.renderReactComponent();
  }

  /**
   * Called when the settings tab is hidden
   */
  hide(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}
