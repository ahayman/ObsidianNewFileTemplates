/**
 * Integration tests for the main plugin functionality
 */

import { App, TFolder, TFile, moment } from "obsidian";
import { TitleTemplate, PluginSettings, DEFAULT_SETTINGS } from "./types";
import { FileService } from "./services";
import { parseTemplateToFilename } from "./utils";

// Mock App
const createMockApp = () => {
  const mockFile = new TFile();
  mockFile.path = "test.md";

  const mockFolder = new TFolder();
  mockFolder.path = "Notes";

  return {
    vault: {
      getAbstractFileByPath: jest.fn(),
      create: jest.fn().mockResolvedValue(mockFile),
      read: jest.fn(),
      createFolder: jest.fn(),
      getAllLoadedFiles: jest.fn(() => [mockFolder]),
    },
    workspace: {
      getActiveFile: jest.fn(() => mockFile),
      getLeaf: jest.fn(() => ({
        openFile: jest.fn(),
      })),
      on: jest.fn(),
    },
    // Mock internal plugins for Templates settings access
    internalPlugins: {
      getPluginById: jest.fn(() => ({
        enabled: true,
        instance: {
          options: {
            folder: "Templates",
            dateFormat: "YYYY-MM-DD",
            timeFormat: "HH:mm",
          },
        },
      })),
    },
  } as unknown as App;
};

describe("Plugin Integration", () => {
  describe("File creation workflow", () => {
    it("should create file with correct name from template pattern", async () => {
      const app = createMockApp();
      const fileService = new FileService(app);

      const template: TitleTemplate = {
        id: "test-1",
        name: "Daily Note",
        titlePattern: "{{date}}-daily",
        folder: "Notes",
      };

      // Generate filename
      const filename = parseTemplateToFilename(template.titlePattern);

      // Should match date pattern
      expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}-daily$/);

      // Create file
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);
      const result = await fileService.createFile("Notes", filename, "");

      expect(app.vault.create).toHaveBeenCalledWith(
        expect.stringMatching(/^Notes\/\d{4}-\d{2}-\d{2}-daily\.md$/),
        ""
      );
    });

    it("should apply file template content with variable substitution", async () => {
      const app = createMockApp();
      const fileService = new FileService(app);

      const templateContent = `# {{title}}

Created: {{date}}
`;

      const processed = fileService.processFileTemplate(
        templateContent,
        "My Note"
      );

      expect(processed).toContain("# My Note");
      expect(processed).toMatch(/Created: \d{4}-\d{2}-\d{2}/);
    });

    it("should handle file name conflicts", async () => {
      const app = createMockApp();
      const fileService = new FileService(app);

      const existingFile = new TFile();

      // First check returns existing, second returns null
      (app.vault.getAbstractFileByPath as jest.Mock)
        .mockReturnValueOnce(existingFile)
        .mockReturnValueOnce(null);

      const result = await fileService.resolveFilenameConflict("Notes", "test");

      expect(result.finalFilename).toBe("test 1");
      expect(result.conflictResolved).toBe(true);
    });
  });

  describe("Template configuration", () => {
    it("should use current folder when template.folder is 'current'", () => {
      const app = createMockApp();
      const fileService = new FileService(app);

      const mockFile = new TFile();
      const mockFolder = new TFolder();
      mockFolder.path = "Projects/MyProject";
      mockFile.parent = mockFolder;

      (app.workspace.getActiveFile as jest.Mock).mockReturnValue(mockFile);

      const currentFolder = fileService.getCurrentFolder();
      expect(currentFolder).toBe("Projects/MyProject");
    });

    it("should return root when no active file", () => {
      const app = createMockApp();
      const fileService = new FileService(app);

      (app.workspace.getActiveFile as jest.Mock).mockReturnValue(null);

      const currentFolder = fileService.getCurrentFolder();
      expect(currentFolder).toBe("/");
    });
  });

  describe("Settings management", () => {
    it("should have correct default settings", () => {
      expect(DEFAULT_SETTINGS.templates).toEqual([]);
      expect(DEFAULT_SETTINGS.templateFolder).toBe("Templates");
    });

    it("should merge loaded settings with defaults", () => {
      const loadedSettings: Partial<PluginSettings> = {
        templates: [
          {
            id: "1",
            name: "Test",
            titlePattern: "{{date}}",
            folder: "Notes",
          },
        ],
      };

      const merged = Object.assign({}, DEFAULT_SETTINGS, loadedSettings);

      expect(merged.templates).toHaveLength(1);
      expect(merged.templateFolder).toBe("Templates"); // Default preserved
    });
  });

  describe("Edge cases", () => {
    it("should handle empty template pattern gracefully", () => {
      const result = parseTemplateToFilename("");
      expect(result).toBe("");
    });

    it("should sanitize dangerous characters in filenames", () => {
      const result = parseTemplateToFilename("test/file:name*here");
      expect(result).not.toContain("/");
      expect(result).not.toContain(":");
      expect(result).not.toContain("*");
    });

    it("should handle template with only variables", () => {
      const result = parseTemplateToFilename("{{date}}");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should handle template with no variables", () => {
      const result = parseTemplateToFilename("static-name");
      expect(result).toBe("static-name");
    });

    it("should handle unknown variables by preserving them", () => {
      const result = parseTemplateToFilename("{{unknown}}-test");
      expect(result).toBe("{{unknown}}-test");
    });

    it("should handle missing file template gracefully", async () => {
      const app = createMockApp();
      const fileService = new FileService(app);

      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);

      const content = await fileService.getTemplateContent("nonexistent.md");
      expect(content).toBeNull();
    });

    it("should handle deeply nested folder paths", async () => {
      const app = createMockApp();
      const fileService = new FileService(app);

      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);

      await fileService.ensureFolderExists("a/b/c/d/e");

      expect(app.vault.createFolder).toHaveBeenCalledWith("a/b/c/d/e");
    });

    it("should not create root folder", async () => {
      const app = createMockApp();
      const fileService = new FileService(app);

      await fileService.ensureFolderExists("/");
      await fileService.ensureFolderExists("");

      expect(app.vault.createFolder).not.toHaveBeenCalled();
    });
  });

  describe("Template variables", () => {
    const fixedMoment = moment("2024-06-15T14:30:45.000Z");

    it("should process date and custom format variables correctly", () => {
      const app = createMockApp();
      const fileService = new FileService(app);

      const template = "{{date}} {{date:YYYY}}-{{date:MM}}-{{date:DD}}";
      const result = fileService.processFileTemplate(template, "test", fixedMoment);

      expect(result).toBe("2024-06-15 2024-06-15");
    });

    it("should handle title variable in various positions", () => {
      const app = createMockApp();
      const fileService = new FileService(app);

      const templates = [
        { input: "{{title}}", expected: "MyNote" },
        { input: "prefix-{{title}}", expected: "prefix-MyNote" },
        { input: "{{title}}-suffix", expected: "MyNote-suffix" },
        { input: "{{title}}-{{title}}", expected: "MyNote-MyNote" },
      ];

      templates.forEach(({ input, expected }) => {
        const result = fileService.processFileTemplate(input, "MyNote", fixedMoment);
        expect(result).toBe(expected);
      });
    });

    it("should support time variable with format", () => {
      const app = createMockApp();
      const fileService = new FileService(app);

      const result = fileService.processFileTemplate("Time: {{time:HH:mm:ss}}", "test", fixedMoment);
      // Time format matches HH:mm:ss pattern (timezone may vary)
      expect(result).toMatch(/^Time: \d{2}:\d{2}:\d{2}$/);
    });
  });
});
