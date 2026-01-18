/**
 * SyntaxInput Component
 *
 * A CodeMirror 6-based input field with syntax highlighting and autocomplete
 * for template variables ({{var}}) and prompts ({% prompt %}).
 */

import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, placeholder as placeholderExt } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  autocompletion,
  completionKeymap,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import {
  SUPPORTED_VARIABLES,
} from "../utils/templateParser";
import {
  DATE_FORMAT_PRESETS,
  TIME_FORMAT_PRESETS,
} from "../types";

interface SyntaxInputProps {
  /** Current value */
  value: string;
  /** Called when value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Enable {{variable}} highlighting and autocomplete */
  enableVariables?: boolean;
  /** Enable {% prompt %} highlighting and autocomplete */
  enablePrompts?: boolean;
  /** Input ID for accessibility */
  id?: string;
  /** Additional CSS class */
  className?: string;
}

// Decoration styles for variables
const variableBracketDecoration = Decoration.mark({ class: "cm-variable-bracket" });
const variableNameDecoration = Decoration.mark({ class: "cm-variable-name" });
const variableInvalidDecoration = Decoration.mark({ class: "cm-variable-invalid" });

// Decoration styles for prompts
const promptBracketDecoration = Decoration.mark({ class: "cm-prompt-bracket" });
const promptOptionalDecoration = Decoration.mark({ class: "cm-prompt-optional-marker" });
const promptNameDecoration = Decoration.mark({ class: "cm-prompt-name" });
const promptColonDecoration = Decoration.mark({ class: "cm-prompt-colon" });
const promptTypeDecoration = Decoration.mark({ class: "cm-prompt-type" });
const promptFormatDecoration = Decoration.mark({ class: "cm-prompt-format" });

/**
 * Build decorations for variable syntax: {{variable}}
 */
function buildVariableDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const text = view.state.doc.toString();

  const pattern = /\{\{(\w+)\}\}/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const varName = match[1];

    // Opening bracket {{
    builder.add(start, start + 2, variableBracketDecoration);

    // Variable name - check if valid
    const isValid = SUPPORTED_VARIABLES.includes(varName.toLowerCase());
    builder.add(
      start + 2,
      end - 2,
      isValid ? variableNameDecoration : variableInvalidDecoration
    );

    // Closing bracket }}
    builder.add(end - 2, end, variableBracketDecoration);
  }

  return builder.finish();
}

/**
 * Build decorations for prompt syntax: {% prompt %}
 */
function buildPromptDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const text = view.state.doc.toString();

  const pattern = /\{%(\??)([^%]+?)(\??)\s*%\}/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const start = match.index;
    const [fullMatch, openOptional, content, closeOptional] = match;
    let pos = start;

    // Opening bracket {%
    builder.add(pos, pos + 2, promptBracketDecoration);
    pos += 2;

    // Optional marker ?
    if (openOptional === "?") {
      builder.add(pos, pos + 1, promptOptionalDecoration);
      pos += 1;
    }

    // Parse content
    const trimmedContent = content.trim();
    const contentStart = text.indexOf(trimmedContent, pos);

    // Check for custom format
    const customMatch = trimmedContent.match(/^([^:]+):(\w+):format\((.+)\)$/);
    if (customMatch) {
      const [, name, type, format] = customMatch;
      builder.add(contentStart, contentStart + name.length, promptNameDecoration);
      builder.add(contentStart + name.length, contentStart + name.length + 1, promptColonDecoration);
      builder.add(contentStart + name.length + 1, contentStart + name.length + 1 + type.length, promptTypeDecoration);
      builder.add(contentStart + name.length + 1 + type.length, contentStart + name.length + 1 + type.length + 1, promptColonDecoration);
      builder.add(contentStart + name.length + 1 + type.length + 1, contentStart + trimmedContent.length, promptFormatDecoration);
    } else {
      // Parse name:type:format
      const parts = trimmedContent.split(":");
      let partPos = contentStart;

      // Name
      builder.add(partPos, partPos + parts[0].length, promptNameDecoration);
      partPos += parts[0].length;

      // Type
      if (parts.length > 1) {
        builder.add(partPos, partPos + 1, promptColonDecoration);
        partPos += 1;
        builder.add(partPos, partPos + parts[1].length, promptTypeDecoration);
        partPos += parts[1].length;
      }

      // Format
      if (parts.length > 2) {
        builder.add(partPos, partPos + 1, promptColonDecoration);
        partPos += 1;
        const formatPart = parts.slice(2).join(":");
        builder.add(partPos, partPos + formatPart.length, promptFormatDecoration);
      }
    }

    // Calculate closing position
    const contentEnd = start + fullMatch.length - 2 - (closeOptional === "?" ? 1 : 0);
    pos = contentEnd;

    // Closing optional marker
    if (closeOptional === "?") {
      builder.add(pos, pos + 1, promptOptionalDecoration);
      pos += 1;
    }

    // Closing bracket %}
    builder.add(pos, pos + 2, promptBracketDecoration);
  }

  return builder.finish();
}

