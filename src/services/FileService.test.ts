import { App, TFile, TFolder, Vault, Workspace, moment } from "obsidian";
import { FileService } from "./FileService";

// Create mock instances
const createMockApp = (): App => {
  const mockVault = {
    getAbstractFileByPath: jest.fn(),
    create: jest.fn(),
    read: jest.fn(),
    createFolder: jest.fn(),
    getAllLoadedFiles: jest.fn(() => []),
  } as unknown as Vault;

  const mockWorkspace = {
    getActiveFile: jest.fn(),
    getLeaf: jest.fn(() => ({
      openFile: jest.fn(),
    })),
  } as unknown as Workspace;

  // Mock internal plugins for Templates settings access
  const mockInternalPlugins = {
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
  };

  return {
    vault: mockVault,
    workspace: mockWorkspace,
    internalPlugins: mockInternalPlugins,
  } as unknown as App;
};

describe("FileService", () => {
  let app: App;
  let fileService: FileService;

  beforeEach(() => {
    app = createMockApp();
    fileService = new FileService(app);
    jest.clearAllMocks();
  });

  describe("createFile", () => {
    it("should create a file with the given filename", async () => {
      const mockFile = new TFile();
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);
      (app.vault.create as jest.Mock).mockResolvedValue(mockFile);

      const result = await fileService.createFile("Notes", "test-note", "content");

      expect(app.vault.create).toHaveBeenCalledWith("Notes/test-note.md", "content");
      expect(result.file).toBe(mockFile);
      expect(result.finalFilename).toBe("test-note");
      expect(result.conflictResolved).toBe(false);
    });

    it("should sanitize the filename", async () => {
      const mockFile = new TFile();
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);
      (app.vault.create as jest.Mock).mockResolvedValue(mockFile);

      await fileService.createFile("Notes", "test:note/invalid", "content");

      expect(app.vault.create).toHaveBeenCalledWith("Notes/test-note-invalid.md", "content");
    });

    it("should resolve filename conflicts by appending a number", async () => {
      const mockFile = new TFile();
      const existingFile = new TFile();

      // First call returns existing file, second call returns null (available)
      (app.vault.getAbstractFileByPath as jest.Mock)
        .mockReturnValueOnce(null) // ensureFolderExists check
        .mockReturnValueOnce(existingFile) // first filename check
        .mockReturnValueOnce(null); // second filename check (with number)
      (app.vault.create as jest.Mock).mockResolvedValue(mockFile);

      const result = await fileService.createFile("Notes", "test-note", "content");

      expect(app.vault.create).toHaveBeenCalledWith("Notes/test-note 1.md", "content");
      expect(result.finalFilename).toBe("test-note 1");
      expect(result.conflictResolved).toBe(true);
    });

    it("should create file with empty content by default", async () => {
      const mockFile = new TFile();
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);
      (app.vault.create as jest.Mock).mockResolvedValue(mockFile);

      await fileService.createFile("Notes", "test-note");

      expect(app.vault.create).toHaveBeenCalledWith("Notes/test-note.md", "");
    });
  });

  describe("getTemplateContent", () => {
    it("should return content of an existing template file", async () => {
      const mockFile = new TFile();
      mockFile.path = "Templates/template.md";
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(mockFile);
      (app.vault.read as jest.Mock).mockResolvedValue("template content");

      const content = await fileService.getTemplateContent("Templates/template.md");

      expect(content).toBe("template content");
      expect(app.vault.read).toHaveBeenCalledWith(mockFile);
    });

    it("should return null if template file does not exist", async () => {
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);

      const content = await fileService.getTemplateContent("Templates/nonexistent.md");

      expect(content).toBeNull();
    });

    it("should return null if path points to a folder", async () => {
      const mockFolder = new TFolder();
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(mockFolder);

      const content = await fileService.getTemplateContent("Templates");

      expect(content).toBeNull();
    });
  });

  describe("processFileTemplate", () => {
    // Create a mock moment object for testing
    const fixedMoment = moment("2024-03-15T09:30:45.000Z");

    it("should replace {{title}} with the provided title", () => {
      const content = "# {{title}}\n\nThis is a note about {{title}}.";
      const result = fileService.processFileTemplate(content, "My Note", fixedMoment);

      expect(result).toBe("# My Note\n\nThis is a note about My Note.");
    });

    it("should replace date variables", () => {
      const content = "Created on {{date}}";
      const result = fileService.processFileTemplate(content, "Test", fixedMoment);

      expect(result).toBe("Created on 2024-03-15");
    });

    it("should be case-insensitive for title variable", () => {
      const content = "{{TITLE}} - {{Title}} - {{title}}";
      const result = fileService.processFileTemplate(content, "Test", fixedMoment);

      expect(result).toBe("Test - Test - Test");
    });

    it("should handle mixed title and date variables", () => {
      const content = "# {{title}}\n\nCreated: {{date}}";
      const result = fileService.processFileTemplate(content, "My Note", fixedMoment);

      // Note: {{year}} is no longer a separate variable in the new implementation
      // Use {{date:YYYY}} for year only
      expect(result).toContain("# My Note");
      expect(result).toContain("Created: 2024-03-15");
    });

    it("should return content unchanged if no variables", () => {
      const content = "This is plain content.";
      const result = fileService.processFileTemplate(content, "Test", fixedMoment);

      expect(result).toBe("This is plain content.");
    });

    it("should preserve unrecognized variables", () => {
      const content = "{{title}} - {{unknown}}";
      const result = fileService.processFileTemplate(content, "Test", fixedMoment);

      expect(result).toBe("Test - {{unknown}}");
    });

    it("should support custom date format syntax", () => {
      const content = "Year: {{date:YYYY}}, Month: {{date:MM}}";
      const result = fileService.processFileTemplate(content, "Test", fixedMoment);

      expect(result).toBe("Year: 2024, Month: 03");
    });

    it("should support time variable", () => {
      const content = "Time: {{time}}";
      const result = fileService.processFileTemplate(content, "Test", fixedMoment);

      // Time format matches HH:mm pattern (timezone may vary)
      expect(result).toMatch(/^Time: \d{2}:\d{2}$/);
    });

    it("should support custom time format syntax", () => {
      const content = "Time: {{time:HH:mm:ss}}";
      const result = fileService.processFileTemplate(content, "Test", fixedMoment);

      // Time format matches HH:mm:ss pattern (timezone may vary)
      expect(result).toMatch(/^Time: \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe("getCurrentFolder", () => {
    it("should return the folder of the active file", () => {
      const mockFile = new TFile();
      const mockFolder = new TFolder();
      mockFolder.path = "Notes/Subfolder";
      mockFile.parent = mockFolder;
      (app.workspace.getActiveFile as jest.Mock).mockReturnValue(mockFile);

      const folder = fileService.getCurrentFolder();

      expect(folder).toBe("Notes/Subfolder");
    });

    it("should return root if no active file", () => {
      (app.workspace.getActiveFile as jest.Mock).mockReturnValue(null);

      const folder = fileService.getCurrentFolder();

      expect(folder).toBe("/");
    });

    it("should return root if active file has no parent", () => {
      const mockFile = new TFile();
      mockFile.parent = null;
      (app.workspace.getActiveFile as jest.Mock).mockReturnValue(mockFile);

      const folder = fileService.getCurrentFolder();

      expect(folder).toBe("/");
    });
  });

  describe("ensureFolderExists", () => {
    it("should not create folder if it already exists", async () => {
      const mockFolder = new TFolder();
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(mockFolder);

      await fileService.ensureFolderExists("Existing/Folder");

      expect(app.vault.createFolder).not.toHaveBeenCalled();
    });

    it("should create folder if it does not exist", async () => {
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);

      await fileService.ensureFolderExists("New/Folder");

      expect(app.vault.createFolder).toHaveBeenCalledWith("New/Folder");
    });

    it("should not create root folder", async () => {
      await fileService.ensureFolderExists("/");

      expect(app.vault.createFolder).not.toHaveBeenCalled();
    });

    it("should not create empty folder path", async () => {
      await fileService.ensureFolderExists("");

      expect(app.vault.createFolder).not.toHaveBeenCalled();
    });
  });

  describe("resolveFilenameConflict", () => {
    it("should return original filename if no conflict", async () => {
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);

      const result = await fileService.resolveFilenameConflict("Notes", "test");

      expect(result.finalFilename).toBe("test");
      expect(result.conflictResolved).toBe(false);
    });

    it("should append number if conflict exists", async () => {
      const existingFile = new TFile();
      (app.vault.getAbstractFileByPath as jest.Mock)
        .mockReturnValueOnce(existingFile) // original filename exists
        .mockReturnValueOnce(null); // test 1 is available

      const result = await fileService.resolveFilenameConflict("Notes", "test");

      expect(result.finalFilename).toBe("test 1");
      expect(result.conflictResolved).toBe(true);
    });

    it("should increment number until available filename found", async () => {
      const existingFile = new TFile();
      (app.vault.getAbstractFileByPath as jest.Mock)
        .mockReturnValueOnce(existingFile) // original exists
        .mockReturnValueOnce(existingFile) // test 1 exists
        .mockReturnValueOnce(existingFile) // test 2 exists
        .mockReturnValueOnce(null); // test 3 is available

      const result = await fileService.resolveFilenameConflict("Notes", "test");

      expect(result.finalFilename).toBe("test 3");
      expect(result.conflictResolved).toBe(true);
    });
  });

  describe("getAllFolders", () => {
    it("should return all folders including root", () => {
      const folder1 = new TFolder();
      folder1.path = "Notes";
      const folder2 = new TFolder();
      folder2.path = "Templates";
      const file = new TFile();
      file.path = "test.md";

      (app.vault.getAllLoadedFiles as jest.Mock).mockReturnValue([folder1, folder2, file]);

      const folders = fileService.getAllFolders();

      expect(folders).toContain("/");
      expect(folders).toContain("Notes");
      expect(folders).toContain("Templates");
      expect(folders).not.toContain("test.md");
    });

    it("should return sorted folders", () => {
      const folder1 = new TFolder();
      folder1.path = "Zebra";
      const folder2 = new TFolder();
      folder2.path = "Alpha";

      (app.vault.getAllLoadedFiles as jest.Mock).mockReturnValue([folder1, folder2]);

      const folders = fileService.getAllFolders();

      expect(folders[0]).toBe("/");
      expect(folders[1]).toBe("Alpha");
      expect(folders[2]).toBe("Zebra");
    });
  });

  describe("getMarkdownFilesInFolder", () => {
    it("should return markdown files in the specified folder", () => {
      const folder = new TFolder();
      folder.path = "Templates";

      const file1 = new TFile();
      file1.path = "Templates/template1.md";
      file1.extension = "md";

      const file2 = new TFile();
      file2.path = "Templates/template2.md";
      file2.extension = "md";

      const nonMdFile = new TFile();
      nonMdFile.path = "Templates/image.png";
      nonMdFile.extension = "png";

      folder.children = [file1, file2, nonMdFile];

      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(folder);

      const files = fileService.getMarkdownFilesInFolder("Templates");

      expect(files).toContain("Templates/template1.md");
      expect(files).toContain("Templates/template2.md");
      expect(files).not.toContain("Templates/image.png");
    });

    it("should return empty array if folder does not exist", () => {
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);

      const files = fileService.getMarkdownFilesInFolder("NonExistent");

      expect(files).toEqual([]);
    });

    it("should recursively collect files from subfolders", () => {
      const rootFolder = new TFolder();
      rootFolder.path = "Templates";

      const subFolder = new TFolder();
      subFolder.path = "Templates/Sub";

      const file1 = new TFile();
      file1.path = "Templates/root.md";
      file1.extension = "md";

      const file2 = new TFile();
      file2.path = "Templates/Sub/nested.md";
      file2.extension = "md";

      subFolder.children = [file2];
      rootFolder.children = [file1, subFolder];

      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(rootFolder);

      const files = fileService.getMarkdownFilesInFolder("Templates");

      expect(files).toContain("Templates/root.md");
      expect(files).toContain("Templates/Sub/nested.md");
    });
  });

  describe("openFile", () => {
    it("should open file in current leaf by default", async () => {
      const mockFile = new TFile();
      const mockLeaf = { openFile: jest.fn() };
      (app.workspace.getLeaf as jest.Mock).mockReturnValue(mockLeaf);

      await fileService.openFile(mockFile);

      expect(app.workspace.getLeaf).toHaveBeenCalledWith(false);
      expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile);
    });

    it("should open file in new leaf when specified", async () => {
      const mockFile = new TFile();
      const mockLeaf = { openFile: jest.fn() };
      (app.workspace.getLeaf as jest.Mock).mockReturnValue(mockLeaf);

      await fileService.openFile(mockFile, true);

      expect(app.workspace.getLeaf).toHaveBeenCalledWith(true);
      expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile);
    });
  });
});
