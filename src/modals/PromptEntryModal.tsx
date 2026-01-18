/**
 * Prompt Entry Modal
 *
 * Modal for collecting user prompt values when creating a new file
 * from a template that contains user prompts.
 */

import { App, Modal } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { StrictMode } from "react";
import { TitleTemplate, UserPrompt, PromptValues } from "../types";
import { PromptEntryView } from "./PromptEntryView";
import { AppContext } from "../settings/AppContext";

/**
 * Result from prompt entry modal
 */
export interface PromptEntryResult {
  /** Values for title prompts */
  titleValues: PromptValues;
  /** Values for file prompts (if any) */
  fileValues?: PromptValues;
}

/**
 * Modal for entering user prompt values
 */
export class PromptEntryModal extends Modal {
  private template: TitleTemplate;
  private titlePrompts: UserPrompt[];
  private filePrompts: UserPrompt[];
  private root: Root | null = null;
  private resolvePromise: ((result: PromptEntryResult | null) => void) | null = null;

  constructor(
    app: App,
    template: TitleTemplate,
    titlePrompts: UserPrompt[],
    filePrompts: UserPrompt[] = []
  ) {
    super(app);
    this.template = template;
    this.titlePrompts = titlePrompts;
    this.filePrompts = filePrompts;

    // Add CSS class for styling
    this.modalEl.addClass("file-template-prompt-modal");
  }

  /**
   * Opens the modal and returns a promise that resolves with the entered values
   * or null if cancelled
   */
  openAndGetValues(): Promise<PromptEntryResult | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    // Set modal title
    this.titleEl.setText(`Enter values for: ${this.template.name}`);

    // Mount React component
    const container = contentEl.createDiv();
    this.root = createRoot(container);

    this.root.render(
      <StrictMode>
        <AppContext.Provider value={this.app}>
          <PromptEntryView
            template={this.template}
            titlePrompts={this.titlePrompts}
            filePrompts={this.filePrompts}
            onSubmit={(titleValues, fileValues) => {
              if (this.resolvePromise) {
                this.resolvePromise({ titleValues, fileValues });
              }
              this.close();
            }}
            onCancel={() => {
              if (this.resolvePromise) {
                this.resolvePromise(null);
              }
              this.close();
            }}
          />
        </AppContext.Provider>
      </StrictMode>
    );
  }

  onClose(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    // Ensure promise is resolved if modal is closed without explicit action
    if (this.resolvePromise) {
      this.resolvePromise(null);
      this.resolvePromise = null;
    }
  }
}

/**
 * Opens the prompt entry modal and returns the entered values
 *
 * @param app - The Obsidian app instance
 * @param template - The template being used
 * @param titlePrompts - The title prompts to collect values for
 * @param filePrompts - The file prompts to collect values for (optional)
 * @returns Promise resolving to the entered values or null if cancelled
 */
export async function openPromptEntryModal(
  app: App,
  template: TitleTemplate,
  titlePrompts: UserPrompt[],
  filePrompts: UserPrompt[] = []
): Promise<PromptEntryResult | null> {
  const modal = new PromptEntryModal(app, template, titlePrompts, filePrompts);
  return modal.openAndGetValues();
}
