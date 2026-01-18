# Implementation Plan: Moment.js Format Highlighting & Autocomplete

**Date:** 2026-01-18
**Feature:** Syntax highlighting and autocomplete for custom moment.js formats inside `format(...)`
**Status:** Completed

---

## Overview

Add syntax highlighting and autocomplete for moment.js format tokens when users type inside `format(...)` syntax. This helps users understand and construct date/time formats without needing to reference external documentation.

**Example:** `{% Date:date:format(MMMM DD, YYYY) %}` would highlight:
- `MMMM` (month name)
- `DD` (day)
- `YYYY` (year)
- Literal text (`, `) shown differently

---

## Scope

| Location | Highlighting | Autocomplete |
|----------|--------------|--------------|
| Main Editor | Yes | Yes |
| Settings Title Pattern | Yes | Yes |

---

## Phase 1: Define Moment.js Token Data

**Goal:** Create a comprehensive token reference that can be used for both highlighting and autocomplete.

### 1.1 Create Token Definitions

- [x] Create new file `src/utils/momentTokens.ts`
- [x] Define token categories and their patterns:

```typescript
interface MomentToken {
  token: string;
  description: string;
  example: string;
  category: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'ampm' | 'timezone' | 'other';
}

const MOMENT_TOKENS: MomentToken[] = [
  // Year
  { token: 'YYYY', description: '4-digit year', example: '2024', category: 'year' },
  { token: 'YY', description: '2-digit year', example: '24', category: 'year' },

  // Month
  { token: 'MMMM', description: 'Full month name', example: 'January', category: 'month' },
  { token: 'MMM', description: 'Abbreviated month', example: 'Jan', category: 'month' },
  { token: 'MM', description: 'Month (zero-padded)', example: '01', category: 'month' },
  { token: 'M', description: 'Month', example: '1', category: 'month' },

  // Day of Month
  { token: 'DD', description: 'Day (zero-padded)', example: '05', category: 'day' },
  { token: 'D', description: 'Day', example: '5', category: 'day' },
  { token: 'Do', description: 'Day with ordinal', example: '5th', category: 'day' },

  // Day of Week
  { token: 'dddd', description: 'Full weekday name', example: 'Monday', category: 'day' },
  { token: 'ddd', description: 'Abbreviated weekday', example: 'Mon', category: 'day' },
  { token: 'dd', description: 'Min weekday name', example: 'Mo', category: 'day' },
  { token: 'd', description: 'Day of week (0-6)', example: '1', category: 'day' },

  // Hour
  { token: 'HH', description: 'Hour 24h (zero-padded)', example: '14', category: 'hour' },
  { token: 'H', description: 'Hour 24h', example: '14', category: 'hour' },
  { token: 'hh', description: 'Hour 12h (zero-padded)', example: '02', category: 'hour' },
  { token: 'h', description: 'Hour 12h', example: '2', category: 'hour' },

  // Minute
  { token: 'mm', description: 'Minutes (zero-padded)', example: '05', category: 'minute' },
  { token: 'm', description: 'Minutes', example: '5', category: 'minute' },

  // Second
  { token: 'ss', description: 'Seconds (zero-padded)', example: '09', category: 'second' },
  { token: 's', description: 'Seconds', example: '9', category: 'second' },

  // AM/PM
  { token: 'A', description: 'AM/PM uppercase', example: 'PM', category: 'ampm' },
  { token: 'a', description: 'am/pm lowercase', example: 'pm', category: 'ampm' },

  // Other useful tokens
  { token: 'DDD', description: 'Day of year', example: '45', category: 'other' },
  { token: 'DDDD', description: 'Day of year (padded)', example: '045', category: 'other' },
  { token: 'w', description: 'Week of year', example: '7', category: 'other' },
  { token: 'ww', description: 'Week of year (padded)', example: '07', category: 'other' },
  { token: 'Q', description: 'Quarter', example: '1', category: 'other' },
  { token: 'X', description: 'Unix timestamp (seconds)', example: '1710513045', category: 'other' },
  { token: 'x', description: 'Unix timestamp (ms)', example: '1710513045000', category: 'other' },
  { token: 'ZZ', description: 'Timezone offset', example: '+0500', category: 'timezone' },
  { token: 'Z', description: 'Timezone offset (:)', example: '+05:00', category: 'timezone' },
];
```

### 1.2 Create Token Parser

- [x] Create function to parse format string into tokens and literals
- [x] Handle token precedence (longer tokens match first: `MMMM` before `MM` before `M`)

```typescript
interface FormatPart {
  type: 'token' | 'literal';
  value: string;
  start: number;
  end: number;
  tokenInfo?: MomentToken;
}

function parseFormatString(format: string): FormatPart[];
```

### 1.3 Unit Tests

- [x] Test token parsing with various format strings
- [x] Test edge cases: adjacent tokens, escaped characters, mixed tokens/literals

---

## Phase 2: Main Editor Highlighting

**Goal:** Highlight moment.js tokens inside `format(...)` in the main editor.

### 2.1 Update PromptHighlighter

- [x] Modify `parsePromptContent()` to detect `format(...)` in the format part
- [x] When format part starts with `format(`, parse inner content for tokens
- [x] Add new decoration types for format tokens

### 2.2 Add Token Decorations

