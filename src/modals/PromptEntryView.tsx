/**
 * Prompt Entry View Component
 *
 * React component for entering user prompt values.
 * Features:
 * - Real-time title preview
 * - Keyboard navigation (Enter moves to next field)
 * - Input validation
 * - Numeric keyboard support for numeric prompts
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { TitleTemplate, UserPrompt, PromptValues } from "../types";
import {
  validatePromptValue,
  previewWithPrompts,
  allPromptsValid,
  PromptValidationResult,
} from "../utils/promptParser";
import { parseTemplate } from "../utils/templateParser";

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
  // Initialize values with empty strings for each prompt
  const [values, setValues] = useState<PromptValues>(() => {
    const initial: PromptValues = {};
    for (const prompt of prompts) {
      initial[prompt.id] = "";
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

  // Generate title preview
  const titlePreview = useMemo(() => {
    // First substitute prompts, then parse built-in variables
    const withPrompts = previewWithPrompts(template.titlePattern, prompts, values);
    // Parse built-in variables for full preview
    return parseTemplate(withPrompts);
  }, [template.titlePattern, prompts, values]);

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
      onSubmit(values);
    }
  }, [prompts, values, isAllValid, onSubmit]);

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

          return (
            <div key={prompt.id} className="file-template-prompt-modal-field">
              <label
                className="file-template-prompt-modal-label"
                htmlFor={`prompt-${prompt.id}`}
              >
                {prompt.name}
                {prompt.valueType === "numeric" && (
                  <span className="file-template-prompt-item-type">
                    {" "}
                    (number)
                  </span>
                )}
              </label>
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
