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

/**
 * Decoration styles for different parts of prompt syntax
 */
const bracketDecoration = Decoration.mark({ class: "cm-prompt-bracket" });
const optionalMarkerDecoration = Decoration.mark({ class: "cm-prompt-optional-marker" });
const nameDecoration = Decoration.mark({ class: "cm-prompt-name" });
const colonDecoration = Decoration.mark({ class: "cm-prompt-colon" });
const typeDecoration = Decoration.mark({ class: "cm-prompt-type" });
const formatDecoration = Decoration.mark({ class: "cm-prompt-format" });

/**
 * Pattern to match fenced code blocks
 * Used to exclude prompts inside code blocks from highlighting
 */
const CODE_BLOCK_PATTERN = /^(`{3,}|~{3,}).*$/gm;

/**
 * Find all code block ranges in the document
 */
function findCodeBlockRanges(text: string): Array<{ from: number; to: number }> {
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
 */
function isInsideCodeBlock(
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
 * Parse prompt content to identify parts (name, type, format)
 */
interface PromptParts {
  name: { start: number; end: number };
  type?: { start: number; end: number };
  format?: { start: number; end: number };
  colons: Array<{ pos: number }>;
}

function parsePromptContent(content: string, contentStart: number): PromptParts {
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
    const [, name, type, format] = customFormatMatch;
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
    parts.format = {
      start: absoluteStart + name.length + 1 + type.length + 1,
      end: absoluteStart + trimmedContent.length,
    };
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
    parts.type = {
      start: absoluteStart + firstColon + 1,
      end: absoluteStart + firstColon + 1 + secondColon,
    };
    colons.push({ pos: absoluteStart + firstColon + 1 + secondColon });
    parts.format = {
      start: absoluteStart + firstColon + 1 + secondColon + 1,
      end: absoluteStart + trimmedContent.length,
    };
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
      builder.add(pos, openBracketEnd, bracketDecoration);
      pos = openBracketEnd;

      // Optional marker after {%
      if (openOptional === "?") {
        builder.add(pos, pos + 1, optionalMarkerDecoration);
        pos += 1;
      }

      // Content (name, possibly type, possibly format)
      const contentStart = pos;
      const contentEnd = absoluteTo - 2 - (closeOptional === "?" ? 1 : 0);
      const contentStr = text.slice(contentStart, contentEnd);

      // Parse the content to get parts
      const parts = parsePromptContent(contentStr, contentStart);

      // Add decorations for each part
      builder.add(parts.name.start, parts.name.end, nameDecoration);

      for (const colon of parts.colons) {
        builder.add(colon.pos, colon.pos + 1, colonDecoration);
      }

      if (parts.type) {
        builder.add(parts.type.start, parts.type.end, typeDecoration);
      }

      if (parts.format) {
        builder.add(parts.format.start, parts.format.end, formatDecoration);
      }

      // Optional marker before closing
      pos = contentEnd;
      if (closeOptional === "?") {
        builder.add(pos, pos + 1, optionalMarkerDecoration);
        pos += 1;
      }

      // Closing bracket: %}
      builder.add(pos, pos + 2, bracketDecoration);
    }
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
