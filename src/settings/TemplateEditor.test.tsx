import { render, screen, fireEvent } from "@testing-library/react";
import { TemplateEditor } from "./TemplateEditor";
import { AppContext } from "./AppContext";
import { App, TFolder, TFile } from "obsidian";
import { TitleTemplate } from "../types";

// Mock Obsidian App
const createMockApp = (): App => {
  const mockFolder = new TFolder();
  mockFolder.path = "Notes";

  const mockFile = new TFile();
  mockFile.path = "Templates/Default.md";
  mockFile.extension = "md";

  return {
    vault: {
      getAllLoadedFiles: jest.fn(() => [mockFolder, mockFile]),
    },
  } as unknown as App;
};

// Wrapper component with AppContext
const renderWithApp = (ui: React.ReactElement, app: App = createMockApp()) => {
  return render(
    <AppContext.Provider value={app}>{ui}</AppContext.Provider>
  );
};

describe("TemplateEditor", () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();
  const defaultTemplateFolder = "Templates";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("creating a new template", () => {
    it("should render empty form for new template", () => {
      renderWithApp(
        <TemplateEditor
          templateFolder={defaultTemplateFolder}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/template name/i)).toHaveValue("");
      expect(screen.getByLabelText(/title pattern/i)).toHaveValue("{{date}}-");
      expect(screen.getByText(/add template/i)).toBeInTheDocument();
    });

    it("should show validation errors when saving empty form", () => {
      renderWithApp(
        <TemplateEditor
          templateFolder={defaultTemplateFolder}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Clear the default pattern
      fireEvent.change(screen.getByLabelText(/title pattern/i), {
        target: { value: "" },
      });

      // Try to save
      fireEvent.click(screen.getByText(/add template/i));

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/title pattern is required/i)).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("should call onSave with new template data", () => {
      renderWithApp(
        <TemplateEditor
          templateFolder={defaultTemplateFolder}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Fill in the form - only name and pattern needed
      // Folder defaults to "current" when using SearchableSelect
      fireEvent.change(screen.getByLabelText(/template name/i), {
        target: { value: "Daily Note" },
      });
      fireEvent.change(screen.getByLabelText(/title pattern/i), {
        target: { value: "{{date}}-daily" },
      });

      // Save - folder will be "current" by default
      fireEvent.click(screen.getByText(/add template/i));

      expect(mockOnSave).toHaveBeenCalledTimes(1);
      const savedTemplate = mockOnSave.mock.calls[0][0] as TitleTemplate;
      expect(savedTemplate.name).toBe("Daily Note");
      expect(savedTemplate.titlePattern).toBe("{{date}}-daily");
      expect(savedTemplate.folder).toBe("current"); // Default value
      expect(savedTemplate.id).toBeDefined();
    });

    it("should call onCancel when cancel button is clicked", () => {
      renderWithApp(
        <TemplateEditor
          templateFolder={defaultTemplateFolder}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText(/cancel/i));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("editing an existing template", () => {
    const existingTemplate: TitleTemplate = {
      id: "test-123",
      name: "Meeting Notes",
      titlePattern: "{{date}}-meeting",
      folder: "Notes",
      fileTemplate: "Templates/Default.md",
    };

    it("should populate form with existing template data", () => {
      renderWithApp(
        <TemplateEditor
          template={existingTemplate}
          templateFolder={defaultTemplateFolder}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/template name/i)).toHaveValue("Meeting Notes");
      expect(screen.getByLabelText(/title pattern/i)).toHaveValue("{{date}}-meeting");
      // SearchableSelect shows value in input, check if folder label is present
      expect(screen.getByLabelText(/target folder/i)).toBeInTheDocument();
      expect(screen.getByText(/save changes/i)).toBeInTheDocument();
    });

    it("should preserve template id when saving edits", () => {
      renderWithApp(
        <TemplateEditor
          template={existingTemplate}
          templateFolder={defaultTemplateFolder}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Change the name
      fireEvent.change(screen.getByLabelText(/template name/i), {
        target: { value: "Updated Meeting Notes" },
      });

      // Save
      fireEvent.click(screen.getByText(/save changes/i));

      expect(mockOnSave).toHaveBeenCalledTimes(1);
      const savedTemplate = mockOnSave.mock.calls[0][0] as TitleTemplate;
      expect(savedTemplate.id).toBe("test-123");
      expect(savedTemplate.name).toBe("Updated Meeting Notes");
    });
  });

  describe("variable hints", () => {
    it("should display all supported variable hints", () => {
      renderWithApp(
        <TemplateEditor
          templateFolder={defaultTemplateFolder}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("{{date}}")).toBeInTheDocument();
      expect(screen.getByText("{{time}}")).toBeInTheDocument();
      expect(screen.getByText("{{datetime}}")).toBeInTheDocument();
      expect(screen.getByText("{{timestamp}}")).toBeInTheDocument();
      expect(screen.getByText("{{year}}")).toBeInTheDocument();
      expect(screen.getByText("{{month}}")).toBeInTheDocument();
      expect(screen.getByText("{{day}}")).toBeInTheDocument();
    });

    it("should insert variable when hint is clicked", () => {
      renderWithApp(
        <TemplateEditor
          templateFolder={defaultTemplateFolder}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Click on time variable hint
      fireEvent.click(screen.getByText("{{time}}"));

      // Should append to existing pattern
      expect(screen.getByLabelText(/title pattern/i)).toHaveValue("{{date}}-{{time}}");
    });
  });

  describe("title preview", () => {
    it("should show preview of generated title", () => {
      renderWithApp(
        <TemplateEditor
          templateFolder={defaultTemplateFolder}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Check that preview is shown
      const preview = screen.getByText(/preview:/i);
      expect(preview).toBeInTheDocument();
      // Preview should contain a date pattern like 2024-01-15- (default pattern is {{date}}-)
      expect(preview.textContent).toMatch(/Preview: \d{4}-\d{2}-\d{2}-\.md/);
    });
  });

  describe("folder selection", () => {
    it("should have folder select with searchable input", () => {
      renderWithApp(
        <TemplateEditor
          templateFolder={defaultTemplateFolder}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // SearchableSelect renders an input element labeled "Target Folder"
      const folderInput = screen.getByLabelText(/target folder/i);
      expect(folderInput).toBeInTheDocument();
      expect(folderInput.tagName.toLowerCase()).toBe("input");
    });
  });
});
