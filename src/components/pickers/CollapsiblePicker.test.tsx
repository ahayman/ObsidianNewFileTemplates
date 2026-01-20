/**
 * Unit tests for CollapsiblePicker component
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CollapsiblePicker } from "./CollapsiblePicker";

// Mock timers for testing blur timeouts
jest.useFakeTimers();

describe("CollapsiblePicker", () => {
  const defaultProps = {
    label: "Date",
    previewText: "Select a date",
    children: <button data-testid="picker-content">Picker Content</button>,
  };

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe("rendering", () => {
    it("should render with label and preview text", () => {
      render(<CollapsiblePicker {...defaultProps} />);

      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Select a date")).toBeInTheDocument();
    });

    it("should render collapsed by default", () => {
      render(<CollapsiblePicker {...defaultProps} />);

      const container = screen.getByText("Date").closest(".collapsible-picker");
      expect(container).toHaveClass("collapsed");
      expect(container).not.toHaveClass("expanded");
    });

    it("should render expanded when defaultExpanded is true", () => {
      render(<CollapsiblePicker {...defaultProps} defaultExpanded={true} />);

      const container = screen.getByText("Date").closest(".collapsible-picker");
      expect(container).toHaveClass("expanded");
    });

    it("should render children", () => {
      render(<CollapsiblePicker {...defaultProps} />);

      expect(screen.getByTestId("picker-content")).toBeInTheDocument();
    });

    it("should render header button with correct aria attributes", () => {
      render(<CollapsiblePicker {...defaultProps} />);

      const headerButton = screen.getByRole("button", { name: /Date: Select a date/i });
      expect(headerButton).toBeInTheDocument();
      expect(headerButton).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("focus behavior", () => {
    it("should expand when focused", () => {
      render(<CollapsiblePicker {...defaultProps} />);

      const container = screen.getByText("Date").closest(".collapsible-picker")!;
      const content = screen.getByTestId("picker-content");

      // Focus an element inside the picker
      act(() => {
        fireEvent.focus(content);
      });

      expect(container).toHaveClass("expanded");
    });

    it("should collapse when focus moves outside", () => {
      render(
        <div>
          <CollapsiblePicker {...defaultProps} />
          <button data-testid="outside-button">Outside</button>
        </div>
      );

      const container = screen.getByText("Date").closest(".collapsible-picker")!;
      const content = screen.getByTestId("picker-content");
      const outsideButton = screen.getByTestId("outside-button");

      // Focus inside to expand
      act(() => {
        fireEvent.focus(content);
      });
      expect(container).toHaveClass("expanded");

      // Focus outside
      act(() => {
        fireEvent.blur(content);
        outsideButton.focus();
      });

      // Advance timers to trigger blur timeout
      act(() => {
        jest.advanceTimersByTime(20);
      });

      expect(container).toHaveClass("collapsed");
    });

    it("should not collapse when focus moves between children", () => {
      render(
        <CollapsiblePicker {...defaultProps}>
          <button data-testid="child-1">Child 1</button>
          <button data-testid="child-2">Child 2</button>
        </CollapsiblePicker>
      );

      const container = screen.getByText("Date").closest(".collapsible-picker")!;
      const child1 = screen.getByTestId("child-1");
      const child2 = screen.getByTestId("child-2");

      // Focus first child to expand
      act(() => {
        fireEvent.focus(child1);
      });
      expect(container).toHaveClass("expanded");

      // Move focus to second child
      act(() => {
        fireEvent.blur(child1);
        child2.focus();
      });

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(20);
      });

      // Should still be expanded
      expect(container).toHaveClass("expanded");
    });
  });

  describe("manual toggle", () => {
    it("should toggle expanded state when chevron toggle is clicked", () => {
      render(<CollapsiblePicker {...defaultProps} />);

      const container = screen.getByText("Date").closest(".collapsible-picker")!;
      const toggleChevron = container.querySelector(".collapsible-picker-toggle")!;

      // Click to expand
      fireEvent.click(toggleChevron);
      expect(container).toHaveClass("expanded");

      // Click to collapse
      fireEvent.click(toggleChevron);
      expect(container).toHaveClass("collapsed");
    });

    it("should update aria-expanded on toggle", () => {
      render(<CollapsiblePicker {...defaultProps} />);

      const headerButton = screen.getByRole("button", { name: /Date: Select a date/i });

      expect(headerButton).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(headerButton);
      expect(headerButton).toHaveAttribute("aria-expanded", "true");
    });

    it("should disable auto-collapse after manual toggle", () => {
      render(
        <div>
          <CollapsiblePicker {...defaultProps} />
          <button data-testid="outside-button">Outside</button>
        </div>
      );

      const container = screen.getByText("Date").closest(".collapsible-picker")!;
      const headerButton = screen.getByRole("button", { name: /Date: Select a date/i });
      const content = screen.getByTestId("picker-content");
      const outsideButton = screen.getByTestId("outside-button");

      // Manually expand by clicking the chevron toggle
      const toggleChevron = container.querySelector(".collapsible-picker-toggle")!;
      fireEvent.click(toggleChevron);
      expect(container).toHaveClass("expanded");

      // Focus inside then outside
      act(() => {
        fireEvent.focus(content);
        fireEvent.blur(content);
        outsideButton.focus();
      });

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(20);
      });

      // Should still be expanded because manual control is active
      expect(container).toHaveClass("expanded");
    });

    it("should toggle on Enter key", () => {
      render(<CollapsiblePicker {...defaultProps} />);

      const container = screen.getByText("Date").closest(".collapsible-picker")!;
      const headerButton = screen.getByRole("button", { name: /Date: Select a date/i });

      fireEvent.keyDown(headerButton, { key: "Enter" });
      expect(container).toHaveClass("expanded");
    });

    it("should toggle on Space key", () => {
      render(<CollapsiblePicker {...defaultProps} />);

      const container = screen.getByText("Date").closest(".collapsible-picker")!;
      const headerButton = screen.getByRole("button", { name: /Date: Select a date/i });

      fireEvent.keyDown(headerButton, { key: " " });
      expect(container).toHaveClass("expanded");
    });
  });

  describe("click from another field fix (justFocusedRef pattern)", () => {
    it("should expand and stay open when clicking header from another field", () => {
      render(
        <div>
          <input data-testid="other-field" />
          <CollapsiblePicker {...defaultProps} />
        </div>
      );

      const container = screen.getByText("Date").closest(".collapsible-picker")!;
      const header = screen.getByText("Date").closest(".collapsible-picker-header")!;
      const otherField = screen.getByTestId("other-field");

      // Focus the other field first
      act(() => {
        otherField.focus();
      });
      expect(container).toHaveClass("collapsed");

      // Click on the picker header (simulates clicking from another field)
      // This triggers focus first, then click
      act(() => {
        fireEvent.focus(container);
      });

      // Now click happens - justFocusedRef should prevent toggle
      fireEvent.click(header);

      // Should be expanded and stay expanded
      expect(container).toHaveClass("expanded");
    });

    it("should expand on header click when collapsed", () => {
      render(<CollapsiblePicker {...defaultProps} />);

      const container = screen.getByText("Date").closest(".collapsible-picker")!;
      const header = screen.getByText("Date").closest(".collapsible-picker-header")!;

      expect(container).toHaveClass("collapsed");

      // Click header to expand
      fireEvent.click(header);

      expect(container).toHaveClass("expanded");
    });

    it("should not close on header click when already expanded via focus", () => {
      render(<CollapsiblePicker {...defaultProps} />);

      const container = screen.getByText("Date").closest(".collapsible-picker")!;
      const header = screen.getByText("Date").closest(".collapsible-picker-header")!;
      const content = screen.getByTestId("picker-content");

      // Focus to expand (sets justFocusedRef)
      act(() => {
        fireEvent.focus(content);
      });
      expect(container).toHaveClass("expanded");

      // Click header - should not close because justFocusedRef is true
      fireEvent.click(header);

      // Should still be expanded
      expect(container).toHaveClass("expanded");
    });

    it("should collapse when focus moves outside", () => {
      render(
        <div>
          <input data-testid="other-field" />
          <CollapsiblePicker {...defaultProps} />
        </div>
      );

      const container = screen.getByText("Date").closest(".collapsible-picker")!;
      const content = screen.getByTestId("picker-content");
      const otherField = screen.getByTestId("other-field");

      // Expand the picker
      act(() => {
        fireEvent.focus(content);
      });
      expect(container).toHaveClass("expanded");

      // Now focus moves outside
      act(() => {
        fireEvent.blur(content);
        otherField.focus();
      });

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(20);
      });

      // Should collapse
      expect(container).toHaveClass("collapsed");
    });
  });

  describe("blur timeout cancellation", () => {
    it("should cancel pending blur timeout on new focus", () => {
      render(
        <div>
          <CollapsiblePicker {...defaultProps}>
            <button data-testid="child-1">Child 1</button>
            <button data-testid="child-2">Child 2</button>
          </CollapsiblePicker>
        </div>
      );

      const container = screen.getByText("Date").closest(".collapsible-picker")!;
      const child1 = screen.getByTestId("child-1");
      const child2 = screen.getByTestId("child-2");

      // Focus first child
      act(() => {
        fireEvent.focus(child1);
      });
      expect(container).toHaveClass("expanded");

      // Blur first child (starts blur timeout)
      act(() => {
        fireEvent.blur(child1);
      });

      // Quickly focus second child (should cancel blur timeout)
      act(() => {
        fireEvent.focus(child2);
      });

      // Advance timers past blur timeout
      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Should still be expanded
      expect(container).toHaveClass("expanded");
    });
  });
});
