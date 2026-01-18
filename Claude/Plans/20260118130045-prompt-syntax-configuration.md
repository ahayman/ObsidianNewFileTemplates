# Plan: Prompt Syntax Configuration

## Overview

Implement a new prompt syntax that allows configuring prompt type and format directly in the template string, eliminating the need for separate configuration in settings.

### New Syntax

```
{% PromptName:FieldType:Format %}
```

### Examples

| Syntax | Description |
|--------|-------------|
| `{% Event Name:text %}` | Text input |
| `{% Event No:number %}` | Numeric input |
| `{% Date:date:ISO %}` | Date with ISO preset |
| `{% Date:datetime:ISO %}` | DateTime with ISO preset for both |
| `{% Date:datetime:ISO,12-hour %}` | DateTime with separate presets |
| `{% Date:datetime:format(MMM YYYY DD, H:mm:ss A) %}` | DateTime with custom format |

### Constraints

- Colons (`:`) cannot be part of the prompt name (used as delimiter)
- Only **one** custom format is allowed for datetime (applies to both date and time portions)
- Backward compatibility: `{% Name %}` should still work (defaults to text type)

---

## Phase 1: Update Type Definitions

- [x] Add new format preset types to `types.ts`
- [x] Create a mapping between preset names and existing format options
- [x] Add type for parsed prompt syntax

### Details

Add preset name mappings:
```typescript
// Date presets
'ISO' -> 'YYYY-MM-DD'
'compact' -> 'YYYYMMDD'
'US' -> 'MM-DD-YYYY'
'EU' -> 'DD-MM-YYYY'
'short' -> 'MMM DD, YYYY'
'long' -> 'MMMM DD, YYYY'

// Time presets
'ISO' -> 'HH:mm:ss'
'24-hour' -> 'HH:mm'
'24-compact' -> 'HHmm'
'12-hour' -> 'h:mm A'
'12-padded' -> 'hh:mm A'
```

---

## Phase 2: Update Prompt Parser

- [x] Update regex pattern to capture optional type and format segments
- [x] Create `parsePromptSyntax()` function to extract name, type, and format
- [x] Update `extractPrompts()` to parse the new syntax
- [x] Update `syncPromptsWithPattern()` to handle inline configuration
- [x] Ensure backward compatibility with `{% Name %}` syntax (no type/format)

### New Regex Pattern

```typescript
// Pattern: {% Name %} or {% Name:type %} or {% Name:type:format %}
const PROMPT_PATTERN = /\{%\s*([^:%]+?)(?::(\w+)(?::([^%]+?))?)?\s*%\}/;
```

### Parsing Logic

```typescript
interface ParsedPromptSyntax {
  name: string;
  valueType: 'text' | 'numeric' | 'date' | 'time' | 'datetime';
  dateFormat?: DateOutputFormat;
  timeFormat?: TimeOutputFormat;
  customFormat?: string;
}

function parsePromptSyntax(rawContent: string): ParsedPromptSyntax {
  // 1. Split by `:` but handle format(...) specially
  // 2. Extract name (required)
  // 3. Extract type (optional, default 'text')
  // 4. Extract format (optional):
  //    - Single preset: 'ISO', '12-hour', etc.
  //    - Dual preset: 'ISO,12-hour' (for datetime)
  //    - Custom: 'format(MMM YYYY DD, H:mm:ss A)'
}
```

---

## Phase 3: Update Prompt Substitution

- [x] Update `substitutePrompts()` to use inline format configuration
- [x] Ensure format specified in syntax takes precedence over stored config
- [x] Handle custom format parsing for `format(...)` syntax

### Priority Order for Format Resolution

1. Inline syntax format (e.g., `{% Date:date:ISO %}`)
2. Stored prompt configuration (from userPrompts array)
3. Default format for the type

---

## Phase 4: Update PromptEditor UI

- [x] Add info message explaining inline syntax option
- [x] When datetime type is selected with custom format, show single format field (not separate date/time)
- [x] Add validation to prevent separate date/time custom formats for datetime
- [x] Update preview to show inline syntax equivalent

### UI Changes

For datetime with custom format:
- Remove separate "Date Format" and "Time Format" dropdowns
- Show single "DateTime Format" input field
- Add help text: "Format applies to the entire datetime output"

---

## Phase 5: Update Settings Synchronization

- [x] When pattern changes, parse inline configuration and update userPrompts
- [x] If prompt has inline config, mark it as "inline-configured" to prevent manual edits
- [x] Show read-only view for inline-configured prompts in settings

### Behavior

| Scenario | Result |
|----------|--------|
| `{% Name %}` | Show full editor (type, format dropdowns) |
| `{% Name:date %}` | Show read-only type, allow format editing |
| `{% Name:date:ISO %}` | Show read-only (configured via syntax) |

---

## Phase 6: Testing & Documentation

- [x] Build passes with no TypeScript errors
- [ ] Add unit tests for new parser regex (optional)
- [ ] Add unit tests for format preset mapping (optional)
- [ ] Add unit tests for custom format parsing (optional)
- [x] Backward compatibility with existing `{% Name %}` syntax maintained
- [x] Updated code comments and documentation

### Test Cases

1. Basic parsing: `{% Name %}` -> text type, no format
2. Type only: `{% Name:number %}` -> numeric type
3. Type with preset: `{% Date:date:ISO %}` -> date type, YYYY-MM-DD format
4. DateTime with single preset: `{% Date:datetime:ISO %}` -> both use ISO
5. DateTime with dual preset: `{% Date:datetime:EU,12-hour %}` -> DD-MM-YYYY, h:mm A
6. Custom format: `{% Date:datetime:format(YYYY-MM-DD at h:mm A) %}`
7. Invalid type: `{% Name:invalid %}` -> fallback to text
8. Mixed templates: `{% Author:text %} - {% Date:date:ISO %}`

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/types.ts` | Add format preset mappings, ParsedPromptSyntax type |
| `src/utils/promptParser.ts` | Update regex, add parsePromptSyntax(), update extractPrompts() |
| `src/utils/dateTimeUtils.ts` | Add preset name to format mapping functions |
| `src/settings/PromptEditor.tsx` | Update UI for datetime custom format |
| `src/settings/TemplateEditor.tsx` | Add inline syntax display/info |

---

## Commit Message

```
Add inline prompt configuration syntax

Implement new syntax for configuring prompt type and format directly in templates:
- {% Name:type:format %} syntax for inline configuration
- Support for preset formats (ISO, 12-hour, etc.)
- Support for custom formats: format(pattern)
- DateTime now uses single custom format for both date and time
- Backward compatible with existing {% Name %} syntax
```
