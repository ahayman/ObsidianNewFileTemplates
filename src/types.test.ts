import { DEFAULT_SETTINGS, TitleTemplate, PluginSettings } from "./types";

describe("types", () => {
  describe("DEFAULT_SETTINGS", () => {
    it("should have empty templates array", () => {
      expect(DEFAULT_SETTINGS.templates).toEqual([]);
    });

    it("should have default template folder", () => {
      expect(DEFAULT_SETTINGS.templateFolder).toBe("Templates");
    });
  });

  describe("TitleTemplate", () => {
    it("should allow creating a valid template object", () => {
      const template: TitleTemplate = {
        id: "test-template",
        name: "Test Template",
        titlePattern: "{{date}}-{{title}}",
        folder: "Notes",
        fileTemplate: "Templates/Default.md",
      };

      expect(template.id).toBe("test-template");
      expect(template.name).toBe("Test Template");
      expect(template.titlePattern).toBe("{{date}}-{{title}}");
      expect(template.folder).toBe("Notes");
      expect(template.fileTemplate).toBe("Templates/Default.md");
    });

    it("should allow template without fileTemplate", () => {
      const template: TitleTemplate = {
        id: "minimal-template",
        name: "Minimal",
        titlePattern: "{{title}}",
        folder: "current",
      };

      expect(template.fileTemplate).toBeUndefined();
    });
  });

  describe("PluginSettings", () => {
    it("should allow creating valid settings", () => {
      const settings: PluginSettings = {
        templates: [
          {
            id: "daily",
            name: "Daily Note",
            titlePattern: "{{date}}",
            folder: "Daily",
          },
        ],
        templateFolder: "MyTemplates",
      };

      expect(settings.templates).toHaveLength(1);
      expect(settings.templateFolder).toBe("MyTemplates");
    });
  });
});
