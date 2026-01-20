/**
 * Bracket Auto-Closure Extension for CodeMirror 6
 *
 * Provides intelligent bracket auto-closure and auto-removal for:
 * - {% %} and {%? ?%} prompt syntax
 * - {{ }} variable syntax (optional, for Settings only)
 * - () parentheses inside prompt syntax
 */

import { EditorView, keymap } from "@codemirror/view";
import { Extension } from "@codemirror/state";

export interface BracketClosureOptions {
  /** Enable auto-closure for {{ }} (default: false, only for Settings Title formatter) */
  enableCurlyBraceClosure?: boolean;
}

/**
 * Checks if the cursor is within a prompt syntax block
 * Looks for opening {%? or {% before cursor without a closing %} or ?%} between them
 */
function isWithinPromptSyntax(text: string, cursorPos: number): boolean {
  const textBefore = text.slice(0, cursorPos);

  // Find the last opening bracket before cursor
  const lastOptionalOpen = textBefore.lastIndexOf("{%?");
  const lastRegularOpen = textBefore.lastIndexOf("{%");

  // Determine which one is more recent (closer to cursor)
  let openPos = -1;
  let isOptional = false;

  // When both match at the same position, it's {%? (optional)
  // When lastOptionalOpen > lastRegularOpen, it's also {%? (optional)
  if (lastOptionalOpen >= 0 && lastOptionalOpen >= lastRegularOpen) {
    openPos = lastOptionalOpen;
    isOptional = true;
  } else if (lastRegularOpen >= 0) {
    // It's a regular {% prompt
    openPos = lastRegularOpen;
  }

  if (openPos < 0) return false;

  // Check if there's a closing bracket between the opening and cursor
  const textBetween = textBefore.slice(openPos);
  if (isOptional) {
    if (textBetween.includes("?%}")) return false;
  } else {
    // For regular prompts, check for %} but not ?%}
    const closingIndex = textBetween.indexOf("%}");
    if (closingIndex >= 0) {
      // Make sure it's not ?%}
      if (closingIndex === 0 || textBetween[closingIndex - 1] !== "?") {
        return false;
      }
    }
  }

  return true;
}

/**
 * Checks if there's only whitespace between cursor and closing brackets
 */
function hasOnlySpacesBefore(text: string, target: string): { found: boolean; endPos: number } {
  const match = text.match(new RegExp(`^(\\s*)(${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`));
  if (match) {
    return { found: true, endPos: match[1].length + match[2].length };
  }
  return { found: false, endPos: 0 };
}

/**
 * Creates the input handler for auto-inserting closing brackets
 */
