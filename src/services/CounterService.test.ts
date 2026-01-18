import { App, TFile, TFolder, Vault } from "obsidian";
import {
  escapeRegex,
  momentFormatToRegex,
  getVariableRegexPattern,
  buildMatchingPattern,
  extractCounterFromFilename,
  getCounterValuesFromFolder,
  getNextCounterValue,
  CounterService,
} from "./CounterService";
import { TitleTemplate } from "../types";

// Helper to create mock App
const createMockApp = (files: { name: string; extension: string }[] = []): App => {
  const mockFiles = files.map((f) => {
    const file = new TFile();
    file.basename = f.name;
    file.extension = f.extension;
    return file;
  });

  const mockFolder = new TFolder();
  mockFolder.children = mockFiles;

  const mockVault = {
    getAbstractFileByPath: jest.fn((path: string) => {
      if (path === "Notes" || path === "TestFolder") {
        return mockFolder;
      }
      return null;
    }),
    getRoot: jest.fn(() => mockFolder),
  } as unknown as Vault;

  return {
    vault: mockVault,
  } as unknown as App;
};

describe("CounterService", () => {
  describe("escapeRegex", () => {
    it("should escape dots", () => {
      expect(escapeRegex("v1.0")).toBe("v1\\.0");
    });

    it("should escape brackets", () => {
      expect(escapeRegex("[Draft]")).toBe("\\[Draft\\]");
    });

    it("should escape parentheses", () => {
      expect(escapeRegex("(Note)")).toBe("\\(Note\\)");
    });

    it("should escape plus signs", () => {
      expect(escapeRegex("C++")).toBe("C\\+\\+");
    });

    it("should escape asterisks", () => {
      expect(escapeRegex("Note*")).toBe("Note\\*");
    });

    it("should escape question marks", () => {
      expect(escapeRegex("What?")).toBe("What\\?");
    });

    it("should escape carets", () => {
      expect(escapeRegex("^Start")).toBe("\\^Start");
    });

    it("should escape dollar signs", () => {
      expect(escapeRegex("$100")).toBe("\\$100");
    });

    it("should escape pipes", () => {
      expect(escapeRegex("A|B")).toBe("A\\|B");
    });

    it("should escape backslashes", () => {
      expect(escapeRegex("path\\file")).toBe("path\\\\file");
    });

    it("should escape curly braces", () => {
      expect(escapeRegex("{test}")).toBe("\\{test\\}");
    });

    it("should handle multiple special characters", () => {
      expect(escapeRegex("[v1.0] (Draft)")).toBe("\\[v1\\.0\\] \\(Draft\\)");
    });

    it("should leave plain text unchanged", () => {
      expect(escapeRegex("Simple Note")).toBe("Simple Note");
    });
  });

  describe("momentFormatToRegex", () => {
    it("should convert YYYY to 4-digit pattern", () => {
      expect(momentFormatToRegex("YYYY")).toBe("\\d{4}");
    });

    it("should convert YY to 2-digit pattern", () => {
      expect(momentFormatToRegex("YY")).toBe("\\d{2}");
    });

    it("should convert MM to 2-digit pattern", () => {
      expect(momentFormatToRegex("MM")).toBe("\\d{2}");
    });

    it("should convert M to 1-2 digit pattern", () => {
      expect(momentFormatToRegex("M")).toBe("\\d{1,2}");
    });

    it("should convert DD to 2-digit pattern", () => {
      expect(momentFormatToRegex("DD")).toBe("\\d{2}");
    });

    it("should convert D to 1-2 digit pattern", () => {
      expect(momentFormatToRegex("D")).toBe("\\d{1,2}");
    });

    it("should convert HH to 2-digit pattern", () => {
      expect(momentFormatToRegex("HH")).toBe("\\d{2}");
    });

    it("should convert mm to 2-digit pattern", () => {
      expect(momentFormatToRegex("mm")).toBe("\\d{2}");
    });

    it("should convert ss to 2-digit pattern", () => {
      expect(momentFormatToRegex("ss")).toBe("\\d{2}");
    });

    it("should convert YYYY-MM-DD format", () => {
      expect(momentFormatToRegex("YYYY-MM-DD")).toBe("\\d{4}-\\d{2}-\\d{2}");
    });

    it("should convert YYYYMMDD format (no separators)", () => {
      expect(momentFormatToRegex("YYYYMMDD")).toBe("\\d{4}\\d{2}\\d{2}");
    });

    it("should convert HH:mm:ss format", () => {
      // Colons are replaced with [:⦂] to match both regular and sanitized filenames
      expect(momentFormatToRegex("HH:mm:ss")).toBe("\\d{2}[:⦂]\\d{2}[:⦂]\\d{2}");
    });

    it("should convert HH-mm-ss format", () => {
      expect(momentFormatToRegex("HH-mm-ss")).toBe("\\d{2}-\\d{2}-\\d{2}");
    });

    it("should convert 12-hour format with AM/PM", () => {
      // Colons are replaced with [:⦂] to match both regular and sanitized filenames
      expect(momentFormatToRegex("h:mm A")).toBe("\\d{1,2}[:⦂]\\d{2} [AP]M");
    });

    it("should convert full month names", () => {
      expect(momentFormatToRegex("MMMM")).toBe("[A-Za-z]+");
    });

    it("should convert short month names", () => {
      expect(momentFormatToRegex("MMM")).toBe("[A-Za-z]{3}");
    });

    it("should convert full day names", () => {
      expect(momentFormatToRegex("dddd")).toBe("[A-Za-z]+");
    });

    it("should convert short day names", () => {
      expect(momentFormatToRegex("ddd")).toBe("[A-Za-z]{3}");
    });

    it("should handle complex format with literals", () => {
      const result = momentFormatToRegex("YYYY/MM/DD");
      expect(result).toBe("\\d{4}/\\d{2}/\\d{2}");
    });

    it("should escape dots in format string", () => {
      const result = momentFormatToRegex("YYYY.MM.DD");
      expect(result).toBe("\\d{4}\\.\\d{2}\\.\\d{2}");
    });
  });

  describe("getVariableRegexPattern", () => {
    it("should return digit pattern for counter", () => {
      expect(getVariableRegexPattern("counter")).toBe("\\d+");
    });

    it("should return default date pattern", () => {
      expect(getVariableRegexPattern("date")).toBe("\\d{4}-\\d{2}-\\d{2}");
    });

    it("should return custom date pattern when format provided", () => {
      expect(getVariableRegexPattern("date", "YYYYMMDD")).toBe("\\d{4}\\d{2}\\d{2}");
    });

    it("should return default time pattern", () => {
      // 12-hour format with AM/PM: h:mm:ss A
      // Colons are replaced with [:⦂] to match both regular and sanitized filenames
      expect(getVariableRegexPattern("time")).toBe("\\d{1,2}[:⦂]\\d{2}[:⦂]\\d{2} [AP]M");
    });

    it("should return custom time pattern when format provided", () => {
      // Colons are replaced with [:⦂] to match both regular and sanitized filenames
      expect(getVariableRegexPattern("time", "HH:mm")).toBe("\\d{2}[:⦂]\\d{2}");
    });

    it("should return datetime pattern", () => {
      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss
      // Colons are replaced with [:⦂] to match both regular and sanitized filenames
      expect(getVariableRegexPattern("datetime")).toBe(
        "\\d{4}-\\d{2}-\\d{2}T\\d{2}[:⦂]\\d{2}[:⦂]\\d{2}"
      );
    });

    it("should return timestamp pattern", () => {
      expect(getVariableRegexPattern("timestamp")).toBe("\\d{10,13}");
    });

    it("should return year pattern", () => {
      expect(getVariableRegexPattern("year")).toBe("\\d{4}");
    });

    it("should return month pattern", () => {
      expect(getVariableRegexPattern("month")).toBe("\\d{2}");
    });

    it("should return day pattern", () => {
      expect(getVariableRegexPattern("day")).toBe("\\d{2}");
    });

    it("should be case-insensitive", () => {
      expect(getVariableRegexPattern("COUNTER")).toBe("\\d+");
      expect(getVariableRegexPattern("Date")).toBe("\\d{4}-\\d{2}-\\d{2}");
    });

    it("should return non-greedy wildcard for unknown variables", () => {
      expect(getVariableRegexPattern("unknown")).toBe(".*?");
    });
  });

  describe("buildMatchingPattern", () => {
    it("should return null if no counter variable", () => {
      expect(buildMatchingPattern("Note {{date}}")).toBeNull();
    });

    it("should build pattern for simple counter template", () => {
      const pattern = buildMatchingPattern("Note {{counter}}");
      expect(pattern).not.toBeNull();
      expect(pattern!.source).toBe("^Note (\\d+)$");
    });

    it("should build pattern for counter at start", () => {
      const pattern = buildMatchingPattern("{{counter}} - Daily Note");
      expect(pattern).not.toBeNull();
      expect(pattern!.source).toBe("^(\\d+) - Daily Note$");
    });

    it("should build pattern for counter at end", () => {
      const pattern = buildMatchingPattern("Daily Note {{counter}}");
      expect(pattern).not.toBeNull();
      expect(pattern!.source).toBe("^Daily Note (\\d+)$");
    });

    it("should build pattern for counter in middle", () => {
      const pattern = buildMatchingPattern("Project {{counter}} Report");
      expect(pattern).not.toBeNull();
      expect(pattern!.source).toBe("^Project (\\d+) Report$");
    });

    it("should build pattern with date variable", () => {
      // With variable before counter and static after, uses flexible pattern
      const pattern = buildMatchingPattern("{{date}} - Note {{counter}}");
      expect(pattern).not.toBeNull();
      // Flexible pattern: variable before means .*? prefix, static " - Note " is stripped
      // Pattern should still correctly extract counter values
      expect(extractCounterFromFilename("2024-01-15 - Note 5", pattern!)).toBe(5);
      expect(extractCounterFromFilename("2024-12-31 - Note 100", pattern!)).toBe(100);
    });

    it("should build pattern with multiple variables", () => {
      // With variables before counter and nothing after, uses flexible pattern
      const pattern = buildMatchingPattern(
        "{{year}}-{{month}}-{{day}} Entry {{counter}}"
      );
      expect(pattern).not.toBeNull();
      // Should still correctly extract counter values
      expect(extractCounterFromFilename("2024-01-15 Entry 7", pattern!)).toBe(7);
      expect(extractCounterFromFilename("2024-12-31 Entry 999", pattern!)).toBe(999);
    });

    it("should build pattern with custom date format", () => {
      // Variable before counter - uses flexible pattern
      const pattern = buildMatchingPattern("{{date:YYYYMMDD}}-{{counter}}");
      expect(pattern).not.toBeNull();
      // Should correctly extract counter values
      expect(extractCounterFromFilename("20240115-42", pattern!)).toBe(42);
      expect(extractCounterFromFilename("20241231-1", pattern!)).toBe(1);
    });

    it("should build pattern with timestamp", () => {
      // Variable before counter - uses flexible pattern
      const pattern = buildMatchingPattern("{{timestamp}}_File_{{counter}}");
      expect(pattern).not.toBeNull();
      // Should correctly extract counter values
      expect(extractCounterFromFilename("1705312800000_File_42", pattern!)).toBe(42);
      expect(extractCounterFromFilename("1705312800000_File_1", pattern!)).toBe(1);
    });

    it("should escape special characters in template", () => {
      const pattern = buildMatchingPattern("[Project] {{counter}} (v1.0)");
      expect(pattern).not.toBeNull();
      expect(pattern!.source).toBe("^\\[Project\\] (\\d+) \\(v1\\.0\\)$");
    });

    it("should handle dots in template", () => {
      const pattern = buildMatchingPattern("File.{{counter}}.draft");
      expect(pattern).not.toBeNull();
      expect(pattern!.source).toBe("^File\\.(\\d+)\\.draft$");
    });

    it("should build pattern with datetime variable", () => {
      // Variable before counter - uses flexible pattern
      const pattern = buildMatchingPattern("{{datetime}} - Entry {{counter}}");
      expect(pattern).not.toBeNull();
      // Should correctly extract counter values regardless of datetime format
      // Note: colons in datetime are sanitized to ⦂ in filenames
      expect(extractCounterFromFilename("2024-01-15T10⦂30⦂00 - Entry 5", pattern!)).toBe(5);
      expect(extractCounterFromFilename("2024-01-15T10⦂30⦂00 - Entry 42", pattern!)).toBe(42);
    });
  });

  describe("extractCounterFromFilename", () => {
    it("should extract counter from simple filename", () => {
      const pattern = buildMatchingPattern("Note {{counter}}")!;
      expect(extractCounterFromFilename("Note 1", pattern)).toBe(1);
      expect(extractCounterFromFilename("Note 100", pattern)).toBe(100);
      expect(extractCounterFromFilename("Note 99999", pattern)).toBe(99999);
    });

    it("should extract counter from start of filename", () => {
      const pattern = buildMatchingPattern("{{counter}} - Daily Note")!;
      expect(extractCounterFromFilename("1 - Daily Note", pattern)).toBe(1);
      expect(extractCounterFromFilename("42 - Daily Note", pattern)).toBe(42);
    });

    it("should extract counter from end of filename", () => {
      const pattern = buildMatchingPattern("Daily Note {{counter}}")!;
      expect(extractCounterFromFilename("Daily Note 5", pattern)).toBe(5);
    });

    it("should extract counter from middle of filename", () => {
      const pattern = buildMatchingPattern("Project {{counter}} Report")!;
      expect(extractCounterFromFilename("Project 7 Report", pattern)).toBe(7);
    });

    it("should extract counter with date in filename", () => {
      const pattern = buildMatchingPattern("{{date}} - Note {{counter}}")!;
      expect(
        extractCounterFromFilename("2024-01-15 - Note 5", pattern)
      ).toBe(5);
      expect(
        extractCounterFromFilename("2024-12-31 - Note 100", pattern)
      ).toBe(100);
    });

    it("should extract zero as valid counter", () => {
      const pattern = buildMatchingPattern("Note {{counter}}")!;
      expect(extractCounterFromFilename("Note 0", pattern)).toBe(0);
    });

    it("should parse numbers with leading zeros", () => {
      const pattern = buildMatchingPattern("Note {{counter}}")!;
      // Leading zeros are valid but parsed as integer
      expect(extractCounterFromFilename("Note 001", pattern)).toBe(1);
      expect(extractCounterFromFilename("Note 007", pattern)).toBe(7);
    });

    it("should return null for non-matching filename", () => {
      const pattern = buildMatchingPattern("Note {{counter}}")!;
      expect(extractCounterFromFilename("Other Document", pattern)).toBeNull();
      expect(extractCounterFromFilename("Note", pattern)).toBeNull();
      expect(extractCounterFromFilename("Note ABC", pattern)).toBeNull();
    });

    it("should return null if no number in expected position", () => {
      const pattern = buildMatchingPattern("Note {{counter}}")!;
      expect(extractCounterFromFilename("Note Draft", pattern)).toBeNull();
    });

    it("should not match partial patterns", () => {
      const pattern = buildMatchingPattern("Note {{counter}}")!;
      // Should not match "Note 1 Extra" because pattern is anchored
      expect(extractCounterFromFilename("Note 1 Extra", pattern)).toBeNull();
      expect(extractCounterFromFilename("Prefix Note 1", pattern)).toBeNull();
    });

    it("should extract counter with special characters in template", () => {
      const pattern = buildMatchingPattern("[Project] {{counter}} (v1.0)")!;
      expect(
        extractCounterFromFilename("[Project] 5 (v1.0)", pattern)
      ).toBe(5);
    });

    it("should handle timestamp in pattern", () => {
      const pattern = buildMatchingPattern("{{timestamp}}_File_{{counter}}")!;
      expect(
        extractCounterFromFilename("1705312800000_File_42", pattern)
      ).toBe(42);
    });
  });

  describe("getCounterValuesFromFolder", () => {
    it("should return empty array for non-existent folder", () => {
      const app = createMockApp();
      const pattern = buildMatchingPattern("Note {{counter}}")!;

      const values = getCounterValuesFromFolder(app, pattern, "NonExistent");

      expect(values).toEqual([]);
    });

    it("should extract values from matching files", () => {
      const app = createMockApp([
        { name: "Note 1", extension: "md" },
        { name: "Note 2", extension: "md" },
        { name: "Note 3", extension: "md" },
      ]);
      const pattern = buildMatchingPattern("Note {{counter}}")!;

      const values = getCounterValuesFromFolder(app, pattern, "Notes");

      expect(values).toEqual([1, 2, 3]);
    });

    it("should ignore non-matching files", () => {
      const app = createMockApp([
        { name: "Note 1", extension: "md" },
        { name: "Note 2", extension: "md" },
        { name: "Other Document", extension: "md" },
        { name: "Note Draft", extension: "md" },
      ]);
      const pattern = buildMatchingPattern("Note {{counter}}")!;

      const values = getCounterValuesFromFolder(app, pattern, "Notes");

      expect(values).toEqual([1, 2]);
    });

    it("should ignore non-md files", () => {
      const app = createMockApp([
        { name: "Note 1", extension: "md" },
        { name: "Note 2", extension: "txt" },
        { name: "Note 3", extension: "png" },
      ]);
      const pattern = buildMatchingPattern("Note {{counter}}")!;

      const values = getCounterValuesFromFolder(app, pattern, "Notes");

      expect(values).toEqual([1]);
    });

    it("should handle files with gaps in counter sequence", () => {
      const app = createMockApp([
        { name: "Note 1", extension: "md" },
        { name: "Note 5", extension: "md" },
        { name: "Note 10", extension: "md" },
      ]);
      const pattern = buildMatchingPattern("Note {{counter}}")!;

      const values = getCounterValuesFromFolder(app, pattern, "Notes");

      expect(values).toEqual([1, 5, 10]);
    });

    it("should handle files with date in pattern", () => {
      const app = createMockApp([
        { name: "2024-01-15 - Entry 1", extension: "md" },
        { name: "2024-01-16 - Entry 2", extension: "md" },
        { name: "2024-01-17 - Entry 3", extension: "md" },
      ]);
      const pattern = buildMatchingPattern("{{date}} - Entry {{counter}}")!;

      const values = getCounterValuesFromFolder(app, pattern, "Notes");

      expect(values).toEqual([1, 2, 3]);
    });
  });

  describe("getNextCounterValue", () => {
    it("should return startsAt when no matching files exist", () => {
      const app = createMockApp([]);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "Note {{counter}}",
        folder: "Notes",
        counterStartsAt: 1,
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      expect(nextValue).toBe(1);
    });

    it("should return custom startsAt value when no files exist", () => {
      const app = createMockApp([]);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "Chapter {{counter}}",
        folder: "Notes",
        counterStartsAt: 100,
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      expect(nextValue).toBe(100);
    });

    it("should return max + 1 when matching files exist", () => {
      const app = createMockApp([
        { name: "Note 1", extension: "md" },
        { name: "Note 2", extension: "md" },
        { name: "Note 3", extension: "md" },
      ]);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "Note {{counter}}",
        folder: "Notes",
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      expect(nextValue).toBe(4);
    });

    it("should handle gaps in sequence", () => {
      const app = createMockApp([
        { name: "Note 1", extension: "md" },
        { name: "Note 3", extension: "md" },
        { name: "Note 5", extension: "md" },
      ]);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "Note {{counter}}",
        folder: "Notes",
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      // Should return 6 (max 5 + 1), not fill gaps
      expect(nextValue).toBe(6);
    });

    it("should return startsAt if template has no counter", () => {
      const app = createMockApp([
        { name: "Note 1", extension: "md" },
      ]);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "Note {{date}}",
        folder: "Notes",
        counterStartsAt: 5,
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      expect(nextValue).toBe(5);
    });

    it("should default startsAt to 1 if not specified", () => {
      const app = createMockApp([]);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "Note {{counter}}",
        folder: "Notes",
        // counterStartsAt not specified
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      expect(nextValue).toBe(1);
    });

    it("should handle startsAt of 0", () => {
      const app = createMockApp([]);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "Item {{counter}}",
        folder: "Notes",
        counterStartsAt: 0,
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      expect(nextValue).toBe(0);
    });

    it("should ignore non-matching files", () => {
      const app = createMockApp([
        { name: "Note 1", extension: "md" },
        { name: "Note 2", extension: "md" },
        { name: "Other Document", extension: "md" },
        { name: "Random File 999", extension: "md" },
      ]);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "Note {{counter}}",
        folder: "Notes",
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      expect(nextValue).toBe(3);
    });

    it("should work with complex patterns", () => {
      const app = createMockApp([
        { name: "2024-01-15 - Entry 1", extension: "md" },
        { name: "2024-01-16 - Entry 2", extension: "md" },
        { name: "2024-01-17 - Entry 10", extension: "md" },
      ]);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "{{date}} - Entry {{counter}}",
        folder: "Notes",
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      expect(nextValue).toBe(11);
    });

    it("should handle large counter values", () => {
      const app = createMockApp([
        { name: "Note 99999", extension: "md" },
      ]);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "Note {{counter}}",
        folder: "Notes",
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      expect(nextValue).toBe(100000);
    });
  });

  describe("CounterService class", () => {
    it("should provide getNextCounterValue method", () => {
      const app = createMockApp([
        { name: "Note 1", extension: "md" },
        { name: "Note 2", extension: "md" },
      ]);
      const service = new CounterService(app);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "Note {{counter}}",
        folder: "Notes",
      };

      const nextValue = service.getNextCounterValue(template, "Notes");

      expect(nextValue).toBe(3);
    });

    it("should provide buildMatchingPattern method", () => {
      const app = createMockApp();
      const service = new CounterService(app);

      const pattern = service.buildMatchingPattern("Note {{counter}}");

      expect(pattern).not.toBeNull();
      expect(pattern!.source).toBe("^Note (\\d+)$");
    });

    it("should provide extractCounterFromFilename method", () => {
      const app = createMockApp();
      const service = new CounterService(app);
      const pattern = service.buildMatchingPattern("Note {{counter}}")!;

      const value = service.extractCounterFromFilename("Note 42", pattern);

      expect(value).toBe(42);
    });
  });

  describe("edge cases and regression tests", () => {
    it("should handle counter with numbers in literal text", () => {
      // Ensure "v2.0" doesn't interfere with counter extraction
      const pattern = buildMatchingPattern("Project v2.0 - {{counter}}")!;
      expect(extractCounterFromFilename("Project v2.0 - 5", pattern)).toBe(5);
      expect(extractCounterFromFilename("Project v2.0 - 100", pattern)).toBe(100);
    });

    it("should handle multiple number-like variables", () => {
      // Note: "/" is an invalid filename character and gets removed during sanitization
      // Use a valid separator like "-" for realistic filenames
      const pattern = buildMatchingPattern(
        "{{year}}-{{month}}-{{day}}-Note {{counter}}"
      )!;
      expect(
        extractCounterFromFilename("2024-01-15-Note 7", pattern)
      ).toBe(7);
    });

    it("should handle timestamp followed by counter", () => {
      const pattern = buildMatchingPattern("{{timestamp}}-{{counter}}")!;
      expect(extractCounterFromFilename("1705312800000-42", pattern)).toBe(42);
    });

    it("should handle datetime followed by counter", () => {
      const pattern = buildMatchingPattern("{{datetime}}-{{counter}}")!;
      // Note: colons in datetime are sanitized to ⦂ in filenames
      expect(
        extractCounterFromFilename("2024-01-15T10⦂30⦂00-5", pattern)
      ).toBe(5);
    });

    it("should handle empty folder", () => {
      const app = createMockApp([]);
      const pattern = buildMatchingPattern("Note {{counter}}")!;

      const values = getCounterValuesFromFolder(app, pattern, "Notes");

      expect(values).toEqual([]);
    });

    it("should handle folder with only non-matching files", () => {
      const app = createMockApp([
        { name: "Random File", extension: "md" },
        { name: "Another File", extension: "md" },
      ]);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "Note {{counter}}",
        folder: "Notes",
        counterStartsAt: 1,
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      expect(nextValue).toBe(1);
    });

    it("should handle custom date format with counter", () => {
      const pattern = buildMatchingPattern("{{date:YYYYMMDD}}_Note_{{counter}}")!;
      expect(
        extractCounterFromFilename("20240115_Note_42", pattern)
      ).toBe(42);
    });

    it("should handle custom time format with counter", () => {
      const pattern = buildMatchingPattern("{{time:HHmm}}_Task_{{counter}}")!;
      expect(extractCounterFromFilename("1430_Task_7", pattern)).toBe(7);
    });

    it("should match counter case-insensitively in pattern", () => {
      const pattern1 = buildMatchingPattern("Note {{counter}}");
      const pattern2 = buildMatchingPattern("Note {{COUNTER}}");
      const pattern3 = buildMatchingPattern("Note {{Counter}}");

      expect(pattern1).not.toBeNull();
      expect(pattern2).not.toBeNull();
      expect(pattern3).not.toBeNull();

      // All should produce the same pattern
      expect(pattern1!.source).toBe(pattern2!.source);
      expect(pattern2!.source).toBe(pattern3!.source);
    });
  });

  describe("flexible pattern matching", () => {
    it("should use flexible pattern when counter is at start", () => {
      // {{counter}} at start with variables after - flexible suffix
      const pattern = buildMatchingPattern("{{counter}} - {{datetime}}");
      expect(pattern).not.toBeNull();

      // Should match any suffix after the counter
      // Note: colons in datetime are sanitized to ⦂ in filenames
      expect(extractCounterFromFilename("1 - 2024-01-15T10⦂30⦂00", pattern!)).toBe(1);
      expect(extractCounterFromFilename("42 - anything here really", pattern!)).toBe(42);
      expect(extractCounterFromFilename("100 - modified title by user", pattern!)).toBe(100);
    });

    it("should use flexible pattern when counter is at end", () => {
      // Variables before {{counter}} at end - flexible prefix
      const pattern = buildMatchingPattern("{{datetime}} - Entry {{counter}}");
      expect(pattern).not.toBeNull();

      // Should match any prefix before the counter
      // Note: colons in datetime are sanitized to ⦂ in filenames
      expect(extractCounterFromFilename("2024-01-15T10⦂30⦂00 - Entry 5", pattern!)).toBe(5);
      expect(extractCounterFromFilename("anything here - Entry 99", pattern!)).toBe(99);
    });

    it("should use static pattern when counter has static text on both sides", () => {
      // Static text before and after - exact match
      const pattern = buildMatchingPattern("Chapter {{counter}} End");
      expect(pattern).not.toBeNull();
      expect(pattern!.source).toBe("^Chapter (\\d+) End$");

      expect(extractCounterFromFilename("Chapter 1 End", pattern!)).toBe(1);
      expect(extractCounterFromFilename("Chapter 99 End", pattern!)).toBe(99);
      // Should NOT match if suffix is different
      expect(extractCounterFromFilename("Chapter 5 Different", pattern!)).toBeNull();
    });

    it("should use static prefix pattern when only counter follows", () => {
      const pattern = buildMatchingPattern("Note {{counter}}");
      expect(pattern).not.toBeNull();
      expect(pattern!.source).toBe("^Note (\\d+)$");
    });

    it("should use static suffix pattern when counter comes first", () => {
      const pattern = buildMatchingPattern("{{counter}} notes");
      expect(pattern).not.toBeNull();
      expect(pattern!.source).toBe("^(\\d+) notes$");
    });

    it("should handle user-modified titles with flexible patterns", () => {
      // Template: {{counter}} - {{datetime}}
      // User might modify the title before creating
      const pattern = buildMatchingPattern("{{counter}} - {{datetime}}");
      expect(pattern).not.toBeNull();

      // Standard filename (colons sanitized to ⦂)
      expect(extractCounterFromFilename("1 - 2024-01-15T10⦂30⦂00", pattern!)).toBe(1);
      // User added extra text
      expect(extractCounterFromFilename("2 - 2024-01-15T10⦂30⦂00 my notes", pattern!)).toBe(2);
      // User changed the datetime format
      expect(extractCounterFromFilename("3 - completely different format", pattern!)).toBe(3);
    });

    it("should use full precision only when variables on both sides", () => {
      // Variables on both sides of counter
      const pattern = buildMatchingPattern("{{date}} - {{counter}} - {{time}}");
      expect(pattern).not.toBeNull();

      // This needs full precision matching
      // Note: time format is h:mm:ss A, colons sanitized to ⦂
      expect(extractCounterFromFilename("2024-01-15 - 5 - 10⦂30⦂00 AM", pattern!)).toBe(5);
    });
  });

  describe("custom templates settings", () => {
    it("should use custom date format from settings", () => {
      const settings = {
        dateFormat: "YYYY-MM-DD ddd",
        timeFormat: "HH:mm",
      };
      const pattern = buildMatchingPattern("{{counter}} - {{date}}", settings);
      expect(pattern).not.toBeNull();

      // Should match filenames with day name in date
      expect(extractCounterFromFilename("1 - 2024-01-15 Mon", pattern!)).toBe(1);
      expect(extractCounterFromFilename("42 - 2024-12-31 Tue", pattern!)).toBe(42);
    });

    it("should use custom datetime format from settings", () => {
      const settings = {
        dateFormat: "YYYY-MM-DD ddd",
        timeFormat: "HH:mm",
      };
      const pattern = buildMatchingPattern("{{counter}} - {{datetime}}", settings);
      expect(pattern).not.toBeNull();

      // datetime uses dateFormat + "T" + HH:mm:ss (colons sanitized to ⦂)
      expect(extractCounterFromFilename("1 - 2024-01-15 MonT10⦂30⦂00", pattern!)).toBe(1);
      expect(extractCounterFromFilename("5 - 2024-01-15 ThuT10⦂58⦂42", pattern!)).toBe(5);
    });

    it("should handle date format with month name", () => {
      const settings = {
        dateFormat: "MMM D, YYYY",
        timeFormat: "HH:mm",
      };
      const pattern = buildMatchingPattern("{{counter}} - {{date}}", settings);
      expect(pattern).not.toBeNull();

      expect(extractCounterFromFilename("1 - Jan 15, 2024", pattern!)).toBe(1);
      expect(extractCounterFromFilename("99 - Dec 31, 2024", pattern!)).toBe(99);
    });

    it("should handle compact date format", () => {
      const settings = {
        dateFormat: "YYYYMMDD",
        timeFormat: "HH:mm",
      };
      const pattern = buildMatchingPattern("{{counter}}_{{date}}", settings);
      expect(pattern).not.toBeNull();

      expect(extractCounterFromFilename("1_20240115", pattern!)).toBe(1);
      expect(extractCounterFromFilename("100_20241231", pattern!)).toBe(100);
    });
  });

  describe("counter with user prompts", () => {
    it("should build pattern for counter with prompt after", () => {
      // Pattern: Chapter {{counter}} - {% Title %}
      // The prompt should be treated as dynamic content
      const pattern = buildMatchingPattern("Chapter {{counter}} - {% Title %}");
      expect(pattern).not.toBeNull();

      // Should match filenames where the prompt has been substituted with any text
      expect(extractCounterFromFilename("Chapter 1 - My Book", pattern!)).toBe(1);
      expect(extractCounterFromFilename("Chapter 2 - Another Title", pattern!)).toBe(2);
      expect(extractCounterFromFilename("Chapter 99 - The Final Chapter", pattern!)).toBe(99);
    });

    it("should build pattern for counter with prompt before", () => {
      // Pattern: {% Author %} - Note {{counter}}
      const pattern = buildMatchingPattern("{% Author %} - Note {{counter}}");
      expect(pattern).not.toBeNull();

      // Should match filenames where the prompt has been substituted
      expect(extractCounterFromFilename("John Smith - Note 1", pattern!)).toBe(1);
      expect(extractCounterFromFilename("Jane Doe - Note 42", pattern!)).toBe(42);
    });

    it("should build pattern for counter with prompts on both sides", () => {
      // Pattern: {% Author %} - {{counter}} - {% Title %}
      const pattern = buildMatchingPattern("{% Author %} - {{counter}} - {% Title %}");
      expect(pattern).not.toBeNull();

      // Should match filenames with prompts substituted on both sides
      expect(extractCounterFromFilename("John - 1 - My Book", pattern!)).toBe(1);
      expect(extractCounterFromFilename("Jane Doe - 99 - Another Title Here", pattern!)).toBe(99);
    });

    it("should build pattern for counter with mixed variables and prompts", () => {
      // Pattern: {{date}} - {% Topic %} - Note {{counter}}
      const pattern = buildMatchingPattern("{{date}} - {% Topic %} - Note {{counter}}");
      expect(pattern).not.toBeNull();

      // Should match filenames with both variables and prompts substituted
      expect(extractCounterFromFilename("2024-01-15 - Meeting - Note 5", pattern!)).toBe(5);
      expect(extractCounterFromFilename("2024-12-31 - Project Review - Note 100", pattern!)).toBe(100);
    });

    it("should increment counter correctly with prompt in pattern", () => {
      const app = createMockApp([
        { name: "Chapter 1 - Introduction", extension: "md" },
        { name: "Chapter 2 - Getting Started", extension: "md" },
        { name: "Chapter 3 - Advanced Topics", extension: "md" },
      ]);
      const template: TitleTemplate = {
        id: "test",
        name: "Book Chapter",
        titlePattern: "Chapter {{counter}} - {% Title %}",
        folder: "Notes",
        counterStartsAt: 1,
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      expect(nextValue).toBe(4);
    });

    it("should return startsAt when no matching files exist with prompt pattern", () => {
      const app = createMockApp([
        { name: "Some other file", extension: "md" },
        { name: "Not a chapter", extension: "md" },
      ]);
      const template: TitleTemplate = {
        id: "test",
        name: "Book Chapter",
        titlePattern: "Chapter {{counter}} - {% Title %}",
        folder: "Notes",
        counterStartsAt: 1,
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      expect(nextValue).toBe(1);
    });

    it("should handle gaps in sequence with prompt pattern", () => {
      const app = createMockApp([
        { name: "Chapter 1 - First", extension: "md" },
        { name: "Chapter 5 - Fifth", extension: "md" },
        { name: "Chapter 10 - Tenth", extension: "md" },
      ]);
      const template: TitleTemplate = {
        id: "test",
        name: "Book Chapter",
        titlePattern: "Chapter {{counter}} - {% Title %}",
        folder: "Notes",
        counterStartsAt: 1,
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      // Should return 11 (max 10 + 1), not fill gaps
      expect(nextValue).toBe(11);
    });

    it("should handle prompt with spaces in name", () => {
      const pattern = buildMatchingPattern("{% Book Title %} - Chapter {{counter}}");
      expect(pattern).not.toBeNull();

      expect(extractCounterFromFilename("My Great Book - Chapter 1", pattern!)).toBe(1);
      expect(extractCounterFromFilename("Another Book Title - Chapter 50", pattern!)).toBe(50);
    });

    it("should handle multiple prompts with counter", () => {
      // Pattern with two different prompts
      const pattern = buildMatchingPattern("{% Author %} - {% Series %} {{counter}}");
      expect(pattern).not.toBeNull();

      expect(extractCounterFromFilename("John Smith - Fantasy 1", pattern!)).toBe(1);
      expect(extractCounterFromFilename("Jane Doe - Sci-Fi Adventures 42", pattern!)).toBe(42);
    });

    it("should handle prompt at very end of pattern", () => {
      const pattern = buildMatchingPattern("Note {{counter}} by {% Author %}");
      expect(pattern).not.toBeNull();

      expect(extractCounterFromFilename("Note 1 by John", pattern!)).toBe(1);
      expect(extractCounterFromFilename("Note 999 by Jane Smith", pattern!)).toBe(999);
    });

    it("should increment with date variable and prompt", () => {
      const app = createMockApp([
        { name: "2024-01-15 - Meeting Notes 1", extension: "md" },
        { name: "2024-01-16 - Project Review 2", extension: "md" },
        { name: "2024-01-17 - Team Standup 3", extension: "md" },
      ]);
      const template: TitleTemplate = {
        id: "test",
        name: "Meeting",
        titlePattern: "{{date}} - {% Topic %} {{counter}}",
        folder: "Notes",
        counterStartsAt: 1,
      };

      const nextValue = getNextCounterValue(app, template, "Notes");

      expect(nextValue).toBe(4);
    });
  });

  describe("filename sanitization handling", () => {
    it("should handle pipe character (| → ∣) in template", () => {
      // Template uses regular pipe |, but filenames are sanitized to use ∣ (divides symbol)
      const pattern = buildMatchingPattern("{{counter}} | {{datetime}}");
      expect(pattern).not.toBeNull();

      // The pattern should match filenames with the sanitized divides symbol
      // Note: colons in datetime are also sanitized to ⦂
      expect(extractCounterFromFilename("1 ∣ 2024-01-15T10⦂30⦂00", pattern!)).toBe(1);
      expect(extractCounterFromFilename("42 ∣ 2024-01-15T10⦂30⦂00", pattern!)).toBe(42);
      expect(extractCounterFromFilename("100 ∣ 2024-12-31T23⦂59⦂59", pattern!)).toBe(100);
    });

    it("should handle colon character (: → ⦂) in template", () => {
      // Template uses regular colon :, but filenames are sanitized to use ⦂ (two dot punctuation)
      const pattern = buildMatchingPattern("Note: {{counter}}");
      expect(pattern).not.toBeNull();

      // The pattern should match filenames with the sanitized two-dot punctuation
      expect(extractCounterFromFilename("Note⦂ 1", pattern!)).toBe(1);
      expect(extractCounterFromFilename("Note⦂ 99", pattern!)).toBe(99);
    });

    it("should handle multiple sanitized characters in template", () => {
      const pattern = buildMatchingPattern("{{counter}} | Task: {{date}}");
      expect(pattern).not.toBeNull();

      // Both | and : should be sanitized
      expect(extractCounterFromFilename("5 ∣ Task⦂ 2024-01-15", pattern!)).toBe(5);
      expect(extractCounterFromFilename("123 ∣ Task⦂ 2024-12-31", pattern!)).toBe(123);
    });

    it("should handle pipe at different positions", () => {
      // Pipe at start
      const pattern1 = buildMatchingPattern("| {{counter}} |");
      expect(pattern1).not.toBeNull();
      expect(extractCounterFromFilename("∣ 7 ∣", pattern1!)).toBe(7);

      // Pipe in middle
      const pattern2 = buildMatchingPattern("A | {{counter}} | B");
      expect(pattern2).not.toBeNull();
      expect(extractCounterFromFilename("A ∣ 42 ∣ B", pattern2!)).toBe(42);
    });

    it("should correctly increment with sanitized characters", () => {
      const app = createMockApp([
        { name: "1 ∣ 2024-01-15T10⦂30⦂00", extension: "md" },
        { name: "2 ∣ 2024-01-15T10⦂31⦂00", extension: "md" },
        { name: "3 ∣ 2024-01-15T10⦂32⦂00", extension: "md" },
      ]);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "{{counter}} | {{datetime}}",
        folder: "Notes",
        counterStartsAt: 1,
      };

      const nextValue = getNextCounterValue(app, template, "Notes");
      expect(nextValue).toBe(4);
    });

    it("should return startsAt when no sanitized matches exist", () => {
      const app = createMockApp([
        { name: "Some other file", extension: "md" },
        { name: "Not matching", extension: "md" },
      ]);
      const template: TitleTemplate = {
        id: "test",
        name: "Test",
        titlePattern: "{{counter}} | {{datetime}}",
        folder: "Notes",
        counterStartsAt: 1,
      };

      const nextValue = getNextCounterValue(app, template, "Notes");
      expect(nextValue).toBe(1);
    });
  });
});
