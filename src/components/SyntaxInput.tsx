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
  Completion,
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
import { parseFormatString, MOMENT_TOKENS, getTokenExample } from "../utils/momentTokens";
import { moment } from "obsidian";
import { createBracketClosureExtension } from "./bracketClosure";

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
  /** Enable bracket auto-closure (default: true) */
  autoBracketClosure?: boolean;
  /** Enable {{ }} auto-closure (only for Settings Title formatter, default: true) */
  enableCurlyBraceClosure?: boolean;
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
const formatWrapperDecoration = Decoration.mark({ class: "cm-format-wrapper" });
const formatTokenDecoration = Decoration.mark({ class: "cm-format-token" });
const formatLiteralDecoration = Decoration.mark({ class: "cm-format-literal" });

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

            // Check for custom format syntax: Name:type:format(...)
            const trimmedContent = content.trim();
            const contentStart = start + 2 + (openOptional === "?" ? 1 : 0) + (content.indexOf(trimmedContent));
            const customFormatMatch = trimmedContent.match(/^([^:]+):(\w+):format\((.+)\)$/);

            if (customFormatMatch) {
              // Handle format(...) syntax with token highlighting
              const [, name, type, formatContent] = customFormatMatch;
              let partPos = contentStart;

              // Name
              decorations.push({ from: partPos, to: partPos + name.length, decoration: promptNameDecoration });
              partPos += name.length;

              // First colon
              decorations.push({ from: partPos, to: partPos + 1, decoration: promptColonDecoration });
              partPos += 1;

              // Type
              decorations.push({ from: partPos, to: partPos + type.length, decoration: promptTypeDecoration });
              partPos += type.length;

              // Second colon
              decorations.push({ from: partPos, to: partPos + 1, decoration: promptColonDecoration });
              partPos += 1;

              // format( wrapper
              const formatFuncStart = partPos;
              decorations.push({ from: formatFuncStart, to: formatFuncStart + 7, decoration: formatWrapperDecoration });
              partPos += 7; // "format("

              // Parse and highlight format tokens
              const formatParts = parseFormatString(formatContent);
              for (const part of formatParts) {
                decorations.push({
                  from: partPos + part.start,
                  to: partPos + part.end,
                  decoration: part.type === 'token' ? formatTokenDecoration : formatLiteralDecoration,
                });
              }

              // Closing paren )
              const closingParenPos = formatFuncStart + 7 + formatContent.length;
              decorations.push({ from: closingParenPos, to: closingParenPos + 1, decoration: formatWrapperDecoration });
            } else {
              // Standard parsing: Name:type:format
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
      apply: `${v}}}`,
      description: getVariableDescription(v),
    } as CustomCompletion)),
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
 * Generate example date output for a format
 */
function getDateExample(format: string): string {
  return moment().format(format);
}

/**
 * Generate example time output for a format
 */
function getTimeExample(format: string): string {
  return moment().format(format);
}

/**
 * Custom completion option interface with additional display properties
 */
interface CustomCompletion extends Completion {
  displayLabel?: string;
  example?: string;
  description?: string;
  isPreview?: boolean;
}

/**
 * Custom render function for completion items with inline details
 */
