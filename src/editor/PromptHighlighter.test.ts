/**
 * Unit tests for PromptHighlighter
 */

import {
  findCodeBlockRanges,
  isInsideCodeBlock,
  parsePromptContent,
  PromptParts,
} from "./PromptHighlighter";

describe("PromptHighlighter", () => {
  describe("findCodeBlockRanges", () => {
    describe("backtick fences", () => {
      it("should find a single code block", () => {
        const text = "before\n```\ncode\n```\nafter";
        const ranges = findCodeBlockRanges(text);

        expect(ranges.length).toBe(1);
        expect(ranges[0].from).toBe(7); // Start of ```
        expect(ranges[0].to).toBe(19); // End of closing ```
      });

      it("should find multiple code blocks", () => {
        const text = "```\nblock1\n```\ntext\n```\nblock2\n```";
        const ranges = findCodeBlockRanges(text);

        expect(ranges.length).toBe(2);
      });

      it("should handle code block at start of document", () => {
        const text = "```\ncode\n```\nafter";
        const ranges = findCodeBlockRanges(text);

        expect(ranges.length).toBe(1);
        expect(ranges[0].from).toBe(0);
      });

      it("should handle code block at end of document", () => {
        const text = "before\n```\ncode\n```";
        const ranges = findCodeBlockRanges(text);

        expect(ranges.length).toBe(1);
      });

      it("should handle unclosed code block at end", () => {
        const text = "before\n```\ncode without closing";
        const ranges = findCodeBlockRanges(text);

        expect(ranges.length).toBe(1);
        expect(ranges[0].to).toBe(text.length);
      });

      it("should handle code blocks with language specifier", () => {
        const text = "```typescript\nconst x = 1;\n```";
        const ranges = findCodeBlockRanges(text);

        expect(ranges.length).toBe(1);
      });
    });

    describe("tilde fences", () => {
      it("should find tilde-fenced code blocks", () => {
        const text = "~~~\ncode\n~~~";
        const ranges = findCodeBlockRanges(text);

        expect(ranges.length).toBe(1);
      });

      it("should not mix backtick and tilde fences", () => {
        const text = "```\ncode\n~~~"; // Mismatched - should treat as unclosed
        const ranges = findCodeBlockRanges(text);

        expect(ranges.length).toBe(1);
        expect(ranges[0].to).toBe(text.length); // Extends to end
      });
    });

    describe("edge cases", () => {
      it("should return empty array for text without code blocks", () => {
        const text = "Just regular text\nwith multiple lines";
        const ranges = findCodeBlockRanges(text);

        expect(ranges.length).toBe(0);
      });

      it("should return empty array for empty text", () => {
        const ranges = findCodeBlockRanges("");

        expect(ranges.length).toBe(0);
      });

      it("should handle inline backticks (not code blocks)", () => {
        const text = "Some `inline code` here";
        const ranges = findCodeBlockRanges(text);

        expect(ranges.length).toBe(0);
      });

      it("should detect indented fences (simple parser)", () => {
        const text = "  ```\ncode\n```"; // Indented fence
        const ranges = findCodeBlockRanges(text);

        // Simple parser detects fences regardless of indentation
        // In a real Markdown parser, indented fences would be different
        expect(ranges.length).toBe(1);
      });

      it("should handle 4+ backticks", () => {
        const text = "````\ncode\n````";
        const ranges = findCodeBlockRanges(text);

        expect(ranges.length).toBe(1);
      });
    });
  });

  describe("isInsideCodeBlock", () => {
    it("should return true for position inside code block", () => {
      const ranges = [{ from: 10, to: 30 }];

      expect(isInsideCodeBlock(15, ranges)).toBe(true);
      expect(isInsideCodeBlock(10, ranges)).toBe(true); // At start
      expect(isInsideCodeBlock(30, ranges)).toBe(true); // At end
    });

    it("should return false for position outside code block", () => {
      const ranges = [{ from: 10, to: 30 }];

      expect(isInsideCodeBlock(5, ranges)).toBe(false);
      expect(isInsideCodeBlock(35, ranges)).toBe(false);
    });

    it("should check multiple ranges", () => {
      const ranges = [
        { from: 10, to: 20 },
        { from: 40, to: 50 },
      ];

      expect(isInsideCodeBlock(15, ranges)).toBe(true);
      expect(isInsideCodeBlock(45, ranges)).toBe(true);
      expect(isInsideCodeBlock(30, ranges)).toBe(false);
    });

    it("should return false for empty ranges", () => {
      expect(isInsideCodeBlock(10, [])).toBe(false);
    });
  });

  describe("parsePromptContent", () => {
    describe("name only", () => {
      it("should parse simple name", () => {
        const parts = parsePromptContent("Name", 0);

        expect(parts.name).toEqual({ start: 0, end: 4 });
        expect(parts.type).toBeUndefined();
        expect(parts.format).toBeUndefined();
        expect(parts.colons.length).toBe(0);
      });

      it("should handle name with spaces", () => {
        const parts = parsePromptContent(" Name ", 0);

        expect(parts.name).toEqual({ start: 1, end: 5 }); // Trimmed
      });

      it("should handle multi-word name", () => {
        const parts = parsePromptContent("My Prompt Name", 0);

        expect(parts.name).toEqual({ start: 0, end: 14 });
      });
    });

    describe("name:type", () => {
      it("should parse name and type", () => {
        const parts = parsePromptContent("Name:text", 0);

        expect(parts.name).toEqual({ start: 0, end: 4 });
        expect(parts.type).toEqual({ start: 5, end: 9 });
        expect(parts.colons.length).toBe(1);
        expect(parts.colons[0].pos).toBe(4);
      });

      it("should parse date type", () => {
        const parts = parsePromptContent("Date:date", 0);

        expect(parts.name).toEqual({ start: 0, end: 4 });
        expect(parts.type).toEqual({ start: 5, end: 9 });
      });

      it("should handle contentStart offset", () => {
        const parts = parsePromptContent("Name:text", 10);

        expect(parts.name).toEqual({ start: 10, end: 14 });
        expect(parts.type).toEqual({ start: 15, end: 19 });
        expect(parts.colons[0].pos).toBe(14);
      });
    });

    describe("name:type:format", () => {
      it("should parse name, type, and format", () => {
        const parts = parsePromptContent("Date:date:ISO", 0);

        expect(parts.name).toEqual({ start: 0, end: 4 });
        expect(parts.type).toEqual({ start: 5, end: 9 });
        expect(parts.format).toEqual({ start: 10, end: 13 });
        expect(parts.colons.length).toBe(2);
      });

      it("should handle datetime with format", () => {
        const parts = parsePromptContent("When:datetime:ISO,24-hour", 0);

        expect(parts.name).toEqual({ start: 0, end: 4 });
        expect(parts.type).toEqual({ start: 5, end: 13 });
        expect(parts.format).toEqual({ start: 14, end: 25 });
      });
    });

    describe("custom format syntax", () => {
      it("should parse custom format with format()", () => {
        const parts = parsePromptContent("Date:date:format(MMM DD)", 0);

        expect(parts.name).toEqual({ start: 0, end: 4 });
        expect(parts.type).toEqual({ start: 5, end: 9 });
        expect(parts.format).toEqual({ start: 10, end: 24 });
      });

      it("should parse custom format with complex pattern", () => {
        const parts = parsePromptContent("Time:time:format(H:mm:ss)", 0);

        expect(parts.name).toEqual({ start: 0, end: 4 });
        expect(parts.type).toEqual({ start: 5, end: 9 });
        expect(parts.format).toEqual({ start: 10, end: 25 });
      });

      it("should include format wrapper positions for format()", () => {
        const parts = parsePromptContent("Date:date:format(YYYY-MM-DD)", 0);

        expect(parts.formatWrapper).toBeDefined();
        expect(parts.formatWrapper?.funcStart).toBe(10); // start of "format("
        expect(parts.formatWrapper?.funcEnd).toBe(17);   // after "format("
        expect(parts.formatWrapper?.parenClose).toBe(27); // ")"
      });

      it("should include parsed format tokens", () => {
        const parts = parsePromptContent("Date:date:format(YYYY-MM-DD)", 0);

        expect(parts.formatTokens).toBeDefined();
        expect(parts.formatTokens?.length).toBe(5); // YYYY, -, MM, -, DD

        // Check first token is YYYY
        expect(parts.formatTokens?.[0]).toMatchObject({
          isToken: true,
        });

        // Check second part is literal "-"
        expect(parts.formatTokens?.[1]).toMatchObject({
          isToken: false,
        });
      });

      it("should have correct positions for format tokens", () => {
        const parts = parsePromptContent("D:date:format(MMM DD, YYYY)", 0);

        // Format tokens start after "format(" which is at position 7 (after "D:date:")
        // "format(" is 7 chars, so tokens start at position 14
        const tokens = parts.formatTokens;
        expect(tokens).toBeDefined();

        // MMM should be a token
        const mmm = tokens?.find(t => t.isToken && t.end - t.start === 3);
        expect(mmm).toBeDefined();

        // YYYY should be a token
        const yyyy = tokens?.find(t => t.isToken && t.end - t.start === 4);
        expect(yyyy).toBeDefined();

        // Literals (space, comma-space) should exist
        const literals = tokens?.filter(t => !t.isToken);
        expect(literals?.length).toBeGreaterThan(0);
      });
    });

    describe("edge cases", () => {
      it("should handle leading/trailing whitespace", () => {
        const parts = parsePromptContent("  Name:text  ", 0);

        expect(parts.name).toEqual({ start: 2, end: 6 });
        expect(parts.type).toEqual({ start: 7, end: 11 });
      });

      it("should handle empty content", () => {
        const parts = parsePromptContent("", 0);

        expect(parts.name).toEqual({ start: 0, end: 0 });
      });

      it("should handle content with only whitespace", () => {
        const parts = parsePromptContent("   ", 0);

        expect(parts.name.start).toBe(parts.name.end); // Empty range
      });
    });

    describe("list/multilist syntax", () => {
      it("should parse list with options", () => {
        const parts = parsePromptContent("Priority:list:High,Medium,Low", 0);

        expect(parts.name).toEqual({ start: 0, end: 8 });
        expect(parts.type).toEqual({ start: 9, end: 13 });
        expect(parts.format).toEqual({ start: 14, end: 29 });
        expect(parts.colons.length).toBe(2);
      });

      it("should parse multilist with options", () => {
        const parts = parsePromptContent("Tags:multilist:Work,Personal,Urgent", 0);

        expect(parts.name).toEqual({ start: 0, end: 4 });
        expect(parts.type).toEqual({ start: 5, end: 14 });
        expect(parts.format).toEqual({ start: 15, end: 35 });
      });

      it("should include listOptions positions for list type", () => {
        const parts = parsePromptContent("Status:list:Open,Closed,Pending", 0);

        expect(parts.listOptions).toBeDefined();
        expect(parts.listOptions?.length).toBe(3);

        // First option: "Open" at position 12-16
        expect(parts.listOptions?.[0]).toEqual({ start: 12, end: 16 });
        // Second option: "Closed" at position 17-23
        expect(parts.listOptions?.[1]).toEqual({ start: 17, end: 23 });
        // Third option: "Pending" at position 24-31
        expect(parts.listOptions?.[2]).toEqual({ start: 24, end: 31 });
      });

      it("should include listCommas positions for list type", () => {
        const parts = parsePromptContent("Status:list:Open,Closed,Pending", 0);

        expect(parts.listCommas).toBeDefined();
        expect(parts.listCommas?.length).toBe(2);

        // First comma after "Open" at position 16
        expect(parts.listCommas?.[0]).toEqual({ pos: 16 });
        // Second comma after "Closed" at position 23
        expect(parts.listCommas?.[1]).toEqual({ pos: 23 });
      });

      it("should include listOptions positions for multilist type", () => {
        const parts = parsePromptContent("Colors:multilist:Red,Blue,Green", 0);

        expect(parts.listOptions).toBeDefined();
        expect(parts.listOptions?.length).toBe(3);

        // Options start after "Colors:multilist:" (17 chars)
        expect(parts.listOptions?.[0]).toEqual({ start: 17, end: 20 }); // Red
        expect(parts.listOptions?.[1]).toEqual({ start: 21, end: 25 }); // Blue
        expect(parts.listOptions?.[2]).toEqual({ start: 26, end: 31 }); // Green
      });

      it("should handle list with two options", () => {
        const parts = parsePromptContent("YesNo:list:Yes,No", 0);

        expect(parts.listOptions?.length).toBe(2);
        expect(parts.listCommas?.length).toBe(1);
      });

      it("should handle list with single option", () => {
        const parts = parsePromptContent("Single:list:OnlyOption", 0);

        expect(parts.listOptions?.length).toBe(1);
        expect(parts.listOptions?.[0]).toEqual({ start: 12, end: 22 });
        expect(parts.listCommas?.length).toBe(0);
      });

      it("should handle contentStart offset for list", () => {
        const parts = parsePromptContent("Type:list:A,B,C", 10);

        expect(parts.name).toEqual({ start: 10, end: 14 });
        expect(parts.type).toEqual({ start: 15, end: 19 });

        // List options with offset
        expect(parts.listOptions?.[0]).toEqual({ start: 20, end: 21 }); // A
        expect(parts.listOptions?.[1]).toEqual({ start: 22, end: 23 }); // B
        expect(parts.listOptions?.[2]).toEqual({ start: 24, end: 25 }); // C

        // Commas with offset
        expect(parts.listCommas?.[0]).toEqual({ pos: 21 });
        expect(parts.listCommas?.[1]).toEqual({ pos: 23 });
      });

      it("should not include listOptions for non-list types", () => {
        const parts = parsePromptContent("Name:text", 0);

        expect(parts.listOptions).toBeUndefined();
        expect(parts.listCommas).toBeUndefined();
      });

      it("should not include listOptions for date type with format", () => {
        const parts = parsePromptContent("Date:date:ISO", 0);

        expect(parts.listOptions).toBeUndefined();
        expect(parts.listCommas).toBeUndefined();
      });

      it("should handle list type case-insensitively", () => {
        const parts = parsePromptContent("Field:LIST:A,B", 0);

        expect(parts.listOptions).toBeDefined();
        expect(parts.listOptions?.length).toBe(2);
      });

      it("should handle multilist type case-insensitively", () => {
        const parts = parsePromptContent("Field:MULTILIST:A,B", 0);

        expect(parts.listOptions).toBeDefined();
        expect(parts.listOptions?.length).toBe(2);
      });
    });
  });

  describe("integration: prompt pattern matching", () => {
    const PROMPT_PATTERN = /\{%(\??)([^%]+?)(\??)\s*%\}/g;

    it("should match simple prompt", () => {
      const text = "{% Name %}";
      const match = PROMPT_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![0]).toBe("{% Name %}");
      expect(match![1]).toBe(""); // No optional marker
      expect(match![2]).toBe(" Name"); // Trailing space consumed by \s* in pattern
    });

    it("should match optional prompt with opening marker", () => {
      const text = "{%? Name %}";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![1]).toBe("?");
    });

    it("should match optional prompt with closing marker", () => {
      const text = "{% Name ?%}";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![3]).toBe("?");
    });

    it("should match prompt with type", () => {
      const text = "{% Name:date %}";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![2]).toBe(" Name:date"); // Trailing space consumed by \s* in pattern
    });

    it("should match prompt with type and format", () => {
      const text = "{% Name:date:ISO %}";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![2]).toBe(" Name:date:ISO"); // Trailing space consumed by \s* in pattern
    });

    it("should match multiple prompts in text", () => {
      const text = "{% First %} and {% Second %}";
      const matches: string[] = [];
      let match;
      PROMPT_PATTERN.lastIndex = 0;

      while ((match = PROMPT_PATTERN.exec(text)) !== null) {
        matches.push(match[0]);
      }

      expect(matches.length).toBe(2);
      expect(matches[0]).toBe("{% First %}");
      expect(matches[1]).toBe("{% Second %}");
    });

    it("should not match incomplete prompts", () => {
      const text = "{% Incomplete";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).toBeNull();
    });

    it("should not match {{variable}} syntax", () => {
      const text = "{{variable}}";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).toBeNull();
    });

    it("should match list prompt", () => {
      const text = "{% Priority:list:High,Medium,Low %}";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![2]).toBe(" Priority:list:High,Medium,Low");
    });

    it("should match multilist prompt", () => {
      const text = "{% Tags:multilist:Work,Personal,Urgent %}";
      PROMPT_PATTERN.lastIndex = 0;
      const match = PROMPT_PATTERN.exec(text);

      expect(match).not.toBeNull();
      expect(match![2]).toBe(" Tags:multilist:Work,Personal,Urgent");
    });
  });
});
