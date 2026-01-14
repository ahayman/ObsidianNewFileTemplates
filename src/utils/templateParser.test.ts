import {
  parseTemplate,
  parseTemplateToFilename,
  validateTemplate,
  extractVariables,
  getTemplateVariables,
  sanitizeFilename,
  previewTemplate,
  SUPPORTED_VARIABLES,
} from "./templateParser";

describe("templateParser", () => {
  // Use a fixed date for consistent testing
  const fixedDate = new Date("2024-03-15T09:30:45.123Z");

  describe("getTemplateVariables", () => {
    it("should return all template variables for a given date", () => {
      const vars = getTemplateVariables(fixedDate);

      // Note: getHours returns local time, so we need to account for timezone
      const localHours = fixedDate.getHours().toString().padStart(2, "0");
      const localMinutes = fixedDate.getMinutes().toString().padStart(2, "0");
      const localSeconds = fixedDate.getSeconds().toString().padStart(2, "0");

      expect(vars.date).toBe("2024-03-15");
      expect(vars.time).toBe(`${localHours}-${localMinutes}-${localSeconds}`);
      expect(vars.year).toBe("2024");
      expect(vars.month).toBe("03");
      expect(vars.day).toBe("15");
      expect(vars.timestamp).toBe(String(fixedDate.getTime()));
    });

    it("should pad single digit months and days with zeros", () => {
      const singleDigitDate = new Date("2024-01-05T12:00:00");
      const vars = getTemplateVariables(singleDigitDate);

      expect(vars.month).toBe("01");
      expect(vars.day).toBe("05");
    });
  });

  describe("parseTemplate", () => {
    it("should replace {{date}} with formatted date", () => {
      const result = parseTemplate("{{date}}", fixedDate);
      expect(result).toBe("2024-03-15");
    });

    it("should replace {{year}} with year", () => {
      const result = parseTemplate("{{year}}", fixedDate);
      expect(result).toBe("2024");
    });

    it("should replace {{month}} with zero-padded month", () => {
      const result = parseTemplate("{{month}}", fixedDate);
      expect(result).toBe("03");
    });

    it("should replace {{day}} with zero-padded day", () => {
      const result = parseTemplate("{{day}}", fixedDate);
      expect(result).toBe("15");
    });

    it("should replace {{timestamp}} with unix timestamp", () => {
      const result = parseTemplate("{{timestamp}}", fixedDate);
      expect(result).toBe(String(fixedDate.getTime()));
    });

    it("should replace multiple variables in a pattern", () => {
      const result = parseTemplate("{{year}}-{{month}}-{{day}}", fixedDate);
      expect(result).toBe("2024-03-15");
    });

    it("should handle mixed text and variables", () => {
      const result = parseTemplate("notes-{{date}}-draft", fixedDate);
      expect(result).toBe("notes-2024-03-15-draft");
    });

    it("should preserve unrecognized variables", () => {
      const result = parseTemplate("{{date}}-{{unknown}}", fixedDate);
      expect(result).toBe("2024-03-15-{{unknown}}");
    });

    it("should handle patterns with no variables", () => {
      const result = parseTemplate("static-name", fixedDate);
      expect(result).toBe("static-name");
    });

    it("should handle empty pattern", () => {
      const result = parseTemplate("", fixedDate);
      expect(result).toBe("");
    });

    it("should be case-insensitive for variable names", () => {
      const result1 = parseTemplate("{{DATE}}", fixedDate);
      const result2 = parseTemplate("{{Date}}", fixedDate);
      const result3 = parseTemplate("{{date}}", fixedDate);

      expect(result1).toBe("2024-03-15");
      expect(result2).toBe("2024-03-15");
      expect(result3).toBe("2024-03-15");
    });

    it("should handle datetime variable", () => {
      const result = parseTemplate("{{datetime}}", fixedDate);
      // datetime format: YYYY-MM-DD_HH-mm-ss
      expect(result).toMatch(/^2024-03-15_\d{2}-\d{2}-\d{2}$/);
    });

    it("should handle time variable", () => {
      const result = parseTemplate("{{time}}", fixedDate);
      // time format: HH-mm-ss
      expect(result).toMatch(/^\d{2}-\d{2}-\d{2}$/);
    });

    it("should use current date when no date provided", () => {
      const before = new Date();
      const result = parseTemplate("{{year}}");
      const after = new Date();

      const year = parseInt(result, 10);
      expect(year).toBeGreaterThanOrEqual(before.getFullYear());
      expect(year).toBeLessThanOrEqual(after.getFullYear());
    });
  });

  describe("validateTemplate", () => {
    it("should return empty array for valid templates", () => {
      const result = validateTemplate("{{date}}-{{time}}-{{year}}");
      expect(result).toEqual([]);
    });

    it("should return unrecognized variable names", () => {
      const result = validateTemplate("{{date}}-{{invalid}}-{{unknown}}");
      expect(result).toContain("invalid");
      expect(result).toContain("unknown");
      expect(result).toHaveLength(2);
    });

    it("should return empty array for patterns without variables", () => {
      const result = validateTemplate("static-name");
      expect(result).toEqual([]);
    });

    it("should handle mixed valid and invalid variables", () => {
      const result = validateTemplate("{{date}}-{{bad}}-{{month}}");
      expect(result).toEqual(["bad"]);
    });
  });

  describe("extractVariables", () => {
    it("should extract all variable names from pattern", () => {
      const result = extractVariables("{{date}}-{{time}}-{{year}}");
      expect(result).toEqual(["date", "time", "year"]);
    });

    it("should return empty array for patterns without variables", () => {
      const result = extractVariables("static-name");
      expect(result).toEqual([]);
    });

    it("should normalize variable names to lowercase", () => {
      const result = extractVariables("{{DATE}}-{{Time}}-{{YEAR}}");
      expect(result).toEqual(["date", "time", "year"]);
    });

    it("should include unrecognized variables", () => {
      const result = extractVariables("{{date}}-{{custom}}");
      expect(result).toEqual(["date", "custom"]);
    });
  });

  describe("sanitizeFilename", () => {
    it("should replace invalid characters with dashes", () => {
      const result = sanitizeFilename('file<>:"/\\|?*name');
      expect(result).toBe("file---------name");
    });

    it("should remove leading dots", () => {
      const result = sanitizeFilename("...hidden");
      expect(result).toBe("hidden");
    });

    it("should remove trailing dots", () => {
      const result = sanitizeFilename("filename...");
      expect(result).toBe("filename");
    });

    it("should normalize whitespace", () => {
      const result = sanitizeFilename("file   name  with   spaces");
      expect(result).toBe("file name with spaces");
    });

    it("should trim leading and trailing whitespace", () => {
      const result = sanitizeFilename("  filename  ");
      expect(result).toBe("filename");
    });

    it("should handle already valid filenames", () => {
      const result = sanitizeFilename("valid-filename_123");
      expect(result).toBe("valid-filename_123");
    });

    it("should handle empty string", () => {
      const result = sanitizeFilename("");
      expect(result).toBe("");
    });
  });

  describe("parseTemplateToFilename", () => {
    it("should parse and sanitize in one step", () => {
      const result = parseTemplateToFilename("{{date}}/notes", fixedDate);
      expect(result).toBe("2024-03-15-notes");
    });

    it("should handle complex patterns with sanitization needed", () => {
      const result = parseTemplateToFilename("  {{date}}:{{time}}  ", fixedDate);
      // Colon replaced, whitespace trimmed
      expect(result).toMatch(/^2024-03-15-\d{2}-\d{2}-\d{2}$/);
    });
  });

  describe("previewTemplate", () => {
    it("should generate preview identical to parseTemplate", () => {
      const pattern = "{{date}}-{{month}}-notes";
      const preview = previewTemplate(pattern, fixedDate);
      const parsed = parseTemplate(pattern, fixedDate);

      expect(preview).toBe(parsed);
    });
  });

  describe("SUPPORTED_VARIABLES", () => {
    it("should contain all expected variables", () => {
      expect(SUPPORTED_VARIABLES).toContain("date");
      expect(SUPPORTED_VARIABLES).toContain("time");
      expect(SUPPORTED_VARIABLES).toContain("datetime");
      expect(SUPPORTED_VARIABLES).toContain("timestamp");
      expect(SUPPORTED_VARIABLES).toContain("year");
      expect(SUPPORTED_VARIABLES).toContain("month");
      expect(SUPPORTED_VARIABLES).toContain("day");
    });

    it("should have exactly 7 variables", () => {
      expect(SUPPORTED_VARIABLES).toHaveLength(7);
    });
  });
});
