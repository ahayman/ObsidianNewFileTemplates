/**
 * Prompt Editor Component
 *
 * Form for creating or editing a user prompt in a title template.
 */

import { useState, useCallback, useMemo } from "react";
import { UserPrompt, DateOutputFormat, TimeOutputFormat } from "../types";
import {
  generatePromptId,
  validatePromptName,
  createPromptSyntax,
} from "../utils/promptParser";
import { getCustomFormatExample } from "../utils/dateTimeUtils";

// Format option definitions with labels and examples
const DATE_FORMAT_OPTIONS: { value: DateOutputFormat; label: string; example: string }[] = [
  { value: 'YYYY-MM-DD', label: 'ISO (YYYY-MM-DD)', example: '2026-01-16' },
  { value: 'YYYYMMDD', label: 'Compact (YYYYMMDD)', example: '20260116' },
  { value: 'MM-DD-YYYY', label: 'US (MM-DD-YYYY)', example: '01-16-2026' },
  { value: 'DD-MM-YYYY', label: 'European (DD-MM-YYYY)', example: '16-01-2026' },
  { value: 'MMM DD, YYYY', label: 'Short month (MMM DD, YYYY)', example: 'Jan 16, 2026' },
  { value: 'MMMM DD, YYYY', label: 'Full month (MMMM DD, YYYY)', example: 'January 16, 2026' },
  { value: 'custom', label: 'Custom format...', example: '' },
];

const TIME_FORMAT_OPTIONS: { value: TimeOutputFormat; label: string; example: string }[] = [
  { value: 'h:mm A', label: '12-hour (h:mm A)', example: '2:30 PM' },
  { value: 'hh:mm A', label: '12-hour padded (hh:mm A)', example: '02:30 PM' },
  { value: 'HH:mm', label: '24-hour (HH:mm)', example: '14:30' },
  { value: 'HHmm', label: '24-hour compact (HHmm)', example: '1430' },
  { value: 'custom', label: 'Custom format...', example: '' },
];

interface PromptEditorProps {
  /** Prompt to edit, or undefined for creating new */
  prompt?: UserPrompt;
  /** Called when save is clicked */
  onSave: (prompt: UserPrompt, syntax: string) => void;
  /** Called when cancel is clicked */
  onCancel: () => void;
}

