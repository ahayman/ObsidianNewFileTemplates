/**
 * Prompt Entry View Component
 *
 * React component for entering user prompt values.
 * Features:
 * - Real-time title preview
 * - Keyboard navigation (Enter moves to next field)
 * - Input validation
 * - Numeric keyboard support for numeric prompts
 * - Date, time, and datetime pickers
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { TitleTemplate, UserPrompt, PromptValues } from "../types";
import {
  validatePromptValue,
  previewWithPrompts,
  allPromptsValid,
} from "../utils/promptParser";
import { parseTemplate } from "../utils/templateParser";
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

interface PromptEntryViewProps {
  template: TitleTemplate;
  prompts: UserPrompt[];
  onSubmit: (values: PromptValues) => void;
  onCancel: () => void;
}

export function PromptEntryView({
  template,
  prompts,
  onSubmit,
  onCancel,
}: PromptEntryViewProps) {
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

  // Track which field has been touched (for showing errors only after interaction)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Refs for input fields (for focus management)
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
            // For custom format, check if it has time tokens - if so, use current time
            if (hasTimeTokens(customDateFormat)) {
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
            // For custom format, check if it has date tokens - if so, use current date
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
          // For datetime, check if either format is custom
          if (dateFormat === 'custom' || timeFormat === 'custom') {
            // If only date custom, format date with custom and time with preset
            if (dateFormat === 'custom' && timeFormat !== 'custom') {
              return `${formatCustom(datetime, customDateFormat)} ${formatTimeOutput(datetime.getHours(), datetime.getMinutes(), timeFormat)}`;
            }
            // If only time custom, format date with preset and time with custom
            if (dateFormat !== 'custom' && timeFormat === 'custom') {
              return `${formatDateOutput(datetime, dateFormat)} ${formatCustom(datetime, customTimeFormat)}`;
            }
            // Both custom - combine into single format string
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

  // Generate formatted values for preview
  const formattedValuesForPreview = useMemo(() => {
    const formatted: PromptValues = {};
    for (const prompt of prompts) {
      const rawValue = values[prompt.id] ?? "";
      if (rawValue) {
        formatted[prompt.id] = formatValueForOutput(prompt, rawValue);
      } else {
        formatted[prompt.id] = rawValue;
      }
    }
    return formatted;
  }, [prompts, values, formatValueForOutput]);

  // Generate title preview
  const titlePreview = useMemo(() => {
    // First substitute prompts with formatted values, then parse built-in variables
    const withPrompts = previewWithPrompts(template.titlePattern, prompts, formattedValuesForPreview);
    // Parse built-in variables for full preview
    return parseTemplate(withPrompts);
  }, [template.titlePattern, prompts, formattedValuesForPreview]);

  // Handle value change
  const handleValueChange = useCallback(
    (promptId: string, value: string) => {
      setValues((prev) => ({ ...prev, [promptId]: value }));

      // Find the prompt for validation
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

  // Handle field blur (mark as touched)
  const handleBlur = useCallback((promptId: string) => {
    setTouched((prev) => ({ ...prev, [promptId]: true }));
  }, []);

  // Handle key down for keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // Move to next field or submit
        if (index < prompts.length - 1) {
          inputRefs.current[index + 1]?.focus();
        } else {
          // Last field - focus submit button
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
    // Mark all fields as touched to show any errors
    const allTouched: Record<string, boolean> = {};
    for (const prompt of prompts) {
      allTouched[prompt.id] = true;
    }
    setTouched(allTouched);

    // Validate all and check
    if (isAllValid) {
      // Format values according to output configuration
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
      {/* Title Preview */}
      <div
        className={`file-template-prompt-modal-preview ${
          isAllValid ? "is-complete" : ""
        }`}
      >
        {titlePreview}.md
      </div>

      {/* Prompt Fields */}
      <div className="file-template-prompt-modal-fields">
        {prompts.map((prompt, index) => {
          const value = values[prompt.id] ?? "";
          const error = errors[prompt.id];
          const isTouched = touched[prompt.id];
          const showError = isTouched && error;

          // Get type label for display
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
              </label>

              {/* Render appropriate input based on valueType */}
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
                    // Show 12h picker if output format is 12h-based
                    prompt.timeConfig?.outputFormat?.includes('A') ? '12h' : '24h'
                  }
                  autoFocus={index === 0}
                />
              ) : prompt.valueType === "datetime" ? (
                <DateTimePicker
                  value={value}
                  onChange={(newValue) => handleValueChange(prompt.id, newValue)}
                  timeFormat={
                    // Show 12h picker if output format is 12h-based
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
          Create File
        </button>
      </div>
    </div>
  );
}