/**
 * Combined highlighter for both variables and prompts
 */
function createHighlighter(enableVariables: boolean, enablePrompts: boolean) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const text = view.state.doc.toString();

        // Collect all decorations with positions
        const decorations: Array<{ from: number; to: number; decoration: Decoration }> = [];

        if (enableVariables) {
          const pattern = /\{\{(\w+)\}\}/g;
          let match;
          while ((match = pattern.exec(text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            const varName = match[1];
            const isValid = SUPPORTED_VARIABLES.includes(varName.toLowerCase());

            decorations.push({ from: start, to: start + 2, decoration: variableBracketDecoration });
            decorations.push({
              from: start + 2,
              to: end - 2,
              decoration: isValid ? variableNameDecoration : variableInvalidDecoration,
            });
            decorations.push({ from: end - 2, to: end, decoration: variableBracketDecoration });
          }
        }

        if (enablePrompts) {
          const pattern = /\{%(\??)([^%]+?)(\??)\s*%\}/g;
          let match;
          while ((match = pattern.exec(text)) !== null) {
            const start = match.index;
            const [fullMatch, openOptional, content, closeOptional] = match;
            let pos = start;

            decorations.push({ from: pos, to: pos + 2, decoration: promptBracketDecoration });
            pos += 2;

            if (openOptional === "?") {
              decorations.push({ from: pos, to: pos + 1, decoration: promptOptionalDecoration });
              pos += 1;
            }

            // Simplified content parsing for combined view
            const trimmedContent = content.trim();
            const contentStart = start + 2 + (openOptional === "?" ? 1 : 0) + (content.indexOf(trimmedContent));
            const parts = trimmedContent.split(":");
            let partPos = contentStart;

            decorations.push({ from: partPos, to: partPos + parts[0].length, decoration: promptNameDecoration });
            partPos += parts[0].length;

            for (let i = 1; i < parts.length; i++) {
              decorations.push({ from: partPos, to: partPos + 1, decoration: promptColonDecoration });
              partPos += 1;
              const dec = i === 1 ? promptTypeDecoration : promptFormatDecoration;
              decorations.push({ from: partPos, to: partPos + parts[i].length, decoration: dec });
              partPos += parts[i].length;
            }

            const closeStart = start + fullMatch.length - 2 - (closeOptional === "?" ? 1 : 0);
            if (closeOptional === "?") {
              decorations.push({ from: closeStart, to: closeStart + 1, decoration: promptOptionalDecoration });
              decorations.push({ from: closeStart + 1, to: closeStart + 3, decoration: promptBracketDecoration });
            } else {
              decorations.push({ from: closeStart, to: closeStart + 2, decoration: promptBracketDecoration });
            }
          }
        }

        // Sort by position and add to builder
        decorations.sort((a, b) => a.from - b.from || a.to - b.to);
        for (const { from, to, decoration } of decorations) {
          builder.add(from, to, decoration);
        }

        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations }
  );
}

/**
 * Variable completions source
 */
function variableCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/\{\{[a-z]*$/i);
  if (!word) return null;

  return {
    from: word.from + 2,
    options: SUPPORTED_VARIABLES.map((v) => ({
      label: v,
      type: "variable",
      apply: `${v}}}`,
      detail: getVariableDescription(v),
    })),
  };
}

/**
 * Get description for a variable name
 * @internal Exported for testing
 */
export function getVariableDescription(variable: string): string {
  switch (variable) {
    case "date": return "Current date";
    case "time": return "Current time";
    case "datetime": return "Date and time";
    case "year": return "Current year";
    case "month": return "Current month";
    case "day": return "Current day";
    case "timestamp": return "Unix timestamp";
    case "counter": return "Auto-increment";
    default: return "";
  }
}

