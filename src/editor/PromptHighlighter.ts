/**
 * CodeMirror 6 ViewPlugin for prompt syntax highlighting
 *
 * Highlights {% prompt %} syntax in the main editor with visual distinction
 * for brackets, names, types, and formats.
 */

import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { parseFormatString } from "../utils/momentTokens";

/**
 * Decoration styles for different parts of prompt syntax
 */
const bracketDecoration = Decoration.mark({ class: "cm-prompt-bracket" });
const optionalMarkerDecoration = Decoration.mark({ class: "cm-prompt-optional-marker" });
const nameDecoration = Decoration.mark({ class: "cm-prompt-name" });
const colonDecoration = Decoration.mark({ class: "cm-prompt-colon" });
const typeDecoration = Decoration.mark({ class: "cm-prompt-type" });
const formatDecoration = Decoration.mark({ class: "cm-prompt-format" });
const formatWrapperDecoration = Decoration.mark({ class: "cm-format-wrapper" });
const formatTokenDecoration = Decoration.mark({ class: "cm-format-token" });
const formatLiteralDecoration = Decoration.mark({ class: "cm-format-literal" });
const listOptionDecoration = Decoration.mark({ class: "cm-prompt-list-option" });
const listCommaDecoration = Decoration.mark({ class: "cm-prompt-list-comma" });

/**
 * Pattern to match fenced code blocks
 * Used to exclude prompts inside code blocks from highlighting
 */
const CODE_BLOCK_PATTERN = /^(`{3,}|~{3,}).*$/gm;

/**
 * Find all code block ranges in the document
 * @internal Exported for testing
 */
export function findCodeBlockRanges(text: string): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];
  const lines = text.split("\n");
  let inCodeBlock = false;
  let blockStart = 0;
  let currentPos = 0;
  let openingFence = "";

  for (const line of lines) {
    const fenceMatch = line.match(/^(`{3,}|~{3,})/);

    if (fenceMatch) {
      if (!inCodeBlock) {
        // Opening fence
        inCodeBlock = true;
        blockStart = currentPos;
        openingFence = fenceMatch[1][0]; // Get the fence character (` or ~)
      } else if (line.startsWith(openingFence)) {
        // Closing fence (must use same character)
        ranges.push({ from: blockStart, to: currentPos + line.length });
        inCodeBlock = false;
        openingFence = "";
      }
    }

    currentPos += line.length + 1; // +1 for newline
  }

  // If still in code block at end, extend to document end
  if (inCodeBlock) {
    ranges.push({ from: blockStart, to: text.length });
  }

  return ranges;
}

/**
 * Check if a position is inside any code block
 * @internal Exported for testing
 */
export function isInsideCodeBlock(
  pos: number,
  codeBlockRanges: Array<{ from: number; to: number }>
): boolean {
  for (const range of codeBlockRanges) {
    if (pos >= range.from && pos <= range.to) {
      return true;
    }
  }
  return false;
}

/**
 * Pattern to match prompt syntax
 * Captures: opening bracket, optional marker, content, optional marker, closing bracket
 */
const PROMPT_PATTERN = /\{%(\??)([^%]+?)(\??)\s*%\}/g;

/**
 * Represents a parsed format token position
 */
export interface FormatTokenPos {
  start: number;
  end: number;
  isToken: boolean;
}

/**
 * Represents a parsed list option position
 */
export interface ListOptionPos {
  start: number;
  end: number;
}

/**
 * Parse prompt content to identify parts (name, type, format)
 * @internal Exported for testing
 */
export interface PromptParts {
  name: { start: number; end: number };
  type?: { start: number; end: number };
  format?: { start: number; end: number };
  colons: Array<{ pos: number }>;
  /** If format is custom format(...), contains parsed token positions */
  formatTokens?: FormatTokenPos[];
  /** Positions for format( and ) wrapper */
  formatWrapper?: { funcStart: number; funcEnd: number; parenClose: number };
  /** If type is list/multilist, contains parsed option positions and comma positions */
  listOptions?: ListOptionPos[];
  listCommas?: Array<{ pos: number }>;
}

/**
 * Parse prompt content to identify parts (name, type, format)
 * @internal Exported for testing
 */