function renderCompletion(completion: Completion, _state: EditorState): Node | null {
  const custom = completion as CustomCompletion;
  const container = document.createElement("div");
  container.className = custom.isPreview
    ? "cm-completion-item cm-completion-item-preview"
    : "cm-completion-item";

  // Main row with label and example
  const mainRow = document.createElement("div");
  mainRow.className = "cm-completion-main-row";

  const label = document.createElement("span");
  label.className = "cm-completion-item-label";
  label.textContent = custom.displayLabel || custom.label;
  mainRow.appendChild(label);

  if (custom.example && !custom.isPreview) {
    const example = document.createElement("span");
    example.className = "cm-completion-item-example";
    example.textContent = custom.example;
    mainRow.appendChild(example);
  }

  container.appendChild(mainRow);

  // Description row
  if (custom.description) {
    const desc = document.createElement("div");
    desc.className = "cm-completion-item-description";
    desc.textContent = custom.description;
    container.appendChild(desc);
  }

  return container;
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
        { label: "Name %}", description: "Text prompt" } as CustomCompletion,
        { label: "Name:text %}", description: "Explicit text type" } as CustomCompletion,
        { label: "Name:number %}", description: "Numeric input only" } as CustomCompletion,
        { label: "Name:date:", description: "Date picker with format" } as CustomCompletion,
        { label: "Name:time:", description: "Time picker with format" } as CustomCompletion,
        { label: "Name:datetime:", description: "DateTime picker with format" } as CustomCompletion,
      ],
    };
  }

  // Check for type completion
  const typeMatch = text.match(/\{%\??\s*[^:%]+:\s*([a-z]*)$/i);
  if (typeMatch) {
    const query = typeMatch[1].toLowerCase();
    const typeOptions: Array<{ name: string; desc: string; apply: string }> = [
      { name: "text", desc: "Free-form text input", apply: "text %}" },
      { name: "number", desc: "Numeric input only", apply: "number %}" },
      { name: "date", desc: "Date picker (add format)", apply: "date:" },
      { name: "time", desc: "Time picker (add format)", apply: "time:" },
      { name: "datetime", desc: "Date and time picker", apply: "datetime:" },
    ];
    return {
      from: context.pos - query.length,
      options: typeOptions
        .filter((t) => t.name.startsWith(query))
        .map((t) => ({
          label: t.name,
          apply: t.apply,
          description: t.desc,
        } as CustomCompletion)),
    };
  }

  // Check for format completion
  const formatMatch = text.match(/\{%\??\s*[^:%]+:(date|time|datetime):\s*([a-zA-Z0-9-]*)$/i);
  if (formatMatch) {
    const valueType = formatMatch[1].toLowerCase();
    const query = formatMatch[2].toLowerCase();

    const options: CustomCompletion[] = [];

    if (valueType === "date" || valueType === "datetime") {
      for (const [preset, format] of Object.entries(DATE_FORMAT_PRESETS)) {
        if (preset.toLowerCase().startsWith(query)) {
          const example = getDateExample(format);
          options.push({
            label: preset,
            apply: valueType === "datetime" ? `${preset},` : `${preset} %}`,
            example: example,
            description: `Format: ${format}`,
          });
        }
      }
    }

    if (valueType === "time" || valueType === "datetime") {
      for (const [preset, format] of Object.entries(TIME_FORMAT_PRESETS)) {
        if (preset.toLowerCase().startsWith(query)) {
          const example = getTimeExample(format);
          options.push({
            label: preset,
            apply: `${preset} %}`,
            example: example,
            description: `Format: ${format}`,
          });
        }
      }
    }

    if ("format".startsWith(query)) {
      options.push({
        label: "format(...)",
        apply: "format(",
        description: "Custom moment.js format string",
      });
    }

    return {
      from: context.pos - query.length,
      options,
    };
  }

  // Check for format token completion inside format(...)
  const formatTokenMatch = text.match(/\{%\??\s*[^:%]+:(date|time|datetime):format\(([^)]*)$/i);
  if (formatTokenMatch) {
    const formatContent = formatTokenMatch[2] || "";
    const valueType = formatTokenMatch[1].toLowerCase();
    // Get the last partial token being typed (letters only, after any non-letter)
    const lastTokenMatch = formatContent.match(/([A-Za-z]*)$/);
    const query = lastTokenMatch ? lastTokenMatch[1].toLowerCase() : "";

    // Sort tokens based on value type
    let sortedTokens = [...MOMENT_TOKENS];
    if (valueType === "date") {
      sortedTokens.sort((a, b) => {
        const dateCategories = ["year", "month", "day"];
        const aIsDate = dateCategories.includes(a.category);
        const bIsDate = dateCategories.includes(b.category);
        if (aIsDate && !bIsDate) return -1;
        if (!aIsDate && bIsDate) return 1;
        return 0;
      });
    } else if (valueType === "time") {
      sortedTokens.sort((a, b) => {
        const timeCategories = ["hour", "minute", "second", "ampm"];
        const aIsTime = timeCategories.includes(a.category);
        const bIsTime = timeCategories.includes(b.category);
        if (aIsTime && !bIsTime) return -1;
        if (!aIsTime && bIsTime) return 1;
        return 0;
      });
    }

    // Filter tokens by query
    const filteredTokens = query
      ? sortedTokens.filter(
          (t) =>
            t.token.toLowerCase().startsWith(query) ||
            t.description.toLowerCase().includes(query)
        )
      : sortedTokens;

    const options: CustomCompletion[] = [];

    // Add live preview at the top if there's any format content
    if (formatContent) {
      try {
        const formattedPreview = moment().format(formatContent);
        options.push({
          label: formattedPreview,
          displayLabel: `Preview: ${formattedPreview}`,
          apply: "", // Don't insert anything when selecting preview
          description: `Current format: ${formatContent}`,
          isPreview: true,
          boost: 99, // Ensure preview appears at top
        });
      } catch {
        // If format is invalid, still show what we have
        options.push({
          label: "(invalid)",
          displayLabel: "Preview: (invalid format)",
          apply: "",
          description: `Current format: ${formatContent}`,
          isPreview: true,
          boost: 99,
        });
      }
    }

    // Add token options with examples (already filtered manually above)
    options.push(
      ...filteredTokens.map((token) => {
        const example = getTokenExample(token);
        return {
          label: token.token,
          example: example,
          description: token.description,
        } as CustomCompletion;
      })
    );

    return {
      from: context.pos - query.length,
      options,
      filter: false, // Disable CodeMirror filtering - we filter tokens manually above
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
  autoBracketClosure = true,
  enableCurlyBraceClosure = true,
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
      // Add bracket closure extension BEFORE default keymap so its Backspace handler takes precedence
      ...(autoBracketClosure ? [createBracketClosureExtension({ enableCurlyBraceClosure })] : []),
      keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
      singleLineTheme,
      EditorView.lineWrapping,
      createHighlighter(enableVariables, enablePrompts),
      autocompletion({
        override: completionSources,
        activateOnTyping: true,
        addToOptions: [
          {
            render: renderCompletion,
            position: 50, // After icons, before label
          },
        ],
        icons: false, // Disable default icons
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
  }, [enableVariables, enablePrompts, autoBracketClosure, enableCurlyBraceClosure]); // Recreate on feature toggle

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
