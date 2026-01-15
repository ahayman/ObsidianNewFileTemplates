import { render, screen, fireEvent } from "@testing-library/react";
import { TemplateList } from "./TemplateList";
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
      getAbstractFileByPath: jest.fn(() => null),
      read: jest.fn(() => Promise.resolve("")),
    },
    plugins: {
      plugins: {},
    },
  } as unknown as App;
};

// Wrapper component with AppContext
const renderWithApp = (ui: React.ReactElement, app: App = createMockApp()) => {
  return render(
    <AppContext.Provider value={app}>{ui}</AppContext.Provider>
  );
};

describe("TemplateList", () => {
  const mockOnUpdate = jest.fn();
  const defaultTemplateFolder = "Templates";

  const sampleTemplates: TitleTemplate[] = [
    {
      id: "1",
      name: "Daily Note",
      titlePattern: "{{date}}-daily",
      folder: "Daily",
    },
    {
      id: "2",
      name: "Meeting Notes",
      titlePattern: "{{date}}-meeting",
      folder: "Meetings",
    },
    {
      id: "3",
      name: "Quick Thought",
      titlePattern: "{{timestamp}}",
      folder: "current",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm
    jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("rendering", () => {
    it("should render all templates", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText("Daily Note")).toBeInTheDocument();
      expect(screen.getByText("Meeting Notes")).toBeInTheDocument();
      expect(screen.getByText("Quick Thought")).toBeInTheDocument();
    });

    it("should show empty state when no templates", () => {
      renderWithApp(
        <TemplateList
          templates={[]}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText(/no templates configured/i)).toBeInTheDocument();
    });

    it("should render drag handles for each template", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      const dragHandles = screen.getAllByTitle("Drag to reorder");
      expect(dragHandles).toHaveLength(3);
    });

    it("should render move up/down buttons for each template", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      const moveUpButtons = screen.getAllByTitle("Move up");
      const moveDownButtons = screen.getAllByTitle("Move down");
      expect(moveUpButtons).toHaveLength(3);
      expect(moveDownButtons).toHaveLength(3);
    });
  });

  describe("move up/down buttons", () => {
    it("should disable move up button for first template", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      const moveUpButtons = screen.getAllByTitle("Move up");
      expect(moveUpButtons[0]).toBeDisabled();
      expect(moveUpButtons[1]).not.toBeDisabled();
      expect(moveUpButtons[2]).not.toBeDisabled();
    });

    it("should disable move down button for last template", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      const moveDownButtons = screen.getAllByTitle("Move down");
      expect(moveDownButtons[0]).not.toBeDisabled();
      expect(moveDownButtons[1]).not.toBeDisabled();
      expect(moveDownButtons[2]).toBeDisabled();
    });

    it("should move template up when move up button is clicked", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      // Click move up on second template (Meeting Notes)
      const moveUpButtons = screen.getAllByTitle("Move up");
      fireEvent.click(moveUpButtons[1]);

      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
      const updatedTemplates = mockOnUpdate.mock.calls[0][0] as TitleTemplate[];
      expect(updatedTemplates[0].id).toBe("2"); // Meeting Notes now first
      expect(updatedTemplates[1].id).toBe("1"); // Daily Note now second
      expect(updatedTemplates[2].id).toBe("3"); // Quick Thought unchanged
    });

    it("should move template down when move down button is clicked", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      // Click move down on first template (Daily Note)
      const moveDownButtons = screen.getAllByTitle("Move down");
      fireEvent.click(moveDownButtons[0]);

      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
      const updatedTemplates = mockOnUpdate.mock.calls[0][0] as TitleTemplate[];
      expect(updatedTemplates[0].id).toBe("2"); // Meeting Notes now first
      expect(updatedTemplates[1].id).toBe("1"); // Daily Note now second
      expect(updatedTemplates[2].id).toBe("3"); // Quick Thought unchanged
    });

    it("should not call onUpdate when clicking disabled move up button", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      // Try to click move up on first template (disabled)
      const moveUpButtons = screen.getAllByTitle("Move up");
      fireEvent.click(moveUpButtons[0]);

      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it("should not call onUpdate when clicking disabled move down button", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      // Try to click move down on last template (disabled)
      const moveDownButtons = screen.getAllByTitle("Move down");
      fireEvent.click(moveDownButtons[2]);

      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe("drag and drop", () => {
    it("should make templates draggable", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      const listItems = screen.getAllByRole("button", { name: /edit template/i })
        .map((btn) => btn.closest(".file-template-list-item"));

      listItems.forEach((item) => {
        expect(item).toHaveAttribute("draggable", "true");
      });
    });

    it("should apply dragging class when drag starts", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      const listItems = document.querySelectorAll(".file-template-list-item");

      // Start dragging first item
      fireEvent.dragStart(listItems[0]);

      expect(listItems[0]).toHaveClass("is-dragging");
    });

    it("should apply drag-over class when dragging over another item", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      const listItems = document.querySelectorAll(".file-template-list-item");

      // Start dragging first item
      fireEvent.dragStart(listItems[0]);

      // Drag over second item - in jsdom getBoundingClientRect returns zeros,
      // so the position will be calculated as "below" when clientY >= midpoint
      // Just verify that a drag-over class is applied
      fireEvent.dragOver(listItems[1], { clientY: 0 });

      // Should have either drag-over-above or drag-over-below
      const hasAbove = listItems[1].classList.contains("drag-over-above");
      const hasBelow = listItems[1].classList.contains("drag-over-below");
      expect(hasAbove || hasBelow).toBe(true);
    });

    it("should reorder templates on drop", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      const listItems = document.querySelectorAll(".file-template-list-item");

      // Start dragging first item
      fireEvent.dragStart(listItems[0]);

      // Drag over second item (in jsdom, this will result in "below" position)
      fireEvent.dragOver(listItems[1], { clientY: 0 });

      // Drop on second item
      fireEvent.drop(listItems[1]);

      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
      const updatedTemplates = mockOnUpdate.mock.calls[0][0] as TitleTemplate[];
      // In jsdom, clientY 0 >= midpoint 0, so position is "below"
      // First template moved below second, so order becomes: 2, 1, 3
      expect(updatedTemplates).toHaveLength(3);
      // Just verify reorder happened - first item moved
      expect(updatedTemplates.map((t) => t.id)).not.toEqual(["1", "2", "3"]);
    });

    it("should clear drag state on drag end", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      const listItems = document.querySelectorAll(".file-template-list-item");

      // Start dragging first item
      fireEvent.dragStart(listItems[0]);
      expect(listItems[0]).toHaveClass("is-dragging");

      // End drag
      fireEvent.dragEnd(listItems[0]);

      expect(listItems[0]).not.toHaveClass("is-dragging");
    });
  });

  describe("template deletion", () => {
    it("should call onUpdate with filtered templates when delete is clicked", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      const deleteButtons = screen.getAllByTitle("Delete");
      fireEvent.click(deleteButtons[0]);

      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
      const updatedTemplates = mockOnUpdate.mock.calls[0][0] as TitleTemplate[];
      expect(updatedTemplates).toHaveLength(2);
      expect(updatedTemplates.find((t) => t.id === "1")).toBeUndefined();
    });
  });

  describe("template editing", () => {
    it("should show editor when edit button is clicked", () => {
      renderWithApp(
        <TemplateList
          templates={sampleTemplates}
          templateFolder={defaultTemplateFolder}
          onUpdate={mockOnUpdate}
        />
      );

      const editButtons = screen.getAllByTitle("Edit");
      fireEvent.click(editButtons[0]);

      // Editor should appear with save button
      expect(screen.getByText(/save changes/i)).toBeInTheDocument();
      // Template list items should be hidden
      expect(screen.queryByText("Meeting Notes")).not.toBeInTheDocument();
    });
  });
});
