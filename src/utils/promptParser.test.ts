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
  createFullPromptSyntax,
  syncPromptsWithPattern,
  extractPromptsFromContent,
  hasPromptsInContent,
  substitutePromptsInContent,
  replacePromptSyntax,
  removePromptSyntax,
} from "./promptParser";
import { UserPrompt } from "../types";

describe("promptParser", () => {
  describe("parsePromptSyntax", () => {
    describe("basic syntax", () => {
      it("should parse simple name", () => {
        const result = parsePromptSyntax("Name");
        expect(result.name).toBe("Name");
        expect(result.valueType).toBe("text");
        expect(result.isOptional).toBe(false);
      });

      it("should parse name with type", () => {
        const result = parsePromptSyntax("Count:number");
        expect(result.name).toBe("Count");
        expect(result.valueType).toBe("numeric");
      });

      it("should parse name with date type and preset", () => {
        const result = parsePromptSyntax("Date:date:ISO");
        expect(result.name).toBe("Date");
        expect(result.valueType).toBe("date");
        expect(result.dateFormat).toBe("YYYY-MM-DD");
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

    describe("list syntax", () => {
      it("should parse list type with options", () => {
        const result = parsePromptSyntax("Priority:list:Low,Medium,High");
        expect(result.name).toBe("Priority");
        expect(result.valueType).toBe("list");
        expect(result.listOptions).toEqual(["Low", "Medium", "High"]);
      });

      it("should parse multilist type with options", () => {
        const result = parsePromptSyntax("Tags:multilist:Work,Personal,Important");
        expect(result.name).toBe("Tags");
        expect(result.valueType).toBe("multilist");
        expect(result.listOptions).toEqual(["Work", "Personal", "Important"]);
      });

      it("should trim whitespace from list options", () => {
        const result = parsePromptSyntax("Status:list:  Open , In Progress , Closed  ");
        expect(result.listOptions).toEqual(["Open", "In Progress", "Closed"]);
      });

      it("should filter out empty options", () => {
        const result = parsePromptSyntax("Status:list:Open,,Closed,");
        expect(result.listOptions).toEqual(["Open", "Closed"]);
      });

      it("should parse optional list", () => {
        const result = parsePromptSyntax("Priority:list:Low,Medium,High", true);
        expect(result.valueType).toBe("list");
        expect(result.isOptional).toBe(true);
        expect(result.listOptions).toEqual(["Low", "Medium", "High"]);
      });

      it("should be case-insensitive for list type", () => {
        const result = parsePromptSyntax("Field:LIST:A,B,C");
        expect(result.valueType).toBe("list");
      });

      it("should be case-insensitive for multilist type", () => {
        const result = parsePromptSyntax("Field:MULTILIST:A,B,C");
        expect(result.valueType).toBe("multilist");
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

    it("should extract list prompts with options", () => {
      const prompts = extractPrompts("{% Priority:list:Low,Medium,High %}");
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe("Priority");
      expect(prompts[0].valueType).toBe("list");
      expect(prompts[0].listConfig?.options).toEqual(["Low", "Medium", "High"]);
    });

    it("should extract multilist prompts with options", () => {
      const prompts = extractPrompts("{% Tags:multilist:Work,Personal,Important %}");
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe("Tags");
      expect(prompts[0].valueType).toBe("multilist");
      expect(prompts[0].listConfig?.options).toEqual(["Work", "Personal", "Important"]);
    });

    it("should extract optional list prompts", () => {
      const prompts = extractPrompts("{%? Priority:list:Low,Medium,High ?%}");
      expect(prompts).toHaveLength(1);
      expect(prompts[0].isOptional).toBe(true);
      expect(prompts[0].valueType).toBe("list");
      expect(prompts[0].listConfig?.options).toEqual(["Low", "Medium", "High"]);
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

    describe("list prompts", () => {
      const listPrompt: UserPrompt = {
        id: "1",
        name: "Priority",
        valueType: "list",
        listConfig: { options: ["Low", "Medium", "High"] },
      };

      it("should pass for valid list option", () => {
        expect(validatePromptValue("Low", listPrompt).valid).toBe(true);
        expect(validatePromptValue("Medium", listPrompt).valid).toBe(true);
        expect(validatePromptValue("High", listPrompt).valid).toBe(true);
      });

      it("should fail for invalid list option", () => {
        const result = validatePromptValue("Invalid", listPrompt);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Value must be one of the available options");
      });

      it("should fail for empty value on required list", () => {
        const result = validatePromptValue("", listPrompt);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Value cannot be empty");
      });

      it("should pass for empty value on optional list", () => {
        const optionalListPrompt: UserPrompt = {
          ...listPrompt,
          isOptional: true,
        };
        const result = validatePromptValue("", optionalListPrompt);
        expect(result.valid).toBe(true);
      });
    });

    describe("multilist prompts", () => {
      const multilistPrompt: UserPrompt = {
        id: "1",
        name: "Tags",
        valueType: "multilist",
        listConfig: { options: ["Work", "Personal", "Important"] },
      };

      it("should pass for single valid option", () => {
        const result = validatePromptValue("Work", multilistPrompt);
        expect(result.valid).toBe(true);
      });

      it("should pass for multiple valid options", () => {
        const result = validatePromptValue("Work, Personal", multilistPrompt);
        expect(result.valid).toBe(true);
      });

      it("should pass for all options selected", () => {
        const result = validatePromptValue("Work, Personal, Important", multilistPrompt);
        expect(result.valid).toBe(true);
      });

      it("should fail if any option is invalid", () => {
        const result = validatePromptValue("Work, Invalid", multilistPrompt);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Invalid");
        expect(result.error).toContain("not a valid option");
      });

      it("should fail for empty value on required multilist", () => {
        const result = validatePromptValue("", multilistPrompt);
        expect(result.valid).toBe(false);
      });

      it("should pass for empty value on optional multilist", () => {
        const optionalMultilistPrompt: UserPrompt = {
          ...multilistPrompt,
          isOptional: true,
        };
        const result = validatePromptValue("", optionalMultilistPrompt);
        expect(result.valid).toBe(true);
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

  describe("createFullPromptSyntax", () => {
    it("should create text prompt syntax", () => {
      const prompt: UserPrompt = { id: "1", name: "Author", valueType: "text" };
      expect(createFullPromptSyntax(prompt)).toBe("{% Author:text %}");
    });

    it("should create numeric prompt syntax", () => {
      const prompt: UserPrompt = { id: "1", name: "Count", valueType: "numeric" };
      expect(createFullPromptSyntax(prompt)).toBe("{% Count:number %}");
    });

    it("should create date prompt syntax with ISO preset", () => {
      const prompt: UserPrompt = {
        id: "1",
        name: "Date",
        valueType: "date",
        dateConfig: { outputFormat: "YYYY-MM-DD" },
      };
      expect(createFullPromptSyntax(prompt)).toBe("{% Date:date:ISO %}");
    });

    it("should create date prompt syntax with compact preset", () => {
      const prompt: UserPrompt = {
        id: "1",
        name: "Date",
        valueType: "date",
        dateConfig: { outputFormat: "YYYYMMDD" },
      };
      expect(createFullPromptSyntax(prompt)).toBe("{% Date:date:compact %}");
    });

    it("should create date prompt syntax with custom format", () => {
      const prompt: UserPrompt = {
        id: "1",
        name: "Date",
        valueType: "date",
        dateConfig: { outputFormat: "custom", customFormat: "MMM D, YYYY" },
      };
      expect(createFullPromptSyntax(prompt)).toBe("{% Date:date:format(MMM D, YYYY) %}");
    });

    it("should create time prompt syntax with 12-hour preset", () => {
      const prompt: UserPrompt = {
        id: "1",
        name: "Time",
        valueType: "time",
        timeConfig: { outputFormat: "h:mm A" },
      };
      expect(createFullPromptSyntax(prompt)).toBe("{% Time:time:12-hour %}");
    });

    it("should create time prompt syntax with ISO preset", () => {
      const prompt: UserPrompt = {
        id: "1",
        name: "Time",
        valueType: "time",
        timeConfig: { outputFormat: "HH:mm:ss" },
      };
      expect(createFullPromptSyntax(prompt)).toBe("{% Time:time:ISO %}");
    });

    it("should create time prompt syntax with custom format", () => {
      const prompt: UserPrompt = {
        id: "1",
        name: "Time",
        valueType: "time",
        timeConfig: { outputFormat: "custom", customFormat: "h A" },
      };
      expect(createFullPromptSyntax(prompt)).toBe("{% Time:time:format(h A) %}");
    });

    it("should create datetime prompt syntax with both presets", () => {
      const prompt: UserPrompt = {
        id: "1",
        name: "When",
        valueType: "datetime",
        dateConfig: { outputFormat: "YYYY-MM-DD" },
        timeConfig: { outputFormat: "h:mm A" },
      };
      expect(createFullPromptSyntax(prompt)).toBe("{% When:datetime:ISO,12-hour %}");
    });

    it("should create datetime prompt syntax with single custom format", () => {
      const prompt: UserPrompt = {
        id: "1",
        name: "When",
        valueType: "datetime",
        dateConfig: { outputFormat: "custom", customFormat: "YYYY-MM-DD h:mm A" },
        timeConfig: { outputFormat: "custom", customFormat: "YYYY-MM-DD h:mm A" },
      };
      expect(createFullPromptSyntax(prompt)).toBe("{% When:datetime:format(YYYY-MM-DD h:mm A) %}");
    });

    it("should create optional text prompt syntax", () => {
      const prompt: UserPrompt = { id: "1", name: "Subtitle", valueType: "text", isOptional: true };
      expect(createFullPromptSyntax(prompt)).toBe("{%? Subtitle:text ?%}");
    });

    it("should create optional date prompt syntax", () => {
      const prompt: UserPrompt = {
        id: "1",
        name: "Date",
        valueType: "date",
        dateConfig: { outputFormat: "YYYY-MM-DD" },
        isOptional: true,
      };
      expect(createFullPromptSyntax(prompt)).toBe("{%? Date:date:ISO ?%}");
    });

    it("should roundtrip through extractPrompts", () => {
      const original: UserPrompt = {
        id: "1",
        name: "Author",
        valueType: "text",
      };
      const syntax = createFullPromptSyntax(original);
      const extracted = extractPrompts(syntax);
      expect(extracted).toHaveLength(1);
      expect(extracted[0].name).toBe("Author");
      expect(extracted[0].valueType).toBe("text");
    });

    it("should roundtrip date prompt through extractPrompts", () => {
      const original: UserPrompt = {
        id: "1",
        name: "Date",
        valueType: "date",
        dateConfig: { outputFormat: "MM-DD-YYYY" },
      };
      const syntax = createFullPromptSyntax(original);
      expect(syntax).toBe("{% Date:date:US %}");
      const extracted = extractPrompts(syntax);
      expect(extracted).toHaveLength(1);
      expect(extracted[0].name).toBe("Date");
      expect(extracted[0].valueType).toBe("date");
      expect(extracted[0].dateConfig?.outputFormat).toBe("MM-DD-YYYY");
    });

    it("should create list prompt syntax", () => {
      const prompt: UserPrompt = {
        id: "1",
        name: "Priority",
        valueType: "list",
        listConfig: { options: ["Low", "Medium", "High"] },
      };
      expect(createFullPromptSyntax(prompt)).toBe("{% Priority:list:Low,Medium,High %}");
    });

    it("should create multilist prompt syntax", () => {
      const prompt: UserPrompt = {
        id: "1",
        name: "Tags",
        valueType: "multilist",
        listConfig: { options: ["Work", "Personal", "Important"] },
      };
      expect(createFullPromptSyntax(prompt)).toBe("{% Tags:multilist:Work,Personal,Important %}");
    });

    it("should create optional list prompt syntax", () => {
      const prompt: UserPrompt = {
        id: "1",
        name: "Priority",
        valueType: "list",
        listConfig: { options: ["Low", "High"] },
        isOptional: true,
      };
      expect(createFullPromptSyntax(prompt)).toBe("{%? Priority:list:Low,High ?%}");
    });

    it("should handle list without options (edge case)", () => {
      const prompt: UserPrompt = {
        id: "1",
        name: "Empty",
        valueType: "list",
        listConfig: { options: [] },
      };
      // Should output just the type without colon when no options
      expect(createFullPromptSyntax(prompt)).toBe("{% Empty:list %}");
    });

    it("should roundtrip list prompt through extractPrompts", () => {
      const original: UserPrompt = {
        id: "1",
        name: "Status",
        valueType: "list",
        listConfig: { options: ["Open", "Closed"] },
      };
      const syntax = createFullPromptSyntax(original);
      expect(syntax).toBe("{% Status:list:Open,Closed %}");
      const extracted = extractPrompts(syntax);
      expect(extracted).toHaveLength(1);
      expect(extracted[0].name).toBe("Status");
      expect(extracted[0].valueType).toBe("list");
      expect(extracted[0].listConfig?.options).toEqual(["Open", "Closed"]);
    });

    it("should roundtrip multilist prompt through extractPrompts", () => {
      const original: UserPrompt = {
        id: "1",
        name: "Categories",
        valueType: "multilist",
        listConfig: { options: ["A", "B", "C"] },
      };
      const syntax = createFullPromptSyntax(original);
      expect(syntax).toBe("{% Categories:multilist:A,B,C %}");
      const extracted = extractPrompts(syntax);
      expect(extracted).toHaveLength(1);
      expect(extracted[0].name).toBe("Categories");
      expect(extracted[0].valueType).toBe("multilist");
      expect(extracted[0].listConfig?.options).toEqual(["A", "B", "C"]);
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

    it("should use type from pattern (pattern is source of truth)", () => {
      // Even if existing has different type, pattern takes precedence
      const existing: UserPrompt[] = [
        { id: "1", name: "Count", valueType: "numeric" },
      ];
      const result = syncPromptsWithPattern("{% Count %}", existing);
      expect(result[0].valueType).toBe("text"); // Default type from pattern
      expect(result[0].id).toBe("1"); // But ID is preserved
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

  describe("extractPromptsFromContent", () => {
    describe("basic extraction", () => {
      it("should extract single text prompt from content", () => {
        const prompts = extractPromptsFromContent("Hello {% Name %}!");
        expect(prompts).toHaveLength(1);
        expect(prompts[0].name).toBe("Name");
        expect(prompts[0].valueType).toBe("text");
      });

      it("should extract multiple prompts from content", () => {
        const prompts = extractPromptsFromContent("Author: {% Author %}\nTitle: {% Title %}");
        expect(prompts).toHaveLength(2);
        expect(prompts[0].name).toBe("Author");
        expect(prompts[1].name).toBe("Title");
      });

      it("should return empty array when no prompts in content", () => {
        const prompts = extractPromptsFromContent("Hello world! No prompts here.");
        expect(prompts).toHaveLength(0);
      });

      it("should handle content that is only a prompt", () => {
        const prompts = extractPromptsFromContent("{% Name %}");
        expect(prompts).toHaveLength(1);
        expect(prompts[0].name).toBe("Name");
      });
    });

    describe("inline type configuration", () => {
      it("should extract prompts with text type", () => {
        const prompts = extractPromptsFromContent("{% Name:text %}");
        expect(prompts).toHaveLength(1);
        expect(prompts[0].valueType).toBe("text");
      });

      it("should extract prompts with number type", () => {
        const prompts = extractPromptsFromContent("Count: {% Count:number %}");
        expect(prompts).toHaveLength(1);
        expect(prompts[0].valueType).toBe("numeric");
      });

      it("should extract prompts with date type and preset", () => {
        const prompts = extractPromptsFromContent("Date: {% Date:date:ISO %}");
        expect(prompts).toHaveLength(1);
        expect(prompts[0].valueType).toBe("date");
        expect(prompts[0].dateConfig?.outputFormat).toBe("YYYY-MM-DD");
      });

      it("should extract datetime prompts with separate presets", () => {
        const prompts = extractPromptsFromContent("{% DateTime:datetime:US,12-hour %}");
        expect(prompts).toHaveLength(1);
        expect(prompts[0].valueType).toBe("datetime");
        expect(prompts[0].dateConfig?.outputFormat).toBe("MM-DD-YYYY");
        expect(prompts[0].timeConfig?.outputFormat).toBe("h:mm A");
      });

      it("should extract prompts with custom format", () => {
        const prompts = extractPromptsFromContent("{% Date:datetime:format(YYYY/MM/DD HH:mm) %}");
        expect(prompts).toHaveLength(1);
        expect(prompts[0].dateConfig?.customFormat).toBe("YYYY/MM/DD HH:mm");
      });
    });

    describe("optional prompts", () => {
      it("should extract optional prompts", () => {
        const prompts = extractPromptsFromContent("{%? Subtitle ?%}");
        expect(prompts).toHaveLength(1);
        expect(prompts[0].name).toBe("Subtitle");
        expect(prompts[0].isOptional).toBe(true);
      });

      it("should extract optional prompts with type", () => {
        const prompts = extractPromptsFromContent("{%? Count:number ?%}");
        expect(prompts).toHaveLength(1);
        expect(prompts[0].valueType).toBe("numeric");
        expect(prompts[0].isOptional).toBe(true);
      });

      it("should extract mixed required and optional prompts", () => {
        const prompts = extractPromptsFromContent("{% Title %}\n{%? Subtitle ?%}");
        expect(prompts).toHaveLength(2);
        expect(prompts[0].isOptional).toBe(false);
        expect(prompts[1].isOptional).toBe(true);
      });
    });

    describe("duplicate handling", () => {
      it("should deduplicate prompts with same name", () => {
        const prompts = extractPromptsFromContent("{% Name %} and {% Name %}");
        expect(prompts).toHaveLength(1);
      });

      it("should deduplicate case-insensitively", () => {
        const prompts = extractPromptsFromContent("{% name %} and {% NAME %}");
        expect(prompts).toHaveLength(1);
      });
    });

    describe("code block handling", () => {
      it("should ignore prompts inside backtick code blocks", () => {
        const content = `Outside {% Outside %}
\`\`\`
{% Inside %}
\`\`\`
After {% After %}`;
        const prompts = extractPromptsFromContent(content);
        expect(prompts).toHaveLength(2);
        expect(prompts.map(p => p.name)).toEqual(["Outside", "After"]);
      });

      it("should ignore prompts inside tilde code blocks", () => {
        const content = `{% Before %}
~~~
{% Inside %}
~~~
{% After %}`;
        const prompts = extractPromptsFromContent(content);
        expect(prompts).toHaveLength(2);
        expect(prompts.map(p => p.name)).toEqual(["Before", "After"]);
      });

      it("should handle code blocks with language specifiers", () => {
        const content = `{% Name %}
\`\`\`javascript
const x = "{% Code %}";
\`\`\`
{% Other %}`;
        const prompts = extractPromptsFromContent(content);
        expect(prompts).toHaveLength(2);
        expect(prompts.map(p => p.name)).toEqual(["Name", "Other"]);
      });

      it("should handle multiple code blocks", () => {
        const content = `{% A %}
\`\`\`
{% B %}
\`\`\`
{% C %}
\`\`\`
{% D %}
\`\`\`
{% E %}`;
        const prompts = extractPromptsFromContent(content);
        expect(prompts).toHaveLength(3);
        expect(prompts.map(p => p.name)).toEqual(["A", "C", "E"]);
      });

      it("should handle empty code blocks", () => {
        const content = `{% Before %}
\`\`\`
\`\`\`
{% After %}`;
        const prompts = extractPromptsFromContent(content);
        expect(prompts).toHaveLength(2);
      });

      it("should not confuse inline code with code blocks", () => {
        const content = "Use `{% syntax %}` for inline, {% Name %} for prompts";
        const prompts = extractPromptsFromContent(content);
        // Inline code (single backticks) should NOT be treated as code blocks
        expect(prompts).toHaveLength(2);
      });
    });

    describe("special characters in names", () => {
      it("should handle prompts with spaces in names", () => {
        const prompts = extractPromptsFromContent("{% First Name %}");
        expect(prompts).toHaveLength(1);
        expect(prompts[0].name).toBe("First Name");
      });

      it("should handle prompts with numbers", () => {
        const prompts = extractPromptsFromContent("{% Item1 %} and {% Item2 %}");
        expect(prompts).toHaveLength(2);
      });
    });
  });

  describe("hasPromptsInContent", () => {
    it("should return true for content with prompts", () => {
      expect(hasPromptsInContent("Hello {% Name %}")).toBe(true);
    });

    it("should return true for optional prompts", () => {
      expect(hasPromptsInContent("{%? Optional ?%}")).toBe(true);
    });

    it("should return false for content without prompts", () => {
      expect(hasPromptsInContent("Hello world!")).toBe(false);
    });

    it("should return false when prompts are only in code blocks", () => {
      const content = `No prompts here
\`\`\`
{% Inside %}
\`\`\``;
      expect(hasPromptsInContent(content)).toBe(false);
    });

    it("should return true when prompts exist outside code blocks", () => {
      const content = `{% Outside %}
\`\`\`
{% Inside %}
\`\`\``;
      expect(hasPromptsInContent(content)).toBe(true);
    });
  });

  describe("substitutePromptsInContent", () => {
    describe("basic substitution", () => {
      it("should substitute single prompt with value", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "Name", valueType: "text" },
        ];
        const values = { "1": "John" };
        const result = substitutePromptsInContent("Hello {% Name %}!", prompts, values);
        expect(result).toBe("Hello John!");
      });

      it("should substitute multiple prompts", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "First", valueType: "text" },
          { id: "2", name: "Last", valueType: "text" },
        ];
        const values = { "1": "John", "2": "Doe" };
        const result = substitutePromptsInContent("{% First %} {% Last %}", prompts, values);
        expect(result).toBe("John Doe");
      });

      it("should substitute duplicate prompt names with same value", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "Name", valueType: "text" },
        ];
        const values = { "1": "John" };
        const result = substitutePromptsInContent("{% Name %} is {% Name %}", prompts, values);
        expect(result).toBe("John is John");
      });

      it("should substitute optional prompts with empty value", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "Title", valueType: "text" },
          { id: "2", name: "Subtitle", valueType: "text", isOptional: true },
        ];
        const values = { "1": "Main", "2": "" };
        const result = substitutePromptsInContent("{% Title %}{%? Subtitle ?%}", prompts, values);
        expect(result).toBe("Main");
      });

      it("should substitute prompts with inline configuration", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "Count", valueType: "numeric" },
        ];
        const values = { "1": "42" };
        const result = substitutePromptsInContent("Number: {% Count:number %}", prompts, values);
        expect(result).toBe("Number: 42");
      });
    });

    describe("content preservation", () => {
      it("should preserve content outside of prompts", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "Name", valueType: "text" },
        ];
        const values = { "1": "Test" };
        const content = "Start\n{% Name %}\nEnd";
        const result = substitutePromptsInContent(content, prompts, values);
        expect(result).toBe("Start\nTest\nEnd");
      });

      it("should handle prompts at start of content", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "Name", valueType: "text" },
        ];
        const values = { "1": "Hello" };
        const result = substitutePromptsInContent("{% Name %} world", prompts, values);
        expect(result).toBe("Hello world");
      });

      it("should handle prompts at end of content", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "Name", valueType: "text" },
        ];
        const values = { "1": "world" };
        const result = substitutePromptsInContent("Hello {% Name %}", prompts, values);
        expect(result).toBe("Hello world");
      });

      it("should handle adjacent prompts", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "A", valueType: "text" },
          { id: "2", name: "B", valueType: "text" },
        ];
        const values = { "1": "Hello", "2": "World" };
        const result = substitutePromptsInContent("{% A %}{% B %}", prompts, values);
        expect(result).toBe("HelloWorld");
      });

      it("should handle multiline content with prompts", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "Title", valueType: "text" },
          { id: "2", name: "Author", valueType: "text" },
        ];
        const values = { "1": "My Book", "2": "John" };
        const content = `# {% Title %}

By {% Author %}

Content here.`;
        const expected = `# My Book

By John

Content here.`;
        const result = substitutePromptsInContent(content, prompts, values);
        expect(result).toBe(expected);
      });
    });

    describe("code block preservation", () => {
      it("should NOT substitute prompts inside code blocks", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "Name", valueType: "text" },
        ];
        const values = { "1": "John" };
        const content = `Hello {% Name %}
\`\`\`
{% Name %}
\`\`\``;
        const result = substitutePromptsInContent(content, prompts, values);
        expect(result).toBe(`Hello John
\`\`\`
{% Name %}
\`\`\``);
      });

      it("should preserve multiple code blocks", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "X", valueType: "text" },
        ];
        const values = { "1": "replaced" };
        const content = `{% X %}
\`\`\`
{% X %}
\`\`\`
{% X %}
\`\`\`
{% X %}
\`\`\`
{% X %}`;
        const result = substitutePromptsInContent(content, prompts, values);
        expect(result).toBe(`replaced
\`\`\`
{% X %}
\`\`\`
replaced
\`\`\`
{% X %}
\`\`\`
replaced`);
      });

      it("should preserve code blocks with language specifier", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "Name", valueType: "text" },
        ];
        const values = { "1": "Test" };
        const content = `{% Name %}
\`\`\`javascript
const name = "{% Name %}";
\`\`\``;
        const result = substitutePromptsInContent(content, prompts, values);
        expect(result).toContain("Test");
        expect(result).toContain('const name = "{% Name %}"');
      });

      it("should preserve tilde code blocks", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "Name", valueType: "text" },
        ];
        const values = { "1": "Test" };
        const content = `{% Name %}
~~~
{% Name %}
~~~`;
        const result = substitutePromptsInContent(content, prompts, values);
        expect(result).toBe(`Test
~~~
{% Name %}
~~~`);
      });
    });

    describe("edge cases", () => {
      it("should handle empty content", () => {
        const result = substitutePromptsInContent("", [], {});
        expect(result).toBe("");
      });

      it("should handle content with no prompts", () => {
        const result = substitutePromptsInContent("Hello world", [], {});
        expect(result).toBe("Hello world");
      });

      it("should return empty string for missing values", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "Missing", valueType: "text" },
        ];
        const result = substitutePromptsInContent("{% Missing %}", prompts, {});
        expect(result).toBe("");
      });

      it("should handle prompts with values containing special regex chars", () => {
        const prompts: UserPrompt[] = [
          { id: "1", name: "Name", valueType: "text" },
        ];
        const values = { "1": "Test $1 value" };
        const result = substitutePromptsInContent("{% Name %}", prompts, values);
        expect(result).toBe("Test $1 value");
      });
    });
  });

  describe("file prompts integration", () => {
    it("should extract, then substitute in full flow", () => {
      const content = `# {% Title %}

Author: {% Author %}

{%? Notes ?%}`;

      // Step 1: Extract prompts
      const prompts = extractPromptsFromContent(content);
      expect(prompts).toHaveLength(3);

      // Step 2: Create values mapping
      const values: Record<string, string> = {};
      for (const prompt of prompts) {
        if (prompt.name === "Title") values[prompt.id] = "My Document";
        if (prompt.name === "Author") values[prompt.id] = "John Doe";
        if (prompt.name === "Notes") values[prompt.id] = ""; // Optional, left empty
      }

      // Step 3: Substitute
      const result = substitutePromptsInContent(content, prompts, values);
      expect(result).toBe(`# My Document

Author: John Doe

`);
    });

    it("should handle mixed required and optional with code blocks", () => {
      const content = `{% Required %}

\`\`\`
{% InCode %}
\`\`\`

{%? Optional ?%}`;

      const prompts = extractPromptsFromContent(content);
      expect(prompts).toHaveLength(2);
      expect(prompts.map(p => p.name)).toEqual(["Required", "Optional"]);

      const values: Record<string, string> = {};
      for (const prompt of prompts) {
        if (prompt.name === "Required") values[prompt.id] = "Value";
        if (prompt.name === "Optional") values[prompt.id] = "";
      }

      const result = substitutePromptsInContent(content, prompts, values);
      expect(result).toContain("Value");
      expect(result).toContain("{% InCode %}"); // Preserved in code block
    });

    it("should handle various value types", () => {
      const content = `Name: {% Name:text %}
Count: {% Count:number %}
Date: {% Date:date:ISO %}`;

      const prompts = extractPromptsFromContent(content);
      expect(prompts).toHaveLength(3);
      expect(prompts[0].valueType).toBe("text");
      expect(prompts[1].valueType).toBe("numeric");
      expect(prompts[2].valueType).toBe("date");

      const values: Record<string, string> = {};
      for (const prompt of prompts) {
        if (prompt.name === "Name") values[prompt.id] = "John";
        if (prompt.name === "Count") values[prompt.id] = "42";
        if (prompt.name === "Date") values[prompt.id] = "2024-03-15";
      }

      const result = substitutePromptsInContent(content, prompts, values);
      expect(result).toBe(`Name: John
Count: 42
Date: 2024-03-15`);
    });
  });

  describe("replacePromptSyntax", () => {
    describe("basic replacements", () => {
      it("should replace simple prompt syntax", () => {
        const result = replacePromptSyntax(
          "{% Author %} - {% Title %}",
          "Author",
          "{% Author:text %}"
        );
        expect(result).toBe("{% Author:text %} - {% Title %}");
      });

      it("should replace prompt with type", () => {
        const result = replacePromptSyntax(
          "{% Count:number %} items",
          "Count",
          "{% Count:number %}"
        );
        expect(result).toBe("{% Count:number %} items");
      });

      it("should replace prompt with type and format", () => {
        const result = replacePromptSyntax(
          "{% Date:date:ISO %}",
          "Date",
          "{% Date:date:US %}"
        );
        expect(result).toBe("{% Date:date:US %}");
      });

      it("should replace optional prompt", () => {
        const result = replacePromptSyntax(
          "{%? Subtitle ?%}",
          "Subtitle",
          "{% Subtitle:text %}"
        );
        expect(result).toBe("{% Subtitle:text %}");
      });

      it("should replace prompt case-insensitively", () => {
        const result = replacePromptSyntax(
          "{% author %} wrote this",
          "Author",
          "{% Author:text %}"
        );
        expect(result).toBe("{% Author:text %} wrote this");
      });
    });

    describe("multiple occurrences", () => {
      it("should replace all occurrences of the same prompt", () => {
        const result = replacePromptSyntax(
          "{% Author %} - {% Author %}",
          "Author",
          "{% Author:text %}"
        );
        expect(result).toBe("{% Author:text %} - {% Author:text %}");
      });

      it("should only replace matching prompt name", () => {
        const result = replacePromptSyntax(
          "{% Author %} - {% Title %}",
          "Title",
          "{% Title:text %}"
        );
        expect(result).toBe("{% Author %} - {% Title:text %}");
      });
    });

    describe("complex patterns", () => {
      it("should replace prompt with custom format", () => {
        const result = replacePromptSyntax(
          "{% Date:datetime:format(YYYY-MM-DD) %}",
          "Date",
          "{% Date:date:ISO %}"
        );
        expect(result).toBe("{% Date:date:ISO %}");
      });

      it("should handle prompt names with spaces", () => {
        const result = replacePromptSyntax(
          "{% Event Name %}",
          "Event Name",
          "{% Event Name:text %}"
        );
        expect(result).toBe("{% Event Name:text %}");
      });

      it("should not affect other content", () => {
        const result = replacePromptSyntax(
          "Hello {% Name %} world",
          "Name",
          "{% Name:text %}"
        );
        expect(result).toBe("Hello {% Name:text %} world");
      });
    });

    describe("name changes", () => {
      it("should replace with different name", () => {
        const result = replacePromptSyntax(
          "{% OldName %}",
          "OldName",
          "{% NewName:text %}"
        );
        expect(result).toBe("{% NewName:text %}");
      });

      it("should replace with different type and format", () => {
        const result = replacePromptSyntax(
          "{% MyDate %}",
          "MyDate",
          "{% MyDate:date:EU %}"
        );
        expect(result).toBe("{% MyDate:date:EU %}");
      });
    });
  });

  describe("removePromptSyntax", () => {
    describe("basic removals", () => {
      it("should remove simple prompt syntax", () => {
        const result = removePromptSyntax("{% Author %} - {% Title %}", "Author");
        expect(result).toBe(" - {% Title %}");
      });

      it("should remove prompt with type", () => {
        const result = removePromptSyntax("{% Count:number %} items", "Count");
        expect(result).toBe(" items");
      });

      it("should remove prompt with type and format", () => {
        const result = removePromptSyntax("Start {% Date:date:ISO %} End", "Date");
        expect(result).toBe("Start  End");
      });

      it("should remove optional prompt", () => {
        const result = removePromptSyntax("Title{%? Subtitle ?%}", "Subtitle");
        expect(result).toBe("Title");
      });

      it("should remove prompt case-insensitively", () => {
        const result = removePromptSyntax("{% author %}", "Author");
        expect(result).toBe("");
      });
    });

    describe("multiple occurrences", () => {
      it("should remove all occurrences of the same prompt", () => {
        const result = removePromptSyntax("{% Name %} and {% Name %}", "Name");
        expect(result).toBe(" and ");
      });

      it("should only remove matching prompt name", () => {
        const result = removePromptSyntax("{% Author %} - {% Title %}", "Author");
        expect(result).toBe(" - {% Title %}");
      });
    });

    describe("edge cases", () => {
      it("should handle pattern with no matching prompt", () => {
        const result = removePromptSyntax("{% Author %}", "Title");
        expect(result).toBe("{% Author %}");
      });

      it("should handle empty pattern", () => {
        const result = removePromptSyntax("", "Name");
        expect(result).toBe("");
      });

      it("should handle pattern with custom format", () => {
        const result = removePromptSyntax(
          "{% Date:datetime:format(YYYY-MM-DD HH:mm) %}",
          "Date"
        );
        expect(result).toBe("");
      });

      it("should handle prompt at start of pattern", () => {
        const result = removePromptSyntax("{% Name %}-suffix", "Name");
        expect(result).toBe("-suffix");
      });

      it("should handle prompt at end of pattern", () => {
        const result = removePromptSyntax("prefix-{% Name %}", "Name");
        expect(result).toBe("prefix-");
      });
    });
  });
});
