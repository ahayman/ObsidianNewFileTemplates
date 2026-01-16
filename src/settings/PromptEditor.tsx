/**
 * Prompt Editor Component
 *
 * Form for creating or editing a user prompt in a title template.
 */

import { useState, useCallback } from "react";
import { UserPrompt } from "../types";
import {
  generatePromptId,
  validatePromptName,
  createPromptSyntax,
} from "../utils/promptParser";

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
  const [valueType, setValueType] = useState<"text" | "numeric">(
    prompt?.valueType ?? "text"
  );
  const [error, setError] = useState<string | undefined>();

  const isEditing = !!prompt;

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

    const syntax = createPromptSyntax(trimmedName);
    onSave(savedPrompt, syntax);
  }, [prompt, name, valueType, onSave]);

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
          onChange={(e) => setValueType(e.target.value as "text" | "numeric")}
        >
          <option value="text">Text (any characters)</option>
          <option value="numeric">Numeric (numbers only)</option>
        </select>
        <div className="file-template-editor-hint">
          Numeric prompts will show a number keyboard on mobile devices.
        </div>
      </div>

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

  return (
    <div className="file-template-prompt-item">
      <div className="file-template-prompt-item-info">
        <span className="file-template-prompt-item-name">{prompt.name}</span>
        <span className="file-template-prompt-item-type">
          {prompt.valueType === "numeric" ? "(numeric)" : "(text)"}
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
