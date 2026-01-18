/**
 * EditorSuggest implementation for prompt syntax autocomplete
 *
 * Provides autocomplete suggestions for {% prompt %} syntax in the main editor:
 * - Syntax templates when typing {%
 * - Value types when typing {% name:
 * - Format presets when typing {% name:type:
 */

import {
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  TFile,
} from "obsidian";
import {
  DATE_FORMAT_PRESETS,
  TIME_FORMAT_PRESETS,
  VALUE_TYPE_ALIASES,
} from "../types";

/**
 * Represents a suggestion item for the autocomplete dropdown
 */
interface PromptSuggestion {
  /** Display label */
  label: string;
  /** Category of suggestion */
  type: "syntax" | "valueType" | "dateFormat" | "timeFormat" | "customFormat";
  /** Description shown below the label */
  description: string;
  /** Text to insert when selected */
  insertText: string;
  /** Example output (for format presets) */
  example?: string;
}

/**
 * Context types for different stages of prompt syntax entry
 */
type SuggestionContext =
  | { type: "opening"; query: string }
  | { type: "valueType"; name: string; query: string }
  | { type: "dateFormat"; name: string; valueType: string; query: string }
  | { type: "timeFormat"; name: string; valueType: string; query: string }
  | { type: "datetimeFormat"; name: string; valueType: string; query: string };

/**
 * EditorSuggest for prompt syntax autocomplete
 */