- [x] Create decoration for format tokens (distinct color)
- [x] Create decoration for literal text in formats (muted)
- [x] Create decoration for `format()` wrapper

### 2.3 Update CSS

- [x] Add `.cm-format-token` class
- [x] Add `.cm-format-literal` class
- [x] Consider category-based coloring (optional)

### 2.4 Testing

- [x] Test highlighting in various prompt formats
- [x] Test with complex format strings
- [x] Verify no conflicts with existing highlighting

---

## Phase 3: Main Editor Autocomplete

**Goal:** Suggest moment.js tokens when typing inside `format(...)`.

### 3.1 Update PromptSuggest

- [x] Add detection for cursor inside `format(...)`
- [x] Pattern: `format\([^)]*$` at end of text before cursor
- [x] Return token suggestions when detected

### 3.2 Create Token Suggestions

- [x] Map MOMENT_TOKENS to suggestion format
- [x] Group by category for better organization
- [x] Include example output in description

### 3.3 Filter Suggestions

- [x] Filter based on partial token typed
- [x] Show all tokens when just `format(` typed
- [x] Consider context-aware filtering (e.g., after typing date tokens, suggest time tokens)

### 3.4 Testing

- [x] Test autocomplete triggers correctly
- [x] Test filtering works as expected
- [x] Test insertion replaces partial token

---

## Phase 4: Settings Highlighting

**Goal:** Highlight format tokens in the SyntaxInput component.

### 4.1 Update SyntaxInput Highlighter

- [x] Extend `buildPromptDecorations()` or create separate function
- [x] Detect `format(...)` within prompt syntax
- [x] Apply token decorations

### 4.2 Reuse Token Parser

- [x] Import `parseFormatString` from momentTokens.ts
- [x] Apply same decoration logic as main editor

### 4.3 Testing

- [x] Test in template editor title pattern field
- [x] Verify highlighting matches main editor

---

## Phase 5: Settings Autocomplete

**Goal:** Suggest tokens in the SyntaxInput autocomplete.

### 5.1 Update promptCompletions

- [x] Add format token detection to completion source
- [x] Detect when cursor is inside `format(...)`
- [x] Return token suggestions

### 5.2 Integration

- [x] Ensure suggestions appear in settings
- [x] Test alongside existing variable/prompt completions

---

## Phase 6: Polish

### 6.1 Documentation

- [ ] Update README with format token documentation (optional, deferred)
- [ ] Add examples of common format patterns (optional, deferred)

### 6.2 Edge Cases

- [x] Handle nested parentheses if needed
- [x] Handle escaped characters in format strings
- [x] Test with datetime formats (two format() calls)

### 6.3 Performance

- [x] Ensure token parsing doesn't impact editor performance
- [x] Consider caching parsed results

---

## File Structure

After implementation:

```
src/
├── utils/
│   └── momentTokens.ts      (new - token definitions and parser)
├── editor/
│   ├── PromptHighlighter.ts (modified - format token highlighting)
│   └── PromptSuggest.ts     (modified - format token autocomplete)
├── components/
│   └── SyntaxInput.tsx      (modified - format highlighting/autocomplete)
└── ...
```

---

## CSS Classes

| Class | Purpose |
|-------|---------|
| `.cm-format-wrapper` | The `format()` function name and parens |
| `.cm-format-token` | Moment.js tokens (YYYY, MM, etc.) |
| `.cm-format-literal` | Literal text between tokens |

---

## Complexity Assessment

| Aspect | Complexity | Notes |
|--------|------------|-------|
| Token parsing | Medium | Need to handle token precedence correctly |
| Main editor highlighting | Low | Extends existing infrastructure |
| Main editor autocomplete | Low | Extends existing trigger detection |
| Settings highlighting | Low | Reuses token parser |
| Settings autocomplete | Low | Reuses token suggestions |
| Edge cases | Medium | Escaped chars, nested parens, datetime |

**Overall:** Medium complexity, estimated 4-6 phases

---

## Success Criteria

- [x] Moment.js tokens highlighted distinctly inside `format(...)`
- [x] Autocomplete shows token suggestions with descriptions and examples
- [x] Works in both main editor and settings
- [x] No performance degradation
- [x] All existing tests pass (566 tests passing)
- [x] New tests cover token parsing and highlighting

---

## Alternative Approaches Considered

1. **External documentation link only** - Simpler but less helpful
2. **Dropdown selector for format** - More guided but less flexible
3. **Live preview of format** - Would require evaluating moment.js at edit time

The chosen approach (highlighting + autocomplete) provides the best balance of helpfulness and implementation complexity.

---

## Open Questions

1. Should we color-code tokens by category (date=blue, time=green, etc.)?
2. Should we show a live preview of the current format somewhere?
3. Should we warn about potentially problematic combinations?

---

## Commit Messages (Suggested)

**Phase 1:**
```
feat: Add moment.js token definitions and parser

Create momentTokens.ts with comprehensive token list and format
string parser for use in highlighting and autocomplete.
```

**Phase 2-3:**
```
feat: Add moment.js format highlighting and autocomplete in main editor

Highlight tokens inside format(...) syntax and provide autocomplete
suggestions for moment.js format tokens with descriptions and examples.
```

**Phase 4-5:**
```
feat: Add moment.js format highlighting and autocomplete in settings

Extend SyntaxInput component to highlight and autocomplete moment.js
format tokens in the title pattern field.
```