export function PromptEditor({ prompt, onSave, onCancel }: PromptEditorProps) {
  const [name, setName] = useState(prompt?.name ?? "");
  const [valueType, setValueType] = useState<"text" | "numeric" | "date" | "time" | "datetime">(
    prompt?.valueType ?? "text"
  );
  const [dateOutputFormat, setDateOutputFormat] = useState<DateOutputFormat>(
    prompt?.dateConfig?.outputFormat ?? 'YYYY-MM-DD'
  );
  const [timeOutputFormat, setTimeOutputFormat] = useState<TimeOutputFormat>(
    prompt?.timeConfig?.outputFormat ?? 'h:mm A'
  );
  const [customDateFormat, setCustomDateFormat] = useState(
    prompt?.dateConfig?.customFormat ?? 'YYYY-MM-DD'
  );
  const [customTimeFormat, setCustomTimeFormat] = useState(
    prompt?.timeConfig?.customFormat ?? 'h:mm A'
  );
  const [error, setError] = useState<string | undefined>();

  const isEditing = !!prompt;

  // Determine if we need to show format options
  const showDateFormat = valueType === 'date' || valueType === 'datetime';
  const showTimeFormat = valueType === 'time' || valueType === 'datetime';

  // Generate format preview
  const formatPreview = useMemo(() => {
    if (valueType === 'date') {
      if (dateOutputFormat === 'custom') {
        return customDateFormat ? getCustomFormatExample(customDateFormat) : '';
      }
      const opt = DATE_FORMAT_OPTIONS.find(o => o.value === dateOutputFormat);
      return opt?.example || dateOutputFormat;
    }
    if (valueType === 'time') {
      if (timeOutputFormat === 'custom') {
        return customTimeFormat ? getCustomFormatExample(customTimeFormat) : '';
      }
      const opt = TIME_FORMAT_OPTIONS.find(o => o.value === timeOutputFormat);
      return opt?.example || timeOutputFormat;
    }
    if (valueType === 'datetime') {
      const dateExample = dateOutputFormat === 'custom'
        ? (customDateFormat ? getCustomFormatExample(customDateFormat) : '')
        : (DATE_FORMAT_OPTIONS.find(o => o.value === dateOutputFormat)?.example || dateOutputFormat);
      const timeExample = timeOutputFormat === 'custom'
        ? (customTimeFormat ? getCustomFormatExample(customTimeFormat) : '')
        : (TIME_FORMAT_OPTIONS.find(o => o.value === timeOutputFormat)?.example || timeOutputFormat);
      return `${dateExample} ${timeExample}`;
    }
    return null;
  }, [valueType, dateOutputFormat, timeOutputFormat, customDateFormat, customTimeFormat]);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    const validation = validatePromptName(trimmedName);

    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    const savedPrompt: UserPrompt = {
      id: prompt?.id ?? generatePromptId(),
      name: trimmedName,
      valueType,
    };

    // Add date config if applicable
    if (valueType === 'date' || valueType === 'datetime') {
      savedPrompt.dateConfig = {
        outputFormat: dateOutputFormat,
        ...(dateOutputFormat === 'custom' && customDateFormat ? { customFormat: customDateFormat } : {}),
      };
    }

    // Add time config if applicable
    if (valueType === 'time' || valueType === 'datetime') {
      savedPrompt.timeConfig = {
        outputFormat: timeOutputFormat,
        ...(timeOutputFormat === 'custom' && customTimeFormat ? { customFormat: customTimeFormat } : {}),
      };
    }

    const syntax = createPromptSyntax(trimmedName);
    onSave(savedPrompt, syntax);
  }, [prompt, name, valueType, dateOutputFormat, timeOutputFormat, customDateFormat, customTimeFormat, onSave]);

  const previewSyntax = name.trim()
    ? createPromptSyntax(name.trim())
    : "{% Prompt Name %}";

  return (
    <div className="file-template-prompt-editor">
      <div className="file-template-prompt-editor-header">
        {isEditing ? "Edit User Prompt" : "Add User Prompt"}
      </div>

      {/* Prompt Name */}
      <div className="file-template-editor-field">
        <label
          className="file-template-editor-label"
          htmlFor="prompt-name"
        >
          Prompt Name
        </label>
        <input
          id="prompt-name"
          type="text"
          className="file-template-editor-input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(undefined);
          }}
          placeholder="e.g., Author, Title, Number"
          autoFocus
        />
        {error && <div className="file-template-editor-error">{error}</div>}
        <div className="file-template-editor-hint">
          This is displayed to the user when they create a new file.
        </div>
      </div>

      {/* Value Type */}
      <div className="file-template-editor-field">
        <label
          className="file-template-editor-label"
          htmlFor="prompt-value-type"
        >
          Value Type
        </label>
        <select
          id="prompt-value-type"
          className="file-template-editor-select"
          value={valueType}
          onChange={(e) => setValueType(e.target.value as "text" | "numeric" | "date" | "time" | "datetime")}
        >
          <option value="text">Text (any characters)</option>
          <option value="numeric">Numeric (numbers only)</option>
          <option value="date">Date (calendar picker)</option>
          <option value="time">Time (time picker)</option>
          <option value="datetime">Date & Time (both pickers)</option>
        </select>
        <div className="file-template-editor-hint">
          {valueType === "numeric" && "Shows a number keyboard on mobile devices."}
          {valueType === "date" && "Shows a calendar picker for easy date selection."}
          {valueType === "time" && "Shows a time picker with scrollable wheels."}
          {valueType === "datetime" && "Shows both date and time pickers."}
          {valueType === "text" && "Accepts any text input."}
        </div>
      </div>

      {/* Date Format (shown for date/datetime) */}
      {showDateFormat && (
        <div className="file-template-editor-field">
          <label
            className="file-template-editor-label"
            htmlFor="prompt-date-format"
          >
            Date Format
          </label>
          <select
            id="prompt-date-format"
            className="file-template-editor-select"
            value={dateOutputFormat}
            onChange={(e) => setDateOutputFormat(e.target.value as DateOutputFormat)}
          >
            {DATE_FORMAT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {dateOutputFormat !== 'custom' && (
            <div className="file-template-editor-hint">
              Format used in the filename. Example: {DATE_FORMAT_OPTIONS.find(o => o.value === dateOutputFormat)?.example}
            </div>
          )}
        </div>
      )}

      {/* Custom Date Format Input (shown when custom is selected) */}
      {showDateFormat && dateOutputFormat === 'custom' && (
        <div className="file-template-editor-field">
          <label
            className="file-template-editor-label"
            htmlFor="prompt-custom-date-format"
          >
            Custom Date Format
          </label>
          <input
            id="prompt-custom-date-format"
            type="text"
            className="file-template-editor-input"
            value={customDateFormat}
            onChange={(e) => setCustomDateFormat(e.target.value)}
            placeholder="e.g., YYYY-MM-DD, MMM D, YYYY"
          />
          <div className="file-template-editor-hint">
            Tokens: YYYY (year), MM (month), DD (day), MMM (Jan), MMMM (January).
            You can also include time tokens: HH, mm, h, A.
          </div>
        </div>
      )}

      {/* Time Format (shown for time/datetime) */}
      {showTimeFormat && (
        <div className="file-template-editor-field">
          <label
            className="file-template-editor-label"
            htmlFor="prompt-time-format"
          >
            Time Format
          </label>
          <select
            id="prompt-time-format"
            className="file-template-editor-select"
            value={timeOutputFormat}
            onChange={(e) => setTimeOutputFormat(e.target.value as TimeOutputFormat)}
          >
            {TIME_FORMAT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {timeOutputFormat !== 'custom' && (
            <div className="file-template-editor-hint">
              Format used in the filename. Example: {TIME_FORMAT_OPTIONS.find(o => o.value === timeOutputFormat)?.example}
            </div>
          )}
        </div>
      )}

      {/* Custom Time Format Input (shown when custom is selected) */}
      {showTimeFormat && timeOutputFormat === 'custom' && (
        <div className="file-template-editor-field">
          <label
            className="file-template-editor-label"
            htmlFor="prompt-custom-time-format"
          >
            Custom Time Format
          </label>
          <input
            id="prompt-custom-time-format"
            type="text"
            className="file-template-editor-input"
            value={customTimeFormat}
            onChange={(e) => setCustomTimeFormat(e.target.value)}
            placeholder="e.g., h:mm A, HH:mm"
          />
          <div className="file-template-editor-hint">
            Tokens: HH (24h), hh (12h padded), h (12h), mm (minutes), A (AM/PM).
            You can also include date tokens: YYYY, MM, DD.
          </div>
        </div>
      )}

      {/* Output Preview (shown for date/time/datetime) */}
      {formatPreview && (
        <div className="file-template-editor-field">
          <div className="file-template-editor-label">Output Preview</div>
          <div className="file-template-prompt-syntax-preview">
            <code>{formatPreview}</code>
          </div>
          <div className="file-template-editor-hint">
            This is what will be inserted into your filename.
          </div>
        </div>
      )}

      {/* Syntax Preview */}
      <div className="file-template-editor-field">
        <div className="file-template-editor-label">Syntax Preview</div>
        <div className="file-template-prompt-syntax-preview">
          <code>{previewSyntax}</code>
        </div>
        <div className="file-template-editor-hint">
          This syntax will be inserted into your title pattern.
        </div>
      </div>

      {/* Actions */}
      <div className="file-template-editor-actions">
        <button type="button" className="mod-muted" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="mod-cta" onClick={handleSave}>
          {isEditing ? "Update Prompt" : "Add Prompt"}
        </button>
      </div>
    </div>
  );
}