export class PromptSuggest extends EditorSuggest<PromptSuggestion> {
  /**
   * Determines when to trigger the autocomplete
   */
  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    _file: TFile | null
  ): EditorSuggestTriggerInfo | null {
    const line = editor.getLine(cursor.line);
    const beforeCursor = line.slice(0, cursor.ch);

    // Check if we're inside a code block (simple heuristic - check for ``` on previous lines)
    // Full code block detection would require more context
    const fullText = editor.getValue();
    const textUpToCursor = fullText.slice(0, editor.posToOffset(cursor));
    const codeBlockCount = (textUpToCursor.match(/```/g) || []).length;
    if (codeBlockCount % 2 === 1) {
      // Inside a code block, don't trigger
      return null;
    }

    // Pattern 1: Just opened with {% or {%? - suggest syntax templates
    const openingMatch = beforeCursor.match(/\{%\??\s*$/);
    if (openingMatch) {
      return {
        start: { line: cursor.line, ch: cursor.ch },
        end: cursor,
        query: "",
      };
    }

    // Pattern 2: Have name, just typed colon - suggest value types
    // Matches: {% Name: or {%? Name:
    const valueTypeMatch = beforeCursor.match(
      /\{%\??\s*([^:%]+):\s*([a-z]*)$/i
    );
    if (valueTypeMatch) {
      const query = valueTypeMatch[2] || "";
      return {
        start: { line: cursor.line, ch: cursor.ch - query.length },
        end: cursor,
        query: `valueType:${valueTypeMatch[1].trim()}:${query}`,
      };
    }

    // Pattern 3: Have name:type, just typed colon - suggest format presets
    // Matches: {% Name:date: or {% Name:time: or {% Name:datetime:
    const formatMatch = beforeCursor.match(
      /\{%\??\s*([^:%]+):(date|time|datetime):\s*([a-zA-Z0-9-]*)$/i
    );
    if (formatMatch) {
      const query = formatMatch[3] || "";
      const valueType = formatMatch[2].toLowerCase();
      return {
        start: { line: cursor.line, ch: cursor.ch - query.length },
        end: cursor,
        query: `format:${formatMatch[1].trim()}:${valueType}:${query}`,
      };
    }

    // Pattern 4: Typing a name after {% - provide name suggestions or close
    const nameMatch = beforeCursor.match(/\{%\??\s+([^\s:%]*)$/);
    if (nameMatch) {
      const query = nameMatch[1] || "";
      return {
        start: { line: cursor.line, ch: cursor.ch - query.length },
        end: cursor,
        query: `name:${query}`,
      };
    }

    return null;
  }

  /**
   * Generates suggestions based on the current context
   */
  getSuggestions(context: EditorSuggestContext): PromptSuggestion[] {
    const query = context.query;

    // Parse the query to determine context
    if (query === "") {
      // Just opened {% - show helpful templates
      return this.getSyntaxTemplateSuggestions();
    }

    if (query.startsWith("name:")) {
      // Typing a name - suggest closing or type syntax
      const nameQuery = query.slice(5).toLowerCase();
      return this.getNameSuggestions(nameQuery);
    }

    if (query.startsWith("valueType:")) {
      // After name: - suggest value types
      const parts = query.slice(10).split(":");
      const typeQuery = (parts[1] || "").toLowerCase();
      return this.getValueTypeSuggestions(typeQuery);
    }

    if (query.startsWith("format:")) {
      // After name:type: - suggest format presets
      const parts = query.slice(7).split(":");
      const valueType = parts[1] || "";
      const formatQuery = (parts[2] || "").toLowerCase();
      return this.getFormatSuggestions(valueType, formatQuery);
    }

    return [];
  }

  /**
   * Renders a suggestion in the dropdown
   */
  renderSuggestion(suggestion: PromptSuggestion, el: HTMLElement): void {
    const container = el.createDiv({ cls: "prompt-suggest-item" });

    const labelRow = container.createDiv({ cls: "prompt-suggest-label-row" });
    labelRow.createSpan({ cls: "prompt-suggest-label", text: suggestion.label });

    if (suggestion.example) {
      labelRow.createSpan({
        cls: "prompt-suggest-example",
        text: suggestion.example,
      });
    }

    container.createDiv({
      cls: "prompt-suggest-description",
      text: suggestion.description,
    });
  }

  /**
   * Handles selection of a suggestion
   */
  selectSuggestion(
    suggestion: PromptSuggestion,
    _evt: MouseEvent | KeyboardEvent
  ): void {
    if (!this.context) return;

    const { editor, start, end } = this.context;
    editor.replaceRange(suggestion.insertText, start, end);

    // Move cursor to appropriate position after insertion
    const newCh = start.ch + suggestion.insertText.length;
    editor.setCursor({ line: start.line, ch: newCh });
  }

  /**
   * Suggestions for when user just typed {% or {%?
   */
  private getSyntaxTemplateSuggestions(): PromptSuggestion[] {
    return [
      {
        label: "{% Name %}",
        type: "syntax",
        description: "Required text prompt",
        insertText: " Name %}",
      },
      {
        label: "{%? Name ?%}",
        type: "syntax",
        description: "Optional text prompt (use {%? to start)",
        insertText: " Name %}",
      },
      {
        label: "{% Name:text %}",
        type: "syntax",
        description: "Explicit text type",
        insertText: " Name:text %}",
      },
      {
        label: "{% Name:number %}",
        type: "syntax",
        description: "Numeric input only",
        insertText: " Name:number %}",
      },
      {
        label: "{% Name:date %}",
        type: "syntax",
        description: "Date picker input",
        insertText: " Name:date %}",
      },
      {
        label: "{% Name:time %}",
        type: "syntax",
        description: "Time picker input",
        insertText: " Name:time %}",
      },
      {
        label: "{% Name:datetime %}",
        type: "syntax",
        description: "Date and time picker",
        insertText: " Name:datetime %}",
      },
    ];
  }

  /**
   * Suggestions for when typing a prompt name
   */
  private getNameSuggestions(query: string): PromptSuggestion[] {
    const suggestions: PromptSuggestion[] = [
      {
        label: "%}",
        type: "syntax",
        description: "Close prompt (text type)",
        insertText: " %}",
      },
      {
        label: ":text %}",
        type: "syntax",
        description: "Text type with explicit closing",
        insertText: ":text %}",
      },
      {
        label: ":number %}",
        type: "syntax",
        description: "Numeric input",
        insertText: ":number %}",
      },
      {
        label: ":date",
        type: "syntax",
        description: "Date picker (add format after)",
        insertText: ":date:",
      },
      {
        label: ":time",
        type: "syntax",
        description: "Time picker (add format after)",
        insertText: ":time:",
      },
      {
        label: ":datetime",
        type: "syntax",
        description: "DateTime picker (add format after)",
        insertText: ":datetime:",
      },
    ];

    if (!query) return suggestions;

    return suggestions.filter(
      (s) =>
        s.label.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
    );
  }

  /**
   * Suggestions for value types
   */
  private getValueTypeSuggestions(query: string): PromptSuggestion[] {
    const types: PromptSuggestion[] = [
      {
        label: "text",
        type: "valueType",
        description: "Free-form text input",
        insertText: "text %}",
      },
      {
        label: "number",
        type: "valueType",
        description: "Numeric input only",
        insertText: "number %}",
      },
      {
        label: "date",
        type: "valueType",
        description: "Date picker (continue typing : for format)",
        insertText: "date:",
      },
      {
        label: "time",
        type: "valueType",
        description: "Time picker (continue typing : for format)",
        insertText: "time:",
      },
      {
        label: "datetime",
        type: "valueType",
        description: "Date and time picker (continue typing : for format)",
        insertText: "datetime:",
      },
    ];

    if (!query) return types;

    return types.filter(
      (t) =>
        t.label.toLowerCase().startsWith(query) ||
        t.description.toLowerCase().includes(query)
    );
  }

  /**
   * Suggestions for format presets based on value type
   */
  private getFormatSuggestions(
    valueType: string,
    query: string
  ): PromptSuggestion[] {
    const suggestions: PromptSuggestion[] = [];
    const type = valueType.toLowerCase();

    if (type === "date" || type === "datetime") {
      // Add date format presets
      for (const [preset, format] of Object.entries(DATE_FORMAT_PRESETS)) {
        suggestions.push({
          label: preset,
          type: "dateFormat",
          description: `Date format: ${format}`,
          insertText: type === "datetime" ? `${preset},` : `${preset} %}`,
          example: this.getDateExample(format),
        });
      }

      // Add custom format option
      suggestions.push({
        label: "format(...)",
        type: "customFormat",
        description: "Custom date format string",
        insertText: "format(",
        example: "e.g., format(MMM DD)",
      });
    }

    if (type === "time" || type === "datetime") {
      // Add time format presets
      for (const [preset, format] of Object.entries(TIME_FORMAT_PRESETS)) {
        suggestions.push({
          label: preset,
          type: "timeFormat",
          description: `Time format: ${format}`,
          insertText: `${preset} %}`,
          example: this.getTimeExample(format),
        });
      }

      // Add custom format option for time
      if (type === "time") {
        suggestions.push({
          label: "format(...)",
          type: "customFormat",
          description: "Custom time format string",
          insertText: "format(",
          example: "e.g., format(H:mm)",
        });
      }
    }

    if (!query) return suggestions;

    return suggestions.filter(
      (s) =>
        s.label.toLowerCase().startsWith(query) ||
        s.description.toLowerCase().includes(query)
    );
  }

  /**
   * Generate example date output for a format
   */
  private getDateExample(format: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const fullMonthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    switch (format) {
      case "YYYY-MM-DD":
        return `${year}-${month}-${day}`;
      case "YYYYMMDD":
        return `${year}${month}${day}`;
      case "MM-DD-YYYY":
        return `${month}-${day}-${year}`;
      case "DD-MM-YYYY":
        return `${day}-${month}-${year}`;
      case "MMM DD, YYYY":
        return `${monthNames[now.getMonth()]} ${day}, ${year}`;
      case "MMMM DD, YYYY":
        return `${fullMonthNames[now.getMonth()]} ${day}, ${year}`;
      default:
        return "";
    }
  }

  /**
   * Generate example time output for a format
   */
  private getTimeExample(format: string): string {
    const now = new Date();
    const hours24 = now.getHours();
    const hours12 = hours24 % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const ampm = hours24 >= 12 ? "PM" : "AM";

    switch (format) {
      case "HH:mm:ss":
        return `${String(hours24).padStart(2, "0")}:${minutes}:${seconds}`;
      case "HH:mm":
        return `${String(hours24).padStart(2, "0")}:${minutes}`;
      case "HHmm":
        return `${String(hours24).padStart(2, "0")}${minutes}`;
      case "h:mm A":
        return `${hours12}:${minutes} ${ampm}`;
      case "hh:mm A":
        return `${String(hours12).padStart(2, "0")}:${minutes} ${ampm}`;
      default:
        return "";
    }
  }
}
