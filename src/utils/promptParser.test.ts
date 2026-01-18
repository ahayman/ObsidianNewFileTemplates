import {
  parsePromptSyntax,
  getPromptName,
  extractPrompts,
  hasPrompts,
  countPrompts,
  substitutePrompts,
  previewWithPrompts,
  validatePromptValue,
  allPromptsValid,
  validatePromptName,
  createPromptSyntax,
  syncPromptsWithPattern,
} from "./promptParser";
import { UserPrompt } from "../types";

describe("promptParser", () => {
  describe("parsePromptSyntax", () => {
    describe("basic syntax", () => {
      it("should parse simple name", () => {
        const result = parsePromptSyntax("Name");
        expect(result.name).toBe("Name");
        expect(result.valueType).toBe("text");
        expect(result.isInlineConfigured).toBe(false);
        expect(result.isOptional).toBe(false);
      });

      it("should parse name with type", () => {
        const result = parsePromptSyntax("Count:number");
        expect(result.name).toBe("Count");
        expect(result.valueType).toBe("numeric");
        expect(result.isInlineConfigured).toBe(true);
      });

      it("should parse name with date type and preset", () => {
        const result = parsePromptSyntax("Date:date:ISO");
        expect(result.name).toBe("Date");
        expect(result.valueType).toBe("date");
        expect(result.dateFormat).toBe("YYYY-MM-DD");
        expect(result.isInlineConfigured).toBe(true);
      });

      it("should parse datetime with separate presets", () => {
        const result = parsePromptSyntax("DateTime:datetime:EU,12-hour");
        expect(result.name).toBe("DateTime");
        expect(result.valueType).toBe("datetime");
        expect(result.dateFormat).toBe("DD-MM-YYYY");
        expect(result.timeFormat).toBe("h:mm A");
      });

      it("should parse custom format", () => {
        const result = parsePromptSyntax("Date:datetime:format(YYYY-MM-DD at h:mm A)");
        expect(result.name).toBe("Date");
        expect(result.valueType).toBe("datetime");
        expect(result.customFormat).toBe("YYYY-MM-DD at h:mm A");
        expect(result.dateFormat).toBe("custom");
        expect(result.timeFormat).toBe("custom");
      });
    });

    describe("optional syntax", () => {
      it("should parse optional flag when passed", () => {
        const result = parsePromptSyntax("Subtitle", true);
        expect(result.name).toBe("Subtitle");
        expect(result.valueType).toBe("text");
        expect(result.isOptional).toBe(true);
      });

      it("should parse optional with type", () => {
        const result = parsePromptSyntax("Count:number", true);
        expect(result.name).toBe("Count");
        expect(result.valueType).toBe("numeric");
        expect(result.isOptional).toBe(true);
      });

      it("should parse optional with format", () => {
        const result = parsePromptSyntax("Date:date:ISO", true);
        expect(result.name).toBe("Date");
        expect(result.valueType).toBe("date");
        expect(result.dateFormat).toBe("YYYY-MM-DD");
        expect(result.isOptional).toBe(true);
      });

      it("should parse optional with custom format", () => {
        const result = parsePromptSyntax("Date:datetime:format(YYYY/MM/DD)", true);
        expect(result.name).toBe("Date");
        expect(result.customFormat).toBe("YYYY/MM/DD");
        expect(result.isOptional).toBe(true);
      });
    });

    describe("type aliases", () => {
      it("should accept 'number' as alias for 'numeric'", () => {
        const result = parsePromptSyntax("Count:number");
        expect(result.valueType).toBe("numeric");
      });

      it("should be case-insensitive for types", () => {
        const result1 = parsePromptSyntax("Field:TEXT");
        const result2 = parsePromptSyntax("Field:Date");
        expect(result1.valueType).toBe("text");
        expect(result2.valueType).toBe("date");
      });

      it("should default to text for unknown types", () => {
        const result = parsePromptSyntax("Field:unknown");
        expect(result.valueType).toBe("text");
      });
    });
  });

  describe("getPromptName", () => {
    it("should extract name from simple syntax", () => {
      expect(getPromptName("Author")).toBe("Author");
    });

    it("should extract name from typed syntax", () => {
      expect(getPromptName("Count:number")).toBe("Count");
    });

    it("should extract name from full syntax", () => {
      expect(getPromptName("Date:date:ISO")).toBe("Date");
    });

    it("should trim whitespace", () => {
      expect(getPromptName("  Name  ")).toBe("Name");
    });
  });

  describe("extractPrompts", () => {
    it("should extract simple prompts", () => {
      const prompts = extractPrompts("{% Author %}-{% Title %}");
      expect(prompts).toHaveLength(2);
      expect(prompts[0].name).toBe("Author");
      expect(prompts[1].name).toBe("Title");
    });

    it("should extract prompts with types", () => {
      const prompts = extractPrompts("{% Count:number %}-{% Date:date:ISO %}");
      expect(prompts).toHaveLength(2);
      expect(prompts[0].valueType).toBe("numeric");
      expect(prompts[1].valueType).toBe("date");
      expect(prompts[1].dateConfig?.outputFormat).toBe("YYYY-MM-DD");
    });

    it("should extract optional prompts", () => {
      const prompts = extractPrompts("{%? Subtitle ?%}");
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe("Subtitle");
      expect(prompts[0].isOptional).toBe(true);
    });

    it("should extract mixed required and optional prompts", () => {
      const prompts = extractPrompts("{% Title %}-{%? Subtitle ?%}");
      expect(prompts).toHaveLength(2);
      expect(prompts[0].name).toBe("Title");
      expect(prompts[0].isOptional).toBe(false);
      expect(prompts[1].name).toBe("Subtitle");
      expect(prompts[1].isOptional).toBe(true);
    });

    it("should extract optional prompts with types and formats", () => {
      const prompts = extractPrompts("{%? Date:date:ISO ?%}");
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe("Date");
      expect(prompts[0].valueType).toBe("date");
      expect(prompts[0].isOptional).toBe(true);
      expect(prompts[0].dateConfig?.outputFormat).toBe("YYYY-MM-DD");
    });

    it("should deduplicate prompts by name", () => {
      const prompts = extractPrompts("{% Name %}-{% Name %}");
      expect(prompts).toHaveLength(1);
    });

    it("should mark inline configured prompts", () => {
      const prompts = extractPrompts("{% Name:date:ISO %}");
      expect(prompts[0].isInlineConfigured).toBe(true);
    });

    it("should not mark simple prompts as inline configured", () => {
      const prompts = extractPrompts("{% Name %}");
      expect(prompts[0].isInlineConfigured).toBe(false);
    });
  });

  describe("hasPrompts", () => {
    it("should return true for patterns with prompts", () => {
      expect(hasPrompts("{% Name %}")).toBe(true);
      expect(hasPrompts("{%? Name ?%}")).toBe(true);
    });

    it("should return false for patterns without prompts", () => {
      expect(hasPrompts("{{date}}-title")).toBe(false);
      expect(hasPrompts("static-name")).toBe(false);
    });
  });

  describe("countPrompts", () => {
    it("should count unique prompts", () => {
      expect(countPrompts("{% A %}-{% B %}-{% C %}")).toBe(3);
    });

    it("should count optional prompts", () => {
      expect(countPrompts("{%? A ?%}-{%? B ?%}")).toBe(2);
    });

    it("should count mixed prompts", () => {
      expect(countPrompts("{% A %}-{%? B ?%}")).toBe(2);
    });

    it("should not double-count duplicates", () => {
      expect(countPrompts("{% Name %}-{% Name %}")).toBe(1);
    });
  });

  describe("substitutePrompts", () => {
    const prompts: UserPrompt[] = [
      { id: "1", name: "Author", valueType: "text" },
      { id: "2", name: "Title", valueType: "text" },
    ];

    it("should substitute required prompts", () => {
      const values = { "1": "John", "2": "Book" };
      const result = substitutePrompts("{% Author %}-{% Title %}", prompts, values);
      expect(result).toBe("John-Book");
    });

    it("should substitute optional prompts", () => {
      const values = { "1": "John", "2": "Book" };
      const result = substitutePrompts("{%? Author ?%}-{% Title %}", prompts, values);
      expect(result).toBe("John-Book");
    });

    it("should return empty string for missing values", () => {
      const values = { "1": "John" };
      const result = substitutePrompts("{% Author %}-{% Title %}", prompts, values);
      expect(result).toBe("John-");
    });

    it("should handle prompts with type syntax", () => {
      const result = substitutePrompts("{% Author:text %}", prompts, { "1": "Jane" });
      expect(result).toBe("Jane");
    });
  });

  describe("previewWithPrompts", () => {
    const prompts: UserPrompt[] = [
      { id: "1", name: "Author", valueType: "text" },
      { id: "2", name: "Title", valueType: "text" },
    ];

    it("should show placeholder for unfilled prompts", () => {
      const result = previewWithPrompts("{% Author %}-{% Title %}", prompts, {});
      expect(result).toBe("[Author]-[Title]");
    });

    it("should show value for filled prompts", () => {
      const values = { "1": "John" };
      const result = previewWithPrompts("{% Author %}-{% Title %}", prompts, values);
      expect(result).toBe("John-[Title]");
    });

    it("should handle optional prompts", () => {
      const result = previewWithPrompts("{%? Author ?%}-{% Title %}", prompts, {});
      expect(result).toBe("[Author]-[Title]");
    });
  });

  describe("validatePromptValue", () => {
    describe("required prompts", () => {
      const requiredPrompt: UserPrompt = {
        id: "1",
        name: "Title",
        valueType: "text",
        isOptional: false,
      };

      it("should fail for empty value", () => {
        const result = validatePromptValue("", requiredPrompt);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Value cannot be empty");
      });

      it("should fail for whitespace-only value", () => {
        const result = validatePromptValue("   ", requiredPrompt);
        expect(result.valid).toBe(false);
      });

      it("should pass for valid value", () => {
        const result = validatePromptValue("Hello", requiredPrompt);
        expect(result.valid).toBe(true);
      });
    });

    describe("optional prompts", () => {
      const optionalPrompt: UserPrompt = {
        id: "1",
        name: "Subtitle",
        valueType: "text",
        isOptional: true,
      };

      it("should pass for empty value", () => {
        const result = validatePromptValue("", optionalPrompt);
        expect(result.valid).toBe(true);
      });

      it("should pass for whitespace-only value", () => {
        const result = validatePromptValue("   ", optionalPrompt);
        expect(result.valid).toBe(true);
      });

      it("should pass for valid value", () => {
        const result = validatePromptValue("Hello", optionalPrompt);
        expect(result.valid).toBe(true);
      });
    });

    describe("numeric prompts", () => {
      const numericPrompt: UserPrompt = {
        id: "1",
        name: "Count",
        valueType: "numeric",
      };

      it("should pass for valid number", () => {
        expect(validatePromptValue("123", numericPrompt).valid).toBe(true);
        expect(validatePromptValue("-45.6", numericPrompt).valid).toBe(true);
      });

      it("should fail for non-numeric value", () => {
        const result = validatePromptValue("abc", numericPrompt);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Value must be a number");
      });
    });

    describe("date prompts", () => {
      const datePrompt: UserPrompt = {
        id: "1",
        name: "Date",
        valueType: "date",
      };

      it("should pass for valid date", () => {
        expect(validatePromptValue("2024-03-15", datePrompt).valid).toBe(true);
      });

      it("should fail for invalid date", () => {
        const result = validatePromptValue("not-a-date", datePrompt);
        expect(result.valid).toBe(false);
      });
    });

    describe("optional typed prompts", () => {
      const optionalNumeric: UserPrompt = {
        id: "1",
        name: "Count",
        valueType: "numeric",
        isOptional: true,
      };

      it("should pass for empty optional numeric", () => {
        const result = validatePromptValue("", optionalNumeric);
        expect(result.valid).toBe(true);
      });

      it("should still validate non-empty optional values", () => {
        const result = validatePromptValue("abc", optionalNumeric);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Value must be a number");
      });
    });
  });

  describe("allPromptsValid", () => {
    it("should return true when all required prompts are filled", () => {
      const prompts: UserPrompt[] = [
        { id: "1", name: "A", valueType: "text" },
        { id: "2", name: "B", valueType: "text" },
      ];
      const values = { "1": "Value1", "2": "Value2" };
      expect(allPromptsValid(prompts, values)).toBe(true);
    });

    it("should return false when required prompt is empty", () => {
      const prompts: UserPrompt[] = [
        { id: "1", name: "A", valueType: "text" },
        { id: "2", name: "B", valueType: "text" },
      ];
      const values = { "1": "Value1", "2": "" };
      expect(allPromptsValid(prompts, values)).toBe(false);
    });

    it("should return true when optional prompt is empty", () => {
      const prompts: UserPrompt[] = [
        { id: "1", name: "A", valueType: "text" },
        { id: "2", name: "B", valueType: "text", isOptional: true },
      ];
      const values = { "1": "Value1", "2": "" };
      expect(allPromptsValid(prompts, values)).toBe(true);
    });

    it("should return true when all optional prompts are empty", () => {
      const prompts: UserPrompt[] = [
        { id: "1", name: "A", valueType: "text", isOptional: true },
        { id: "2", name: "B", valueType: "text", isOptional: true },
      ];
      const values = { "1": "", "2": "" };
      expect(allPromptsValid(prompts, values)).toBe(true);
    });
  });

  describe("validatePromptName", () => {
    it("should pass for valid names", () => {
      expect(validatePromptName("Author").valid).toBe(true);
      expect(validatePromptName("Event Name").valid).toBe(true);
    });

    it("should fail for empty name", () => {
      expect(validatePromptName("").valid).toBe(false);
      expect(validatePromptName("   ").valid).toBe(false);
    });

    it("should fail for names with special characters", () => {
      expect(validatePromptName("Name%").valid).toBe(false);
      expect(validatePromptName("{Name}").valid).toBe(false);
    });

    it("should fail for names with colons", () => {
      const result = validatePromptName("Name:Test");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("colon");
    });
  });

  describe("createPromptSyntax", () => {
    it("should create required syntax by default", () => {
      expect(createPromptSyntax("Name")).toBe("{% Name %}");
    });

    it("should create optional syntax when specified", () => {
      expect(createPromptSyntax("Name", true)).toBe("{%? Name ?%}");
    });

    it("should create required syntax when false", () => {
      expect(createPromptSyntax("Name", false)).toBe("{% Name %}");
    });
  });

  describe("syncPromptsWithPattern", () => {
    it("should preserve existing IDs", () => {
      const existing: UserPrompt[] = [
        { id: "existing-id", name: "Author", valueType: "text" },
      ];
      const result = syncPromptsWithPattern("{% Author %}", existing);
      expect(result[0].id).toBe("existing-id");
    });

    it("should update optionality from pattern", () => {
      const existing: UserPrompt[] = [
        { id: "1", name: "Author", valueType: "text", isOptional: false },
      ];
      const result = syncPromptsWithPattern("{%? Author ?%}", existing);
      expect(result[0].isOptional).toBe(true);
    });

    it("should preserve type from existing when not inline configured", () => {
      const existing: UserPrompt[] = [
        { id: "1", name: "Count", valueType: "numeric" },
      ];
      const result = syncPromptsWithPattern("{% Count %}", existing);
      expect(result[0].valueType).toBe("numeric");
    });

    it("should use inline type when specified", () => {
      const existing: UserPrompt[] = [
        { id: "1", name: "Count", valueType: "text" },
      ];
      const result = syncPromptsWithPattern("{% Count:number %}", existing);
      expect(result[0].valueType).toBe("numeric");
    });

    it("should add new prompts from pattern", () => {
      const existing: UserPrompt[] = [];
      const result = syncPromptsWithPattern("{% New %}", existing);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("New");
    });

    it("should remove prompts not in pattern", () => {
      const existing: UserPrompt[] = [
        { id: "1", name: "Old", valueType: "text" },
      ];
      const result = syncPromptsWithPattern("{% New %}", existing);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("New");
    });
  });
});