export function parsePromptContent(content: string, contentStart: number): PromptParts {
  const trimmedContent = content.trim();
  const trimOffset = content.indexOf(trimmedContent);
  const absoluteStart = contentStart + trimOffset;

  const colons: Array<{ pos: number }> = [];
  const parts: PromptParts = {
    name: { start: absoluteStart, end: absoluteStart },
    colons,
  };

  // Check for custom format syntax first: format(...)
  const customFormatMatch = trimmedContent.match(/^([^:]+):(\w+):format\((.+)\)$/);
  if (customFormatMatch) {
    const [, name, type, formatContent] = customFormatMatch;
    parts.name = {
      start: absoluteStart,
      end: absoluteStart + name.length,
    };
    colons.push({ pos: absoluteStart + name.length });
    parts.type = {
      start: absoluteStart + name.length + 1,
      end: absoluteStart + name.length + 1 + type.length,
    };
    colons.push({ pos: absoluteStart + name.length + 1 + type.length });

    // Calculate format wrapper positions
    const formatStart = absoluteStart + name.length + 1 + type.length + 1;
    const formatFuncEnd = formatStart + 7; // "format("
    const formatParenClose = absoluteStart + trimmedContent.length - 1; // ")"

    parts.format = {
      start: formatStart,
      end: absoluteStart + trimmedContent.length,
    };

    parts.formatWrapper = {
      funcStart: formatStart,
      funcEnd: formatFuncEnd,
      parenClose: formatParenClose,
    };

    // Parse the format string content for tokens
    const formatParts = parseFormatString(formatContent);
    const formatContentStart = formatFuncEnd; // After "format("

    parts.formatTokens = formatParts.map(part => ({
      start: formatContentStart + part.start,
      end: formatContentStart + part.end,
      isToken: part.type === 'token',
    }));

    return parts;
  }

  // Find colons to split parts
  const firstColon = trimmedContent.indexOf(":");
  if (firstColon === -1) {
    // Just a name
    parts.name = {
      start: absoluteStart,
      end: absoluteStart + trimmedContent.length,
    };
    return parts;
  }

  // Name before first colon
  parts.name = {
    start: absoluteStart,
    end: absoluteStart + firstColon,
  };
  colons.push({ pos: absoluteStart + firstColon });

  const afterFirstColon = trimmedContent.substring(firstColon + 1);
  const secondColon = afterFirstColon.indexOf(":");

  if (secondColon === -1) {
    // Name:type
    parts.type = {
      start: absoluteStart + firstColon + 1,
      end: absoluteStart + trimmedContent.length,
    };
  } else {
    // Name:type:format
    const typeStr = afterFirstColon.substring(0, secondColon).toLowerCase();
    parts.type = {
      start: absoluteStart + firstColon + 1,
      end: absoluteStart + firstColon + 1 + secondColon,
    };
    colons.push({ pos: absoluteStart + firstColon + 1 + secondColon });

    const formatStart = absoluteStart + firstColon + 1 + secondColon + 1;
    const formatStr = trimmedContent.substring(firstColon + 1 + secondColon + 1);

    parts.format = {
      start: formatStart,
      end: absoluteStart + trimmedContent.length,
    };

    // Check if this is a list/multilist type - parse comma-separated options
    if (typeStr === 'list' || typeStr === 'multilist') {
      const listOptions: ListOptionPos[] = [];
      const listCommas: Array<{ pos: number }> = [];

      let currentPos = formatStart;
      let optionStart = currentPos;

      for (let i = 0; i < formatStr.length; i++) {
        if (formatStr[i] === ',') {
          // End of current option
          if (currentPos > optionStart) {
            listOptions.push({ start: optionStart, end: currentPos });
          }
          listCommas.push({ pos: currentPos });
          currentPos++;
          optionStart = currentPos;
        } else {
          currentPos++;
        }
      }

      // Don't forget the last option
      if (currentPos > optionStart) {
        listOptions.push({ start: optionStart, end: currentPos });
      }

      parts.listOptions = listOptions;
      parts.listCommas = listCommas;
    }
  }

  return parts;
}

/**
 * Build decorations for the visible ranges
 */