interface PromptListItemProps {
  prompt: UserPrompt;
  onEdit: () => void;
  onDelete: () => void;
  onInsert: () => void;
}

export function PromptListItem({
  prompt,
  onEdit,
  onDelete,
  onInsert,
}: PromptListItemProps) {
  const syntax = createPromptSyntax(prompt.name);

  const typeLabels: Record<string, string> = {
    text: "text",
    numeric: "numeric",
    date: "date",
    time: "time",
    datetime: "date & time",
  };

  return (
    <div className="file-template-prompt-item">
      <div className="file-template-prompt-item-info">
        <span className="file-template-prompt-item-name">{prompt.name}</span>
        <span className="file-template-prompt-item-type">
          ({typeLabels[prompt.valueType] || prompt.valueType})
        </span>
      </div>
      <div className="file-template-prompt-item-actions">
        <button
          type="button"
          className="file-template-prompt-item-btn"
          onClick={onInsert}
          title="Insert syntax into title pattern"
        >
          Insert
        </button>
        <button
          type="button"
          className="file-template-prompt-item-btn"
          onClick={onEdit}
          title="Edit prompt"
        >
          Edit
        </button>
        <button
          type="button"
          className="file-template-prompt-item-btn file-template-prompt-item-btn-delete"
          onClick={onDelete}
          title="Delete prompt"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