/**
 * Prompt completions source
 */
function promptCompletions(context: CompletionContext): CompletionResult | null {
  const text = context.state.sliceDoc(0, context.pos);

  // Check for {% opening
  const openMatch = text.match(/\{%\??\s*$/);
  if (openMatch) {
    return {
      from: context.pos,
      options: [
        { label: "Name %}", type: "text", detail: "Text prompt" },
        { label: "Name:text %}", type: "text", detail: "Explicit text" },
        { label: "Name:number %}", type: "text", detail: "Numeric input" },
        { label: "Name:date:", type: "text", detail: "Date picker" },
        { label: "Name:time:", type: "text", detail: "Time picker" },
        { label: "Name:datetime:", type: "text", detail: "DateTime picker" },
      ],
    };
  }

  // Check for type completion
  const typeMatch = text.match(/\{%\??\s*[^:%]+:\s*([a-z]*)$/i);
  if (typeMatch) {
    const query = typeMatch[1].toLowerCase();
    const types = ["text", "number", "date", "time", "datetime"];
    return {
      from: context.pos - query.length,
      options: types
        .filter((t) => t.startsWith(query))
        .map((t) => ({
          label: t,
          type: "type",
          apply: t === "text" || t === "number" ? `${t} %}` : `${t}:`,
        })),
    };
  }

  // Check for format completion
  const formatMatch = text.match(/\{%\??\s*[^:%]+:(date|time|datetime):\s*([a-zA-Z0-9-]*)$/i);
  if (formatMatch) {
    const valueType = formatMatch[1].toLowerCase();
    const query = formatMatch[2].toLowerCase();

    const options: Array<{ label: string; type: string; apply: string; detail?: string }> = [];

    if (valueType === "date" || valueType === "datetime") {
      for (const [preset, format] of Object.entries(DATE_FORMAT_PRESETS)) {
        if (preset.toLowerCase().startsWith(query)) {
          options.push({
            label: preset,
            type: "constant",
            apply: valueType === "datetime" ? `${preset},` : `${preset} %}`,
            detail: format,
          });
        }
      }
    }

    if (valueType === "time" || valueType === "datetime") {
      for (const [preset, format] of Object.entries(TIME_FORMAT_PRESETS)) {
        if (preset.toLowerCase().startsWith(query)) {
          options.push({
            label: preset,
            type: "constant",
            apply: `${preset} %}`,
            detail: format,
          });
        }
      }
    }

    if ("format".startsWith(query)) {
      options.push({
        label: "format(...)",
        type: "function",
        apply: "format(",
        detail: "Custom format",
      });
    }

    return {
      from: context.pos - query.length,
      options,
    };
  }

  return null;
}

/**
 * Single-line theme that prevents Enter from creating new lines
 */
const singleLineTheme = EditorView.theme({
  "&": {
    maxHeight: "none",
  },
  ".cm-content": {
    padding: "8px 10px",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-scroller": {
    overflow: "hidden",
  },
});

/**
 * Prevent Enter key from inserting newlines
 */
const preventNewline = keymap.of([
  {
    key: "Enter",
    run: () => true, // Consume the event
  },
]);

export function SyntaxInput({
  value,
  onChange,
  placeholder = "",
  enableVariables = true,
  enablePrompts = true,
  id,
  className = "",
}: SyntaxInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref updated
  onChangeRef.current = onChange;

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    const completionSources = [];
    if (enableVariables) {
      completionSources.push(variableCompletions);
    }
    if (enablePrompts) {
      completionSources.push(promptCompletions);
    }

    const extensions = [
      history(),
      preventNewline,
      keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
      singleLineTheme,
      EditorView.lineWrapping,
      createHighlighter(enableVariables, enablePrompts),
      autocompletion({
        override: completionSources,
        activateOnTyping: true,
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          onChangeRef.current(newValue);
        }
      }),
    ];

    if (placeholder) {
      extensions.push(placeholderExt(placeholder));
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [enableVariables, enablePrompts]); // Recreate on feature toggle

  // Update value from outside
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      id={id}
      role="textbox"
      aria-multiline="false"
      className={`file-template-syntax-input ${className}`}
    />
  );
}