function createBracketInputHandler(options: BracketClosureOptions): Extension {
  return EditorView.inputHandler.of((view, from, to, text) => {
    const doc = view.state.doc.toString();
    const textBefore = doc.slice(0, from);

    // Handle {%? -> insert space and ?%}
    if (text === "?" && textBefore.endsWith("{%")) {
      const textAfter = doc.slice(to);
      // Don't insert if optional closing already exists nearby
      const closingCheck = hasOnlySpacesBefore(textAfter, "?%}");
      if (!closingCheck.found) {
        // Check if there's an existing %} (from previous {% auto-close) that we should replace
        const existingClosingCheck = hasOnlySpacesBefore(textAfter, "%}");
        // Also check for trailing } from Obsidian's auto-close
        let insertEnd = to;
        if (existingClosingCheck.found) {
          // Consume the existing  %}
          insertEnd = to + existingClosingCheck.endPos;
        } else if (textAfter.startsWith("}")) {
          // Just consume the trailing }
          insertEnd = to + 1;
        }
        view.dispatch({
          changes: { from, to: insertEnd, insert: "? ?%}" },
          selection: { anchor: from + 1 }, // Position cursor right after "?"
        });
        return true;
      }
    }

    // Handle {% -> insert space and %}
    if (text === "%" && textBefore.endsWith("{")) {
      const textAfter = doc.slice(to);
      // Check if next char will be ? (user is typing {%?)
      // Don't auto-close yet, let the ? handler do it
      // But if there's no closing bracket, add it
      const closingCheck = hasOnlySpacesBefore(textAfter, "%}");
      const optionalClosingCheck = hasOnlySpacesBefore(textAfter, "?%}");
      if (!closingCheck.found && !optionalClosingCheck.found) {
        // Check if there's a trailing } from Obsidian's auto-close that we should consume
        const insertEnd = textAfter.startsWith("}") ? to + 1 : to;
        view.dispatch({
          changes: { from, to: insertEnd, insert: "% %}" },
          selection: { anchor: from + 1 }, // Position cursor right after "%"
        });
        return true;
      }
    }

    // Handle {{ -> insert }} (only if enabled)
    if (options.enableCurlyBraceClosure && text === "{" && textBefore.endsWith("{")) {
      const textAfter = doc.slice(to);
      // Don't insert if closing already exists
      if (!textAfter.startsWith("}}")) {
        view.dispatch({
          changes: { from, to, insert: "{}}"},
          selection: { anchor: from + 1 }, // Position cursor between {{ and }}
        });
        return true;
      }
    }

    // Handle ( -> insert ) when inside prompt syntax
    if (text === "(") {
      const fullText = textBefore + text + doc.slice(to);
      if (isWithinPromptSyntax(fullText, from + 1)) {
        const textAfter = doc.slice(to);
        // Don't insert if ) already follows
        if (!textAfter.startsWith(")")) {
          view.dispatch({
            changes: { from, to, insert: "()" },
            selection: { anchor: from + 1 }, // Position cursor between ( and )
          });
          return true;
        }
      }
    }

    return false;
  });
}

/**
 * Creates the keymap for auto-deleting closing brackets on Backspace
 */
function createBracketDeleteKeymap(options: BracketClosureOptions): Extension {
  return keymap.of([
    {
      key: "Backspace",
      run: (view) => {
        const { from, to } = view.state.selection.main;

        // Only handle when no selection
        if (from !== to || from === 0) return false;

        const doc = view.state.doc.toString();
        const textBefore = doc.slice(0, from);
        const textAfter = doc.slice(from);

        // Handle deleting the ? in {%? - also delete the space and ?%}
        if (textBefore.endsWith("{%?")) {
          const closingCheck = hasOnlySpacesBefore(textAfter, "?%}");
          if (closingCheck.found) {
            view.dispatch({
              changes: { from: from - 1, to: from + closingCheck.endPos, insert: "" },
            });
            return true;
          }
        }

        // Handle deleting the % in {% - also delete the space and %}
        // But make sure it's not {%? (don't trigger if next char before cursor is ?)
        if (textBefore.endsWith("{%") && !textBefore.endsWith("{%?")) {
          const closingCheck = hasOnlySpacesBefore(textAfter, "%}");
          if (closingCheck.found) {
            view.dispatch({
              changes: { from: from - 1, to: from + closingCheck.endPos, insert: "" },
            });
            return true;
          }
        }

        // Handle deleting { when {{ is typed - also delete }}
        if (options.enableCurlyBraceClosure && textBefore.endsWith("{{")) {
          if (textAfter.startsWith("}}")) {
            view.dispatch({
              changes: { from: from - 1, to: from + 2, insert: "" },
            });
            return true;
          }
        }

        // Handle deleting ( - also delete ) if immediately after
        if (textBefore.endsWith("(") && textAfter.startsWith(")")) {
          // Only within prompt syntax
          if (isWithinPromptSyntax(doc, from)) {
            view.dispatch({
              changes: { from: from - 1, to: from + 1, insert: "" },
            });
            return true;
          }
        }

        return false;
      },
    },
  ]);
}

/**
 * Creates the bracket closure extension for CodeMirror
 * @param options Configuration options
 * @returns CodeMirror extension for bracket auto-closure
 */
export function createBracketClosureExtension(options: BracketClosureOptions = {}): Extension {
  return [
    createBracketInputHandler(options),
    createBracketDeleteKeymap(options),
  ];
}
