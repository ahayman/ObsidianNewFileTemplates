/**
 * Template Selection Modal
 *
 * A fuzzy search modal for selecting title templates.
 * Displays template name, target folder, and file template (if set).
 */

import { App, FuzzySuggestModal, FuzzyMatch, TFolder } from "obsidian";
import { TitleTemplate } from "../types";

/**
 * Callback function type for when a template is selected
 */
export type OnTemplateSelect = (template: TitleTemplate, targetFolder?: TFolder) => void;

/**
 * Modal for selecting a title template from the user's configured templates
 */
export class TemplateSelectModal extends FuzzySuggestModal<TitleTemplate> {
  private templates: TitleTemplate[];
  private onSelect: OnTemplateSelect;
  private targetFolderOverride?: TFolder;

  /**
   * Creates a new template selection modal
   *
   * @param app - The Obsidian app instance
   * @param templates - Array of available templates to choose from
   * @param onSelect - Callback when a template is selected
   * @param targetFolderOverride - Optional folder to use instead of template's configured folder
   */
  constructor(
    app: App,
    templates: TitleTemplate[],
    onSelect: OnTemplateSelect,
    targetFolderOverride?: TFolder
  ) {
    super(app);
    this.templates = templates;
    this.onSelect = onSelect;
    this.targetFolderOverride = targetFolderOverride;

    // Set placeholder text
    this.setPlaceholder("Select a template...");

    // Add CSS class for styling
    this.modalEl.addClass("file-template-modal");
  }

  /**
   * Returns all available templates for fuzzy searching
   */
  getItems(): TitleTemplate[] {
    return this.templates;
  }

  /**
   * Returns the text to use for fuzzy matching
   */
  getItemText(template: TitleTemplate): string {
    return template.name;
  }

  /**
   * Called when a template is selected
   */
  onChooseItem(template: TitleTemplate, evt: MouseEvent | KeyboardEvent): void {
    this.onSelect(template, this.targetFolderOverride);
  }

  /**
   * Custom rendering for suggestion items
   * Shows template name, target folder, and file template
   */
  renderSuggestion(match: FuzzyMatch<TitleTemplate>, el: HTMLElement): void {
    const template = match.item;

    // Add container class
    el.addClass("file-template-suggestion");

    // Create main content container
    const contentEl = el.createDiv({ cls: "file-template-suggestion-content" });

    // Template name with fuzzy match highlighting
    const nameEl = contentEl.createDiv({ cls: "file-template-suggestion-name" });
    this.renderHighlightedText(nameEl, template.name, match.match.matches);

    // Metadata container
    const metaEl = contentEl.createDiv({ cls: "file-template-suggestion-meta" });

    // Target folder
    const folderText = this.targetFolderOverride
      ? `→ ${this.targetFolderOverride.path}` // Show override folder
      : template.folder === "current"
        ? "→ Current folder"
        : `→ ${template.folder}`;

    metaEl.createSpan({
      cls: "file-template-suggestion-folder",
      text: folderText,
    });

    // File template (if set)
    if (template.fileTemplate) {
      metaEl.createSpan({
        cls: "file-template-suggestion-file-template",
        text: ` · Template: ${this.getFileName(template.fileTemplate)}`,
      });
    }

    // Title pattern preview
    const patternEl = contentEl.createDiv({
      cls: "file-template-suggestion-pattern",
      text: `Pattern: ${template.titlePattern}`,
    });
  }

  /**
   * Renders text with fuzzy match highlighting
   */
  private renderHighlightedText(
    el: HTMLElement,
    text: string,
    matches: readonly number[] | null
  ): void {
    if (!matches || matches.length === 0) {
      el.textContent = text;
      return;
    }

    const matchSet = new Set(matches);
    let currentIndex = 0;

    for (let i = 0; i < text.length; i++) {
      if (matchSet.has(i)) {
        // Start of a highlighted section
        if (currentIndex < i) {
          el.appendText(text.slice(currentIndex, i));
        }
        el.createSpan({
          cls: "suggestion-highlight",
          text: text[i],
        });
        currentIndex = i + 1;
      }
    }

    // Append remaining text
    if (currentIndex < text.length) {
      el.appendText(text.slice(currentIndex));
    }
  }

  /**
   * Extracts filename from a path
   */
  private getFileName(path: string): string {
    const parts = path.split("/");
    return parts[parts.length - 1].replace(/\.md$/, "");
  }

  /**
   * Called when the modal is opened
   */
  onOpen(): void {
    super.onOpen();

    // Show a message if no templates are configured
    if (this.templates.length === 0) {
      const emptyEl = this.resultContainerEl.createDiv({
        cls: "file-template-empty-state",
      });
      emptyEl.createEl("p", {
        text: "No templates configured.",
      });
      emptyEl.createEl("p", {
        text: "Add templates in the plugin settings.",
        cls: "file-template-empty-hint",
      });
    }
  }
}

/**
 * Opens the template selection modal
 *
 * @param app - The Obsidian app instance
 * @param templates - Array of available templates
 * @param onSelect - Callback when a template is selected
 * @param targetFolder - Optional folder override (e.g., from context menu)
 */
export function openTemplateSelectModal(
  app: App,
  templates: TitleTemplate[],
  onSelect: OnTemplateSelect,
  targetFolder?: TFolder
): void {
  new TemplateSelectModal(app, templates, onSelect, targetFolder).open();
}
