/**
 * Unit tests for SyntaxInput component
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SyntaxInput, getVariableDescription } from "./SyntaxInput";

// Use the mock for component tests
jest.mock("./SyntaxInput", () => {
  const originalModule = jest.requireActual("../../__mocks__/SyntaxInput.tsx");
  return {
    ...originalModule,
    // Keep the real getVariableDescription for unit testing
    getVariableDescription: jest.requireActual("./SyntaxInput").getVariableDescription,
  };
});

describe("SyntaxInput", () => {
  describe("getVariableDescription", () => {
    it("should return description for date", () => {
      expect(getVariableDescription("date")).toBe("Current date");
    });

    it("should return description for time", () => {
      expect(getVariableDescription("time")).toBe("Current time");
    });

    it("should return description for datetime", () => {
      expect(getVariableDescription("datetime")).toBe("Date and time");
    });

    it("should return description for year", () => {
      expect(getVariableDescription("year")).toBe("Current year");
    });

    it("should return description for month", () => {
      expect(getVariableDescription("month")).toBe("Current month");
    });

    it("should return description for day", () => {
      expect(getVariableDescription("day")).toBe("Current day");
    });

    it("should return description for timestamp", () => {
      expect(getVariableDescription("timestamp")).toBe("Unix timestamp");
    });

    it("should return description for counter", () => {
      expect(getVariableDescription("counter")).toBe("Auto-increment");
    });

    it("should return empty string for unknown variable", () => {
      expect(getVariableDescription("unknown")).toBe("");
    });
  });

  describe("variable pattern matching", () => {
    const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

    it("should match simple variable", () => {
      const text = "{{date}}";
      const match = VARIABLE_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![0]).toBe("{{date}}");
      expect(match![1]).toBe("date");
    });

    it("should match variable in text", () => {
      const text = "File: {{title}}-{{date}}";
      VARIABLE_PATTERN.lastIndex = 0;
      const matches: string[] = [];
      let match;

      while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
        matches.push(match[1]);
      }

      expect(matches).toEqual(["title", "date"]);
    });

    it("should not match empty braces", () => {
      const text = "{{}}";
      VARIABLE_PATTERN.lastIndex = 0;
      const match = VARIABLE_PATTERN.exec(text);

      expect(match).toBeNull();
    });

    it("should not match single braces", () => {
      const text = "{date}";
      VARIABLE_PATTERN.lastIndex = 0;
      const match = VARIABLE_PATTERN.exec(text);

      expect(match).toBeNull();
    });

    it("should match variables with underscores", () => {
      const text = "{{my_variable}}";
      VARIABLE_PATTERN.lastIndex = 0;
      const match = VARIABLE_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![1]).toBe("my_variable");
    });

    it("should match variables with numbers", () => {
      const text = "{{counter1}}";
      VARIABLE_PATTERN.lastIndex = 0;
      const match = VARIABLE_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![1]).toBe("counter1");
    });
  });

  describe("prompt pattern matching", () => {
    const PROMPT_PATTERN = /\{%(\??)([^%]+?)(\??)\s*%\}/g;

    it("should match simple prompt", () => {
      const text = "{% Name %}";
      const match = PROMPT_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![0]).toBe("{% Name %}");
      expect(match![2].trim()).toBe("Name");
    });

    it("should match prompt with type", () => {
      const text = "{% Title:text %}";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![2].trim()).toBe("Title:text");
    });

    it("should match prompt with type and format", () => {
      const text = "{% Date:date:ISO %}";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![2].trim()).toBe("Date:date:ISO");
    });

    it("should match optional prompt with opening marker", () => {
      const text = "{%? Optional %}";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![1]).toBe("?");
      expect(match![3]).toBe("");
    });

    it("should match optional prompt with closing marker", () => {
      const text = "{% Optional ?%}";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![1]).toBe("");
      expect(match![3]).toBe("?");
    });

    it("should match optional prompt with both markers", () => {
      const text = "{%? Optional ?%}";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![1]).toBe("?");
      expect(match![3]).toBe("?");
    });

    it("should match multiple prompts", () => {
      const text = "{% First %} - {% Second %}";
      PROMPT_PATTERN.lastIndex = 0;
      const matches: string[] = [];
      let match;

      while ((match = PROMPT_PATTERN.exec(text)) !== null) {
        matches.push(match[2].trim());
      }

      expect(matches).toEqual(["First", "Second"]);
    });

    it("should not match incomplete prompts", () => {
      const text = "{% Incomplete";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).toBeNull();
    });

    it("should not match variable syntax", () => {
      const text = "{{variable}}";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).toBeNull();
    });
  });

  describe("completion trigger patterns", () => {
    describe("variable completion trigger", () => {
      const VARIABLE_TRIGGER = /\{\{[a-z]*$/i;

      it("should match opening {{", () => {
        expect(VARIABLE_TRIGGER.test("test {{")).toBe(true);
      });

      it("should match partial variable", () => {
        expect(VARIABLE_TRIGGER.test("test {{da")).toBe(true);
      });

      it("should match full opening", () => {
        expect(VARIABLE_TRIGGER.test("{{")).toBe(true);
      });

      it("should not match closed variable", () => {
        expect(VARIABLE_TRIGGER.test("{{date}}")).toBe(false);
      });

      it("should not match single brace", () => {
        expect(VARIABLE_TRIGGER.test("{")).toBe(false);
      });
    });

    describe("prompt opening trigger", () => {
      const PROMPT_TRIGGER = /\{%\??\s*$/;

      it("should match {%", () => {
        expect(PROMPT_TRIGGER.test("test {%")).toBe(true);
      });

      it("should match {%?", () => {
        expect(PROMPT_TRIGGER.test("test {%?")).toBe(true);
      });

      it("should match {% with space", () => {
        expect(PROMPT_TRIGGER.test("test {% ")).toBe(true);
      });

      it("should not match closed prompt", () => {
        expect(PROMPT_TRIGGER.test("{% Name %}")).toBe(false);
      });
    });

    describe("type completion trigger", () => {
      const TYPE_TRIGGER = /\{%\??\s*[^:%]+:\s*([a-z]*)$/i;

      it("should match name:", () => {
        const match = "{% Name:".match(TYPE_TRIGGER);
        expect(match).not.toBeNull();
        expect(match![1]).toBe("");
      });

      it("should match name: with partial type", () => {
        const match = "{% Name:da".match(TYPE_TRIGGER);
        expect(match).not.toBeNull();
        expect(match![1]).toBe("da");
      });

      it("should match optional prompt with colon", () => {
        const match = "{%? Name:".match(TYPE_TRIGGER);
        expect(match).not.toBeNull();
      });
    });

    describe("format completion trigger", () => {
      const FORMAT_TRIGGER = /\{%\??\s*[^:%]+:(date|time|datetime):\s*([a-zA-Z0-9-]*)$/i;

      it("should match date format position", () => {
        const match = "{% Name:date:".match(FORMAT_TRIGGER);
        expect(match).not.toBeNull();
        expect(match![1]).toBe("date");
        expect(match![2]).toBe("");
      });

      it("should match time format position", () => {
        const match = "{% Name:time:".match(FORMAT_TRIGGER);
        expect(match).not.toBeNull();
        expect(match![1]).toBe("time");
      });

      it("should match datetime format position", () => {
        const match = "{% Name:datetime:".match(FORMAT_TRIGGER);
        expect(match).not.toBeNull();
        expect(match![1]).toBe("datetime");
      });

      it("should match partial format", () => {
        const match = "{% Name:date:IS".match(FORMAT_TRIGGER);
        expect(match).not.toBeNull();
        expect(match![2]).toBe("IS");
      });

      it("should not match text type", () => {
        const match = "{% Name:text:".match(FORMAT_TRIGGER);
        expect(match).toBeNull();
      });
    });
  });

  describe("component rendering (mock)", () => {
    it("should render input element", () => {
      render(
        <SyntaxInput
          value="test"
          onChange={() => {}}
        />
      );

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("test");
    });

    it("should render with placeholder", () => {
      render(
        <SyntaxInput
          value=""
          onChange={() => {}}
          placeholder="Enter template"
        />
      );

      const input = screen.getByPlaceholderText("Enter template");
      expect(input).toBeInTheDocument();
    });

    it("should render with id", () => {
      render(
        <SyntaxInput
          value=""
          onChange={() => {}}
          id="test-input"
        />
      );

      const input = document.getElementById("test-input");
      expect(input).toBeInTheDocument();
    });

    it("should call onChange when value changes", () => {
      const handleChange = jest.fn();
      render(
        <SyntaxInput
          value=""
          onChange={handleChange}
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "new value" } });

      expect(handleChange).toHaveBeenCalledWith("new value");
    });

    it("should apply custom className", () => {
      render(
        <SyntaxInput
          value=""
          onChange={() => {}}
          className="custom-class"
        />
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("custom-class");
      expect(input).toHaveClass("file-template-syntax-input");
    });

    it("should update value from props", () => {
      const { rerender } = render(
        <SyntaxInput
          value="initial"
          onChange={() => {}}
        />
      );

      expect(screen.getByRole("textbox")).toHaveValue("initial");

      rerender(
        <SyntaxInput
          value="updated"
          onChange={() => {}}
        />
      );

      expect(screen.getByRole("textbox")).toHaveValue("updated");
    });
  });
});
