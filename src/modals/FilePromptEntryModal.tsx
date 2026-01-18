/**
 * File Prompt Entry Modal
 *
 * Modal for collecting file prompt values when processing prompts
 * in an existing file.
 */

import { App, Modal, TFile } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { StrictMode, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { UserPrompt, PromptValues } from "../types";
import {
  validatePromptValue,
  allPromptsValid,
} from "../utils/promptParser";
import {
  formatDate,
  formatDateTime,
  formatDateOutput,
  formatTimeOutput,
  formatDateTimeOutput,
  formatCustom,
  hasDateTokens,
  hasTimeTokens,
  parseDate,
  parseTime,
  parseDateTime,
} from "../utils/dateTimeUtils";
import { DatePicker, TimePicker, DateTimePicker } from "../components/pickers";
import { AppContext } from "../settings/AppContext";

interface FilePromptEntryViewProps {
  filename: string;
  prompts: UserPrompt[];
  onSubmit: (values: PromptValues) => void;
  onCancel: () => void;
}

function FilePromptEntryView({
  filename,
  prompts,
  onSubmit,
  onCancel,
}: FilePromptEntryViewProps) {
  // Initialize values - date/time prompts default to "now"
  const [values, setValues] = useState<PromptValues>(() => {
    const initial: PromptValues = {};
    const now = new Date();
    for (const prompt of prompts) {
      switch (prompt.valueType) {
        case "date":
          initial[prompt.id] = formatDate(now, "YYYY-MM-DD");
          break;
        case "time": {
          const hours = String(now.getHours()).padStart(2, "0");
          const minutes = String(now.getMinutes()).padStart(2, "0");
          initial[prompt.id] = `${hours}:${minutes}`;
          break;
        }
        case "datetime":
          initial[prompt.id] = formatDateTime(now);
          break;
        default:
          initial[prompt.id] = "";
      }
    }
    return initial;
  });

  // Track validation errors
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // Track which field has been touched
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Refs for input fields
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Check if all values are valid
  const isAllValid = useMemo(() => {
    return allPromptsValid(prompts, values);
  }, [prompts, values]);

  // Format a value for output based on prompt configuration
  const formatValueForOutput = useCallback((prompt: UserPrompt, value: string): string => {
    const dateFormat = prompt.dateConfig?.outputFormat || 'YYYY-MM-DD';
    const timeFormat = prompt.timeConfig?.outputFormat || 'h:mm A';
    const customDateFormat = prompt.dateConfig?.customFormat || 'YYYY-MM-DD';
    const customTimeFormat = prompt.timeConfig?.customFormat || 'h:mm A';

    switch (prompt.valueType) {
      case "date": {
        const date = parseDate(value);
        if (date) {
          if (dateFormat === 'custom') {
            if (hasDateTokens(customDateFormat) && hasTimeTokens(customDateFormat)) {
              const now = new Date();
              date.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
            }
            return formatCustom(date, customDateFormat);
          }
          return formatDateOutput(date, dateFormat);
        }
        return value;
      }
      case "time": {
        const time = parseTime(value);
        if (time) {
          if (timeFormat === 'custom') {
            const date = new Date();
            date.setHours(time.hours, time.minutes, 0, 0);
            return formatCustom(date, customTimeFormat);
          }
          return formatTimeOutput(time.hours, time.minutes, timeFormat);
        }
        return value;
      }
      case "datetime": {
        const datetime = parseDateTime(value);
        if (datetime) {
          if (dateFormat === 'custom' || timeFormat === 'custom') {
            if (dateFormat === 'custom' && timeFormat === 'custom' && customDateFormat === customTimeFormat) {
              return formatCustom(datetime, customDateFormat);
            }
            if (dateFormat === 'custom' && timeFormat !== 'custom') {
              return `${formatCustom(datetime, customDateFormat)} ${formatTimeOutput(datetime.getHours(), datetime.getMinutes(), timeFormat)}`;
            }
            if (dateFormat !== 'custom' && timeFormat === 'custom') {
              return `${formatDateOutput(datetime, dateFormat)} ${formatCustom(datetime, customTimeFormat)}`;
            }
            return formatCustom(datetime, `${customDateFormat} ${customTimeFormat}`);
          }
          return formatDateTimeOutput(datetime, dateFormat, timeFormat);
        }
        return value;
      }
      default:
        return value;
    }
  }, []);

  // Handle value change
  const handleValueChange = useCallback(
    (promptId: string, value: string) => {
      setValues((prev) => ({ ...prev, [promptId]: value }));

      const prompt = prompts.find((p) => p.id === promptId);
      if (prompt) {
        const result = validatePromptValue(value, prompt);
        setErrors((prev) => ({
          ...prev,
          [promptId]: result.valid ? undefined : result.error,
        }));
      }
    },
    [prompts]
  );

  // Handle field blur
  const handleBlur = useCallback((promptId: string) => {
    setTouched((prev) => ({ ...prev, [promptId]: true }));
  }, []);

  // Handle key down for keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (index < prompts.length - 1) {
          inputRefs.current[index + 1]?.focus();
        } else {
          submitButtonRef.current?.focus();
        }
      } else if (e.key === "Escape") {
        onCancel();
      }
    },
    [prompts.length, onCancel]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    const allTouched: Record<string, boolean> = {};
    for (const prompt of prompts) {
      allTouched[prompt.id] = true;
    }
    setTouched(allTouched);

    if (isAllValid) {
      const formattedValues: PromptValues = {};
      for (const prompt of prompts) {
        const rawValue = values[prompt.id] ?? "";
        formattedValues[prompt.id] = formatValueForOutput(prompt, rawValue);
      }
      onSubmit(formattedValues);
    }
  }, [prompts, values, isAllValid, onSubmit, formatValueForOutput]);

  return (
    <div className="file-template-prompt-modal">
      {/* File name display */}
      <div className="file-template-prompt-modal-preview">
        {filename}
      </div>

      {/* Prompt Fields */}
      <div className="file-template-prompt-modal-fields">
        {prompts.map((prompt, index) => {
          const value = values[prompt.id] ?? "";
          const error = errors[prompt.id];
          const isTouched = touched[prompt.id];
          const showError = isTouched && error;

          const typeLabel = {
            numeric: "number",
            date: "date",
            time: "time",
            datetime: "date & time",
          }[prompt.valueType];

          return (
            <div key={prompt.id} className="file-template-prompt-modal-field">
              <label
                className="file-template-prompt-modal-label"
                htmlFor={`prompt-${prompt.id}`}
              >
                {prompt.name}
                {typeLabel && (
                  <span className="file-template-prompt-item-type">
                    {" "}
                    ({typeLabel})
                  </span>
                )}
                {prompt.isOptional && (
                  <span className="file-template-prompt-optional-badge">
                    {" "}
                    (optional)
                  </span>
                )}
              </label>

              {prompt.valueType === "date" ? (
                <DatePicker
                  value={value}
                  onChange={(newValue) => handleValueChange(prompt.id, newValue)}
                  autoFocus={index === 0}
                />
              ) : prompt.valueType === "time" ? (
                <TimePicker
                  value={value}
                  onChange={(newValue) => handleValueChange(prompt.id, newValue)}
                  format={
                    prompt.timeConfig?.outputFormat?.includes('A') ? '12h' : '24h'
                  }
                  autoFocus={index === 0}
                />
              ) : prompt.valueType === "datetime" ? (
                <DateTimePicker
                  value={value}
                  onChange={(newValue) => handleValueChange(prompt.id, newValue)}
                  timeFormat={
                    prompt.timeConfig?.outputFormat?.includes('A') ? '12h' : '24h'
                  }
                  autoFocus={index === 0}
                />
              ) : (
                <input
                  id={`prompt-${prompt.id}`}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode={prompt.valueType === "numeric" ? "numeric" : "text"}
                  className={`file-template-prompt-modal-input ${
                    showError ? "is-error" : ""
                  }`}
                  value={value}
                  onChange={(e) => handleValueChange(prompt.id, e.target.value)}
                  onBlur={() => handleBlur(prompt.id)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder={
                    prompt.valueType === "numeric"
                      ? "Enter a number..."
                      : "Enter value..."
                  }
                />
              )}

              {showError && (
                <div className="file-template-prompt-modal-error">{error}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="file-template-prompt-modal-actions">
        <button type="button" className="mod-muted" onClick={onCancel}>
          Cancel
        </button>
        <button
          ref={submitButtonRef}
          type="button"
          className="mod-cta"
          onClick={handleSubmit}
          disabled={!isAllValid}
        >
          Update File
        </button>
      </div>
    </div>
  );
}

/**
 * Modal for entering file prompt values for an existing file
 */
export class FilePromptEntryModal extends Modal {
  private file: TFile;
  private prompts: UserPrompt[];
  private root: Root | null = null;
  private resolvePromise: ((values: PromptValues | null) => void) | null = null;

  constructor(app: App, file: TFile, prompts: UserPrompt[]) {
    super(app);
    this.file = file;
    this.prompts = prompts;

    this.modalEl.addClass("file-template-prompt-modal");
  }

  openAndGetValues(): Promise<PromptValues | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    this.titleEl.setText("Enter File Prompts");

    const container = contentEl.createDiv();
    this.root = createRoot(container);

    this.root.render(
      <StrictMode>
        <AppContext.Provider value={this.app}>
          <FilePromptEntryView
            filename={this.file.basename}
            prompts={this.prompts}
            onSubmit={(values) => {
              if (this.resolvePromise) {
                this.resolvePromise(values);
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

    if (this.resolvePromise) {
      this.resolvePromise(null);
      this.resolvePromise = null;
    }
  }
}

/**
 * Opens the file prompt entry modal for an existing file
 *
 * @param app - The Obsidian app instance
 * @param file - The file to process prompts for
 * @param prompts - The prompts to collect values for
 * @returns Promise resolving to the entered values or null if cancelled
 */
export async function openFilePromptEntryModal(
  app: App,
  file: TFile,
  prompts: UserPrompt[]
): Promise<PromptValues | null> {
  const modal = new FilePromptEntryModal(app, file, prompts);
  return modal.openAndGetValues();
}