function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const text = doc.toString();

  // Find code block ranges to exclude
  const codeBlockRanges = findCodeBlockRanges(text);

  // Collect all decorations first, then sort and add
  const decorations: Array<{ from: number; to: number; decoration: Decoration }> = [];

  // Process each visible range for better performance
  for (const { from, to } of view.visibleRanges) {
    const visibleText = text.slice(from, to);
    const pattern = new RegExp(PROMPT_PATTERN.source, "g");

    let match;
    while ((match = pattern.exec(visibleText)) !== null) {
      const absoluteFrom = from + match.index;
      const absoluteTo = absoluteFrom + match[0].length;

      // Skip if inside a code block
      if (isInsideCodeBlock(absoluteFrom, codeBlockRanges)) {
        continue;
      }

      const [fullMatch, openOptional, content, closeOptional] = match;

      // Calculate positions
      let pos = absoluteFrom;

      // Opening bracket: {% or {%?
      const openBracketEnd = pos + 2; // {%
      decorations.push({ from: pos, to: openBracketEnd, decoration: bracketDecoration });
      pos = openBracketEnd;

      // Optional marker after {%
      if (openOptional === "?") {
        decorations.push({ from: pos, to: pos + 1, decoration: optionalMarkerDecoration });
        pos += 1;
      }

      // Content (name, possibly type, possibly format)
      const contentStart = pos;
      const contentEnd = absoluteTo - 2 - (closeOptional === "?" ? 1 : 0);
      const contentStr = text.slice(contentStart, contentEnd);

      // Parse the content to get parts
      const parts = parsePromptContent(contentStr, contentStart);

      // Add name decoration
      decorations.push({ from: parts.name.start, to: parts.name.end, decoration: nameDecoration });

      // Add first colon if present
      if (parts.colons.length > 0) {
        decorations.push({ from: parts.colons[0].pos, to: parts.colons[0].pos + 1, decoration: colonDecoration });
      }

      // Add type decoration
      if (parts.type) {
        decorations.push({ from: parts.type.start, to: parts.type.end, decoration: typeDecoration });
      }

      // Add second colon if present
      if (parts.colons.length > 1) {
        decorations.push({ from: parts.colons[1].pos, to: parts.colons[1].pos + 1, decoration: colonDecoration });
      }

      // Add format decoration
      if (parts.format) {
        // Check if we have format(...) with parsed tokens
        if (parts.formatWrapper && parts.formatTokens) {
          // Decorate "format(" wrapper
          decorations.push({
            from: parts.formatWrapper.funcStart,
            to: parts.formatWrapper.funcEnd,
            decoration: formatWrapperDecoration,
          });

          // Decorate each token/literal inside format(...)
          for (const tokenPos of parts.formatTokens) {
            decorations.push({
              from: tokenPos.start,
              to: tokenPos.end,
              decoration: tokenPos.isToken ? formatTokenDecoration : formatLiteralDecoration,
            });
          }

          // Decorate closing ")"
          decorations.push({
            from: parts.formatWrapper.parenClose,
            to: parts.formatWrapper.parenClose + 1,
            decoration: formatWrapperDecoration,
          });
        } else if (parts.listOptions && parts.listCommas) {
          // List/multilist type - decorate options and commas separately
          for (const option of parts.listOptions) {
            decorations.push({
              from: option.start,
              to: option.end,
              decoration: listOptionDecoration,
            });
          }
          for (const comma of parts.listCommas) {
            decorations.push({
              from: comma.pos,
              to: comma.pos + 1,
              decoration: listCommaDecoration,
            });
          }
        } else {
          // Regular format (preset like ISO, compact, etc.)
          decorations.push({ from: parts.format.start, to: parts.format.end, decoration: formatDecoration });
        }
      }

      // Optional marker before closing
      pos = contentEnd;
      if (closeOptional === "?") {
        decorations.push({ from: pos, to: pos + 1, decoration: optionalMarkerDecoration });
        pos += 1;
      }

      // Closing bracket: %}
      decorations.push({ from: pos, to: pos + 2, decoration: bracketDecoration });
    }
  }

  // Sort decorations by position and add to builder
  decorations.sort((a, b) => a.from - b.from || a.to - b.to);
  for (const { from, to, decoration } of decorations) {
    builder.add(from, to, decoration);
  }

  return builder.finish();
}

/**
 * ViewPlugin class that manages prompt syntax highlighting
 */
class PromptHighlightPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = buildDecorations(update.view);
    }
  }
}

/**
 * The prompt highlighter extension
 */
export const promptHighlighter = ViewPlugin.fromClass(PromptHighlightPlugin, {
  decorations: (v) => v.decorations,
});
