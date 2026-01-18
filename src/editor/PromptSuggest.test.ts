/**
 * Unit tests for PromptSuggest
 */

import { App, Editor, EditorPosition } from "obsidian";
import { PromptSuggest } from "./PromptSuggest";

// Mock Obsidian's HTML element extensions
function mockObsidianElement(el: HTMLElement): HTMLElement {
  (el as any).createDiv = (options?: { cls?: string; text?: string }) => {
    const div = document.createElement("div");
    if (options?.cls) div.className = options.cls;
    if (options?.text) div.textContent = options.text;
    el.appendChild(div);
    return mockObsidianElement(div);
  };
  (el as any).createSpan = (options?: { cls?: string; text?: string }) => {
    const span = document.createElement("span");
    if (options?.cls) span.className = options.cls;
    if (options?.text) span.textContent = options.text;
    el.appendChild(span);
    return mockObsidianElement(span);
  };
  return el;
}

describe("PromptSuggest", () => {
  let app: App;
  let suggest: PromptSuggest;

  beforeEach(() => {
    app = new App();
    suggest = new PromptSuggest(app);
  });

  describe("onTrigger", () => {
    describe("opening patterns", () => {
      it("should trigger on {% ", () => {
        const editor = new Editor("{% ");
        const cursor: EditorPosition = { line: 0, ch: 3 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toBe("");
      });

      it("should trigger on {%? ", () => {
        const editor = new Editor("{%? ");
        const cursor: EditorPosition = { line: 0, ch: 4 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toBe("");
      });

      it("should trigger on {% without space", () => {
        const editor = new Editor("{%");
        const cursor: EditorPosition = { line: 0, ch: 2 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
      });
    });

    describe("name patterns", () => {
      it("should trigger when typing a name after {% ", () => {
        const editor = new Editor("{% Na");
        const cursor: EditorPosition = { line: 0, ch: 5 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toBe("name:Na");
      });

      it("should trigger when typing a name after {%? ", () => {
        const editor = new Editor("{%? MyPrompt");
        const cursor: EditorPosition = { line: 0, ch: 12 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toBe("name:MyPrompt");
      });
    });

    describe("value type patterns", () => {
      it("should trigger on {% Name:", () => {
        const editor = new Editor("{% Name:");
        const cursor: EditorPosition = { line: 0, ch: 8 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toBe("valueType:Name:");
      });

      it("should trigger on {% Name:da (partial type)", () => {
        const editor = new Editor("{% Name:da");
        const cursor: EditorPosition = { line: 0, ch: 10 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toBe("valueType:Name:da");
      });

      it("should trigger on {%? OptionalName:", () => {
        const editor = new Editor("{%? OptionalName:");
        const cursor: EditorPosition = { line: 0, ch: 17 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toContain("valueType:");
      });
    });

    describe("format patterns", () => {
      it("should trigger on {% Name:date:", () => {
        const editor = new Editor("{% Name:date:");
        const cursor: EditorPosition = { line: 0, ch: 13 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toBe("format:Name:date:");
      });

      it("should trigger on {% Name:time:", () => {
        const editor = new Editor("{% Name:time:");
        const cursor: EditorPosition = { line: 0, ch: 13 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toBe("format:Name:time:");
      });

      it("should trigger on {% Name:datetime:", () => {
        const editor = new Editor("{% Name:datetime:");
        const cursor: EditorPosition = { line: 0, ch: 17 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toBe("format:Name:datetime:");
      });

      it("should trigger on {% Name:date:I (partial format)", () => {
        const editor = new Editor("{% Name:date:I");
        const cursor: EditorPosition = { line: 0, ch: 14 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toBe("format:Name:date:I");
      });
    });

    describe("format token patterns (inside format(...))", () => {
      it("should trigger on {% Name:date:format(", () => {
        const editor = new Editor("{% Name:date:format(");
        const cursor: EditorPosition = { line: 0, ch: 20 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        // Query includes tokenQuery|fullFormatContent
        expect(result?.query).toBe("formatToken:Name:date:|");
      });

      it("should trigger on {% Name:date:format(YYYY", () => {
        const editor = new Editor("{% Name:date:format(YYYY");
        const cursor: EditorPosition = { line: 0, ch: 24 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        // Query includes tokenQuery|fullFormatContent
        expect(result?.query).toBe("formatToken:Name:date:YYYY|YYYY");
      });

      it("should trigger on {% Name:date:format(YYYY-MM-", () => {
        const editor = new Editor("{% Name:date:format(YYYY-MM-");
        const cursor: EditorPosition = { line: 0, ch: 28 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        // Query should be empty since we're after a non-letter, but full format is preserved
        expect(result?.query).toBe("formatToken:Name:date:|YYYY-MM-");
      });

      it("should trigger with partial token after separator", () => {
        const editor = new Editor("{% Date:date:format(YYYY-M");
        const cursor: EditorPosition = { line: 0, ch: 26 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toBe("formatToken:Date:date:M|YYYY-M");
      });

      it("should trigger for time format", () => {
        const editor = new Editor("{% Time:time:format(HH:");
        const cursor: EditorPosition = { line: 0, ch: 23 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toBe("formatToken:Time:time:|HH:");
      });

      it("should trigger for datetime format", () => {
        const editor = new Editor("{% When:datetime:format(YYYY-");
        const cursor: EditorPosition = { line: 0, ch: 29 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toBe("formatToken:When:datetime:|YYYY-");
      });
    });

    describe("code block detection", () => {
      it("should NOT trigger inside a code block", () => {
        const editor = new Editor("```\n{% Name\n```");
        const cursor: EditorPosition = { line: 1, ch: 7 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).toBeNull();
      });

      it("should trigger after a closed code block", () => {
        const editor = new Editor("```\ncode\n```\n{% ");
        const cursor: EditorPosition = { line: 3, ch: 3 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
      });

      it("should trigger before a code block", () => {
        const editor = new Editor("{% \n```\ncode\n```");
        const cursor: EditorPosition = { line: 0, ch: 3 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
      });
    });

    describe("non-matching patterns", () => {
      it("should NOT trigger on plain text", () => {
        const editor = new Editor("Hello world");
        const cursor: EditorPosition = { line: 0, ch: 11 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).toBeNull();
      });

      it("should NOT trigger on {{ (variable syntax)", () => {
        const editor = new Editor("{{date}}");
        const cursor: EditorPosition = { line: 0, ch: 2 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).toBeNull();
      });

      it("should NOT trigger on single {", () => {
        const editor = new Editor("{ ");
        const cursor: EditorPosition = { line: 0, ch: 2 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).toBeNull();
      });

      it("should NOT trigger after closed prompt", () => {
        const editor = new Editor("{% Name %} text");
        const cursor: EditorPosition = { line: 0, ch: 15 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).toBeNull();
      });
    });

    describe("multiline content", () => {
      it("should trigger on second line", () => {
        const editor = new Editor("First line\n{% ");
        const cursor: EditorPosition = { line: 1, ch: 3 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
      });

      it("should trigger in middle of document", () => {
        const editor = new Editor("Line 1\nLine 2\n{% Name:\nLine 4");
        const cursor: EditorPosition = { line: 2, ch: 8 };
        const result = suggest.onTrigger(cursor, editor, null);

        expect(result).not.toBeNull();
        expect(result?.query).toContain("valueType:");
      });
    });
  });

  describe("getSuggestions", () => {
    describe("empty query (just opened)", () => {
      it("should return syntax template suggestions", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("", editor);

        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.some((s) => s.label.includes("{% Name %}"))).toBe(true);
        expect(suggestions.some((s) => s.label.includes("{% Name:date %}"))).toBe(true);
        expect(suggestions.some((s) => s.label.includes("{% Name:number %}"))).toBe(true);
      });

      it("should include all prompt types in templates", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("", editor);
        const labels = suggestions.map((s) => s.label);

        expect(labels).toContain("{% Name %}");
        expect(labels).toContain("{% Name:text %}");
        expect(labels).toContain("{% Name:number %}");
        expect(labels).toContain("{% Name:date %}");
        expect(labels).toContain("{% Name:time %}");
        expect(labels).toContain("{% Name:datetime %}");
      });
    });

    describe("name query", () => {
      it("should return closing suggestions when typing name", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("name:", editor);

        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.some((s) => s.insertText.includes("%}"))).toBe(true);
      });

      it("should filter suggestions based on query", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("name:date", editor);

        expect(suggestions.every((s) =>
          s.label.toLowerCase().includes("date") ||
          s.description.toLowerCase().includes("date")
        )).toBe(true);
      });
    });

    describe("valueType query", () => {
      it("should return value type suggestions", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("valueType:Name:", editor);

        expect(suggestions.length).toBe(5);
        expect(suggestions.some((s) => s.label === "text")).toBe(true);
        expect(suggestions.some((s) => s.label === "number")).toBe(true);
        expect(suggestions.some((s) => s.label === "date")).toBe(true);
        expect(suggestions.some((s) => s.label === "time")).toBe(true);
        expect(suggestions.some((s) => s.label === "datetime")).toBe(true);
      });

      it("should filter value types based on query", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("valueType:Name:da", editor);

        expect(suggestions.length).toBe(2);
        expect(suggestions.some((s) => s.label === "date")).toBe(true);
        expect(suggestions.some((s) => s.label === "datetime")).toBe(true);
      });

      it("should filter to single match", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("valueType:Name:num", editor);

        expect(suggestions.length).toBe(1);
        expect(suggestions[0].label).toBe("number");
      });
    });

    describe("format query", () => {
      it("should return date format suggestions for date type", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("format:Name:date:", editor);

        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.some((s) => s.label === "ISO")).toBe(true);
        expect(suggestions.some((s) => s.label === "compact")).toBe(true);
        expect(suggestions.some((s) => s.label === "US")).toBe(true);
        expect(suggestions.some((s) => s.label === "EU")).toBe(true);
      });

      it("should return time format suggestions for time type", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("format:Name:time:", editor);

        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.some((s) => s.label === "ISO")).toBe(true);
        expect(suggestions.some((s) => s.label === "24-hour")).toBe(true);
        expect(suggestions.some((s) => s.label === "12-hour")).toBe(true);
      });

      it("should return both date and time formats for datetime type", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("format:Name:datetime:", editor);

        // Should have date formats, time formats, and custom format option
        expect(suggestions.some((s) => s.type === "dateFormat")).toBe(true);
        expect(suggestions.some((s) => s.type === "timeFormat")).toBe(true);
      });

      it("should include custom format option", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("format:Name:date:", editor);

        expect(suggestions.some((s) => s.label === "format(...)")).toBe(true);
      });

      it("should filter format suggestions", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("format:Name:date:I", editor);

        expect(suggestions.some((s) => s.label === "ISO")).toBe(true);
        // Should not include formats that don't start with 'I'
        expect(suggestions.every((s) =>
          s.label.toLowerCase().startsWith("i") ||
          s.description.toLowerCase().includes("i")
        )).toBe(true);
      });
    });

    describe("format examples", () => {
      it("should include example for date formats", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("format:Name:date:", editor);
        const isoSuggestion = suggestions.find((s) => s.label === "ISO");

        expect(isoSuggestion?.example).toBeDefined();
        expect(isoSuggestion?.example).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it("should include example for time formats", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("format:Name:time:", editor);
        const isoSuggestion = suggestions.find((s) => s.label === "ISO");

        expect(isoSuggestion?.example).toBeDefined();
        expect(isoSuggestion?.example).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      });
    });

    describe("format token query (inside format(...))", () => {
      it("should return moment.js token suggestions", () => {
        const editor = new Editor("");
        // Query format: tokenQuery|fullFormatContent
        const suggestions = suggest.testGetSuggestions("formatToken:Name:date:|", editor);

        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.some((s) => s.label === "YYYY")).toBe(true);
        expect(suggestions.some((s) => s.label === "MM")).toBe(true);
        expect(suggestions.some((s) => s.label === "DD")).toBe(true);
      });

      it("should filter tokens by query", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("formatToken:Name:date:y|Y", editor);

        // Filter out preview item for this test
        const tokenSuggestions = suggestions.filter((s) => !s.isPreview);
        expect(tokenSuggestions.length).toBeGreaterThan(0);
        expect(tokenSuggestions.every((s) => s.label.startsWith("Y") || s.description.toLowerCase().includes("y"))).toBe(true);
      });

      it("should include live examples for tokens", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("formatToken:Name:date:|", editor);
        const yyyySuggestion = suggestions.find((s) => s.label === "YYYY");

        expect(yyyySuggestion?.example).toBeDefined();
        expect(yyyySuggestion?.example).toMatch(/^\d{4}$/);
      });

      it("should prioritize date tokens for date type", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("formatToken:Name:date:|", editor);

        // First few non-preview suggestions should be date-related
        const tokenSuggestions = suggestions.filter((s) => !s.isPreview);
        const first5 = tokenSuggestions.slice(0, 5);
        const dateTokens = ["YYYY", "YY", "MMMM", "MMM", "MM", "M", "DD", "D"];
        expect(first5.some((s) => dateTokens.includes(s.label))).toBe(true);
      });

      it("should prioritize time tokens for time type", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("formatToken:Name:time:|", editor);

        // First few non-preview suggestions should be time-related
        const tokenSuggestions = suggestions.filter((s) => !s.isPreview);
        const first5 = tokenSuggestions.slice(0, 5);
        const timeTokens = ["HH", "H", "hh", "h", "mm", "m", "ss", "s", "A", "a"];
        expect(first5.some((s) => timeTokens.includes(s.label))).toBe(true);
      });

      it("should include token category", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("formatToken:Name:date:|", editor);
        const yyyySuggestion = suggestions.find((s) => s.label === "YYYY");

        expect(yyyySuggestion?.tokenCategory).toBe("year");
      });

      it("should include live preview when format content exists", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("formatToken:Name:date:|YYYY-MM-DD", editor);

        // Should have a preview item at the top
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0].isPreview).toBe(true);
        expect(suggestions[0].label).toMatch(/^Preview: \d{4}-\d{2}-\d{2}$/);
        expect(suggestions[0].description).toBe("Current format: YYYY-MM-DD");
      });

      it("should not include preview when format content is empty", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("formatToken:Name:date:|", editor);

        // Should not have a preview item when format is empty
        expect(suggestions[0]?.isPreview).toBeFalsy();
      });

      it("preview item should have empty insertText", () => {
        const editor = new Editor("");
        const suggestions = suggest.testGetSuggestions("formatToken:Name:date:|MMMM", editor);

        const preview = suggestions.find((s) => s.isPreview);
        expect(preview).toBeDefined();
        expect(preview?.insertText).toBe("");
      });
    });
  });

  describe("renderSuggestion", () => {
    it("should create DOM elements for suggestion", () => {
      const el = mockObsidianElement(document.createElement("div"));
      const suggestion = {
        label: "{% Name %}",
        type: "syntax" as const,
        description: "Required text prompt",
        insertText: " Name %}",
      };

      suggest.renderSuggestion(suggestion, el);

      expect(el.querySelector(".prompt-suggest-item")).toBeTruthy();
      expect(el.querySelector(".prompt-suggest-label")?.textContent).toBe("{% Name %}");
      expect(el.querySelector(".prompt-suggest-description")?.textContent).toBe(
        "Required text prompt"
      );
    });

    it("should include example when provided", () => {
      const el = mockObsidianElement(document.createElement("div"));
      const suggestion = {
        label: "ISO",
        type: "dateFormat" as const,
        description: "Date format: YYYY-MM-DD",
        insertText: "ISO %}",
        example: "2024-01-15",
      };

      suggest.renderSuggestion(suggestion, el);

      expect(el.querySelector(".prompt-suggest-example")?.textContent).toBe("2024-01-15");
    });
  });

  describe("selectSuggestion", () => {
    it("should insert text and move cursor", () => {
      const editor = new Editor("{% ");
      const cursor: EditorPosition = { line: 0, ch: 3 };

      suggest.setTestContext({
        start: cursor,
        end: cursor,
        query: "",
        editor,
        file: null,
      });

      const suggestion = {
        label: "{% Name %}",
        type: "syntax" as const,
        description: "Required text prompt",
        insertText: " Name %}",
      };

      suggest.selectSuggestion(suggestion, new MouseEvent("click"));

      expect(editor.getValue()).toBe("{% " + " Name %}");
    });

    it("should replace query range with suggestion", () => {
      const editor = new Editor("{% Name:da");
      const start: EditorPosition = { line: 0, ch: 8 };
      const end: EditorPosition = { line: 0, ch: 10 };

      suggest.setTestContext({
        start,
        end,
        query: "valueType:Name:da",
        editor,
        file: null,
      });

      const suggestion = {
        label: "date",
        type: "valueType" as const,
        description: "Date picker",
        insertText: "date:",
      };

      suggest.selectSuggestion(suggestion, new MouseEvent("click"));

      expect(editor.getValue()).toBe("{% Name:date:");
    });
  });

  describe("integration scenarios", () => {
    it("should provide complete workflow for simple prompt", () => {
      // Step 1: User types {%
      let editor = new Editor("{%");
      let cursor: EditorPosition = { line: 0, ch: 2 };
      let trigger = suggest.onTrigger(cursor, editor, null);
      expect(trigger).not.toBeNull();

      // Step 2: User types space
      editor = new Editor("{% ");
      cursor = { line: 0, ch: 3 };
      trigger = suggest.onTrigger(cursor, editor, null);
      expect(trigger?.query).toBe("");

      // Verify suggestions are available
      const suggestions = suggest.testGetSuggestions("", editor);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should provide complete workflow for typed prompt", () => {
      // User types {% Name:date:ISO %}
      const editor = new Editor("{% Name:date:");
      const cursor: EditorPosition = { line: 0, ch: 13 };
      const trigger = suggest.onTrigger(cursor, editor, null);

      expect(trigger).not.toBeNull();
      expect(trigger?.query).toBe("format:Name:date:");

      const suggestions = suggest.testGetSuggestions("format:Name:date:", editor);
      const isoSuggestion = suggestions.find((s) => s.label === "ISO");

      expect(isoSuggestion).toBeDefined();
      expect(isoSuggestion?.insertText).toBe("ISO %}");
    });
  });
});
