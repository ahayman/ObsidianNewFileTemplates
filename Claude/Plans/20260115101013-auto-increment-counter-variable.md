# Auto-Increment Counter Variable Feature Plan

## Overview

Add an auto-incrementing integer variable (`{{counter}}`) to the Title Template system. When a user creates a new note using a template with this variable, the plugin will:

1. Scan existing files in the target folder
2. Extract counter values from files matching the template pattern
3. Determine the maximum existing value
4. Increment by 1 and use that value for the new file

## Key Requirements

- [x] Variable can only be added once per template
- [x] Can be placed anywhere in the template pattern
- [x] "Starts at" field appears when variable is used (default: 1)
- [x] Extraction algorithm must be accurate and efficient
- [x] Algorithm must not be confused by other numbers in the template
- [x] Comprehensive test coverage (97 tests for CounterService alone)

## Implementation Status: COMPLETE

All phases have been implemented and tested. 238 tests pass (114 for CounterService alone).

### Post-Implementation Bug Fixes

1. **Filename Sanitization Bug**: Fixed issue where `|` in templates gets sanitized to `∣` in filenames. Created `sanitizeForPattern()` to apply the same character substitutions to literal text before building regex.

2. **Hardcoded DateTime Format Bug**: Fixed issue where user's configured date format (from Templates plugin settings) wasn't being used. Now passes `TemplatesSettings` through to pattern building.

3. **Flexible Pattern Matching**: Refactored `buildMatchingPattern()` to use smart flexible patterns based on template structure:
   - Counter at start with static prefix: `^{prefix}(\d+).*$`
   - Counter at end with static suffix: `^.*?(\d+){suffix}$`
   - Static text on both sides: `^{before}(\d+){after}$`
   - Variables on both sides: Full precision matching with all variables converted to regex

---

## Phase 1: Core Types and Validation

### 1.1 Update Type Definitions

**File:** `src/types.ts`

- [ ] Add `counterStartsAt?: number` field to `TitleTemplate` interface
- [ ] Default value: `1`

```typescript
interface TitleTemplate {
  id: string;
  name: string;
  titlePattern: string;
  folder: string;
  fileTemplate?: string;
  useTemplater?: boolean;
  counterStartsAt?: number;  // NEW: Default starting value for {{counter}}
}
```

### 1.2 Template Validation Updates

**File:** `src/utils/templateParser.ts`

- [ ] Add `{{counter}}` to recognized variables
- [ ] Add validation: `{{counter}}` can only appear once in a template
- [ ] Export helper: `hasCounterVariable(pattern: string): boolean`
- [ ] Export helper: `countOccurrences(pattern: string, variable: string): number`

```typescript
// Validation should fail if {{counter}} appears more than once
export function validateTemplate(pattern: string): { valid: boolean; error?: string } {
  // ... existing validation ...

  const counterCount = countOccurrences(pattern, 'counter');
  if (counterCount > 1) {
    return { valid: false, error: 'Template can only contain one {{counter}} variable' };
  }

  return { valid: true };
}
```

---

## Phase 2: Counter Extraction Algorithm

### 2.1 Create Counter Service

**File:** `src/services/CounterService.ts` (NEW)

This is the core algorithm. The strategy:

1. **Build a regex pattern** from the template that can match existing files
2. **Capture the counter value** as a regex group
3. **Scan files** in the target folder
4. **Return the next value** (max + 1, or startsAt if no matches)

#### 2.1.1 Variable-to-Regex Mapping

Each template variable maps to a regex pattern:

| Variable | Regex Pattern | Notes |
|----------|---------------|-------|
| `{{counter}}` | `(\d+)` | **Captured group** - this is what we extract |
| `{{date}}` | `\d{4}-\d{2}-\d{2}` | Default format YYYY-MM-DD |
| `{{date:FORMAT}}` | `[dynamic]` | Convert moment format to regex |
| `{{time}}` | `\d{2}-\d{2}-\d{2}` | HH-mm-ss (file-safe format) |
| `{{time:FORMAT}}` | `[dynamic]` | Convert moment format to regex |
| `{{datetime}}` | `\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}` | Combined format |
| `{{timestamp}}` | `\d{10,13}` | Unix timestamp (10-13 digits) |
| `{{year}}` | `\d{4}` | 4-digit year |
| `{{month}}` | `\d{2}` | 2-digit month |
| `{{day}}` | `\d{2}` | 2-digit day |

#### 2.1.2 Moment Format to Regex Conversion

- [ ] Create `momentFormatToRegex(format: string): string` function
- [ ] Map moment tokens to regex patterns:

| Moment Token | Regex | Description |
|--------------|-------|-------------|
| `YYYY` | `\d{4}` | 4-digit year |
| `YY` | `\d{2}` | 2-digit year |
| `MM` | `\d{2}` | Month (01-12) |
| `M` | `\d{1,2}` | Month (1-12) |
| `DD` | `\d{2}` | Day (01-31) |
| `D` | `\d{1,2}` | Day (1-31) |
| `HH` | `\d{2}` | Hour 24h (00-23) |
| `H` | `\d{1,2}` | Hour 24h (0-23) |
| `hh` | `\d{2}` | Hour 12h (01-12) |
| `h` | `\d{1,2}` | Hour 12h (1-12) |
| `mm` | `\d{2}` | Minutes (00-59) |
| `m` | `\d{1,2}` | Minutes (0-59) |
| `ss` | `\d{2}` | Seconds (00-59) |
| `s` | `\d{1,2}` | Seconds (0-59) |
| `A` | `[AP]M` | AM/PM |
| `a` | `[ap]m` | am/pm |

#### 2.1.3 Core Algorithm Functions

```typescript
// src/services/CounterService.ts

/**
 * Build a regex pattern from a template that can match existing files
 * The {{counter}} variable becomes a capturing group (\d+)
 * Other variables become non-capturing patterns
 */
export function buildMatchingPattern(titlePattern: string): RegExp | null {
  // 1. Escape regex special characters in literal text
  // 2. Replace each variable with its regex equivalent
  // 3. Return compiled regex with {{counter}} as captured group
}

/**
 * Extract the counter value from a filename using the pattern
 */
export function extractCounterFromFilename(
  filename: string,
  pattern: RegExp
): number | null {
  const match = filename.match(pattern);
  if (match && match[1]) {
    const value = parseInt(match[1], 10);
    return isNaN(value) ? null : value;
  }
  return null;
}

/**
 * Get the next counter value by scanning existing files
 */
export async function getNextCounterValue(
  app: App,
  template: TitleTemplate,
  targetFolder: string
): Promise<number> {
  // 1. Check if template has {{counter}}
  if (!hasCounterVariable(template.titlePattern)) {
    throw new Error('Template does not contain {{counter}} variable');
  }

  // 2. Build matching pattern
  const pattern = buildMatchingPattern(template.titlePattern);
  if (!pattern) {
    return template.counterStartsAt ?? 1;
  }

  // 3. Get files in target folder
  const folder = app.vault.getAbstractFileByPath(targetFolder);
  if (!(folder instanceof TFolder)) {
    return template.counterStartsAt ?? 1;
  }

  // 4. Extract counter values from matching files
  const values: number[] = [];
  for (const file of folder.children) {
    if (file instanceof TFile && file.extension === 'md') {
      const value = extractCounterFromFilename(file.basename, pattern);
      if (value !== null) {
        values.push(value);
      }
    }
  }

  // 5. Return next value
  if (values.length === 0) {
    return template.counterStartsAt ?? 1;
  }
  return Math.max(...values) + 1;
}
```

#### 2.1.4 Pattern Building Implementation Detail

The pattern building algorithm must:

1. **Tokenize** the template into segments (literal text and variables)
2. **Escape** literal text for regex safety
3. **Map** variables to their regex patterns
4. **Mark** `{{counter}}` as a capturing group
5. **Anchor** the pattern with `^` and `$`

```typescript
function buildMatchingPattern(titlePattern: string): RegExp | null {
  // Regex to find all {{variable}} or {{variable:format}} patterns
  const variableRegex = /\{\{(\w+)(?::([^}]+))?\}\}/g;

  let regexPattern = '';
  let lastIndex = 0;
  let hasCounter = false;

  let match;
  while ((match = variableRegex.exec(titlePattern)) !== null) {
    // Escape and add literal text before this variable
    const literalText = titlePattern.slice(lastIndex, match.index);
    regexPattern += escapeRegex(literalText);

    const [fullMatch, varName, format] = match;

    // Map variable to regex pattern
    const varPattern = getVariableRegexPattern(varName, format);

    if (varName === 'counter') {
      hasCounter = true;
      regexPattern += `(${varPattern})`; // Capturing group
    } else {
      regexPattern += varPattern; // Non-capturing
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining literal text
  regexPattern += escapeRegex(titlePattern.slice(lastIndex));

  if (!hasCounter) {
    return null;
  }

  return new RegExp(`^${regexPattern}$`);
}

function getVariableRegexPattern(varName: string, format?: string): string {
  switch (varName) {
    case 'counter':
      return '\\d+';
    case 'date':
      return format ? momentFormatToRegex(format) : '\\d{4}-\\d{2}-\\d{2}';
    case 'time':
      return format ? momentFormatToRegex(format) : '\\d{2}-\\d{2}-\\d{2}';
    case 'datetime':
      return '\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}';
    case 'timestamp':
      return '\\d{10,13}';
    case 'year':
      return '\\d{4}';
    case 'month':
      return '\\d{2}';
    case 'day':
      return '\\d{2}';
    default:
      return '.*?'; // Fallback: match anything non-greedy
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

---

## Phase 3: Integration with File Creation

### 3.1 Update Template Parser

**File:** `src/utils/templateParser.ts`

- [ ] Add `{{counter}}` to `parseTemplate()` function
- [ ] Add `counterValue?: number` parameter to accept pre-computed counter

```typescript
export function parseTemplate(
  pattern: string,
  date: Date = new Date(),
  counterValue?: number
): string {
  // ... existing variable replacements ...

  if (counterValue !== undefined) {
    result = result.replace(/\{\{counter\}\}/gi, String(counterValue));
  }

  return result;
}
```

### 3.2 Update File Creation Flow

**File:** `src/main.ts`

- [ ] Before creating file, check if template has `{{counter}}`
- [ ] If yes, call `getNextCounterValue()` to get the value
- [ ] Pass counter value to `parseTemplate()`

```typescript
async createFileFromTemplate(template: TitleTemplate, contextFolder?: string) {
  // ... existing code to determine folder ...

  let counterValue: number | undefined;
  if (hasCounterVariable(template.titlePattern)) {
    counterValue = await getNextCounterValue(this.app, template, targetFolder);
  }

  const filename = parseTitleTemplateToFilename(
    template.titlePattern,
    templatesSettings,
    new Date(),
    counterValue
  );

  // ... rest of file creation ...
}
```

---

## Phase 4: UI Updates

### 4.1 Update Template Editor

**File:** `src/settings/TemplateEditor.tsx`

- [ ] Detect when `{{counter}}` is in the title pattern
- [ ] Show "Starts at" number input when counter is detected
- [ ] Validate "Starts at" is a positive integer
- [ ] Add hint text explaining the counter variable

```tsx
// In TemplateEditor component
const hasCounter = hasCounterVariable(template.titlePattern);

return (
  <div>
    {/* ... existing fields ... */}

    {hasCounter && (
      <div className="setting-item">
        <div className="setting-item-info">
          <div className="setting-item-name">Counter Starts At</div>
          <div className="setting-item-description">
            Initial value when no matching files exist
          </div>
        </div>
        <div className="setting-item-control">
          <input
            type="number"
            min="0"
            value={template.counterStartsAt ?? 1}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value) && value >= 0) {
                updateTemplate({ counterStartsAt: value });
              }
            }}
          />
        </div>
      </div>
    )}

    {/* Variable hints */}
    <div className="variable-hints">
      <code>{'{{counter}}'}</code> - Auto-incrementing number
      {/* ... other hints ... */}
    </div>
  </div>
);
```

### 4.2 Update Variable Hints

- [ ] Add `{{counter}}` to the list of available variables in the UI
- [ ] Include description: "Auto-incrementing number based on existing files"

### 4.3 Validation Error Display

- [ ] Show error if `{{counter}}` appears more than once
- [ ] Prevent saving template if validation fails

---

## Phase 5: Comprehensive Testing

### 5.1 Unit Tests for Counter Extraction

**File:** `src/services/__tests__/CounterService.test.ts` (NEW)

#### 5.1.1 Pattern Building Tests

- [ ] Basic pattern: `Note {{counter}}`
- [ ] Counter at start: `{{counter}} - Daily Note`
- [ ] Counter at end: `Daily Note {{counter}}`
- [ ] Counter in middle: `Project {{counter}} Report`
- [ ] With date: `{{date}} - Note {{counter}}`
- [ ] With multiple variables: `{{year}}-{{month}}-{{day}} Entry {{counter}}`
- [ ] With custom date format: `{{date:YYYYMMDD}}-{{counter}}`
- [ ] With timestamp: `{{timestamp}}_File_{{counter}}`
- [ ] With special characters: `[Project] {{counter}} (Draft)`
- [ ] Pattern escaping: `File.{{counter}}.md` (dots escaped)

#### 5.1.2 Counter Extraction Tests

- [ ] Simple extraction: `Note 1` → 1
- [ ] Multi-digit: `Note 100` → 100
- [ ] Large numbers: `Note 99999` → 99999
- [ ] Zero: `Note 0` → 0
- [ ] Leading zeros preserved in match: `Note 001` → 1 (parsed as int)
- [ ] Counter with date: `2024-01-15 - Note 5` → 5
- [ ] Counter at different positions
- [ ] No match returns null

#### 5.1.3 Max Value Calculation Tests

- [ ] Empty folder returns startsAt
- [ ] Single file returns value + 1
- [ ] Multiple files returns max + 1
- [ ] Non-matching files ignored
- [ ] Mixed matching/non-matching files
- [ ] Files with gaps (1, 3, 5) → returns 6

#### 5.1.4 Edge Case Tests

- [ ] Template with no counter returns null pattern
- [ ] Files without .md extension ignored
- [ ] Subfolders not scanned (only direct children)
- [ ] Very large counter values handled
- [ ] Counter value 0 handled correctly
- [ ] startsAt of 0 works correctly
- [ ] startsAt of negative number (should be prevented by UI)

#### 5.1.5 Moment Format Conversion Tests

- [ ] `YYYY` → `\d{4}`
- [ ] `YYYYMMDD` → `\d{4}\d{2}\d{2}`
- [ ] `YYYY-MM-DD` → `\d{4}-\d{2}-\d{2}`
- [ ] `HH:mm:ss` → `\d{2}:\d{2}:\d{2}`
- [ ] `h:mm A` → `\d{1,2}:\d{2} [AP]M`
- [ ] Mixed: `YYYY-MM-DD_HH-mm`

#### 5.1.6 Regex Escaping Tests

- [ ] Dots: `v1.0 {{counter}}` → `v1\.0 (\d+)`
- [ ] Brackets: `[Draft] {{counter}}` → `\[Draft\] (\d+)`
- [ ] Parentheses: `(Note) {{counter}}` → `\(Note\) (\d+)`
- [ ] Plus: `C++ {{counter}}` → `C\+\+ (\d+)`
- [ ] All special chars: `$^*+?{}[]|()\`

### 5.2 Integration Tests

**File:** `src/__tests__/counterIntegration.test.ts` (NEW)

- [ ] Full flow: create template with counter, create multiple files, verify incrementing
- [ ] Folder change: counter resets when folder changes
- [ ] Template modification: adding counter to existing template
- [ ] Concurrent creation handling (if applicable)

### 5.3 UI Tests

- [ ] Counter starts at field appears/disappears based on pattern
- [ ] Validation error shown for duplicate counter
- [ ] Preview updates with placeholder counter value

---

## Phase 6: Documentation and Polish

### 6.1 Code Documentation

- [ ] JSDoc comments for all new public functions
- [ ] Inline comments explaining regex patterns
- [ ] Type definitions with descriptions

### 6.2 Error Handling

- [ ] Graceful fallback if folder doesn't exist
- [ ] Handle permission errors reading folder
- [ ] Log warnings for unparseable filenames

### 6.3 Performance Considerations

- [ ] Cache compiled regex patterns (optional optimization)
- [ ] Only scan .md files
- [ ] Early exit if no counter in template

---

## Implementation Order

Recommended order for implementation:

1. **Phase 1** - Types and validation (foundation)
2. **Phase 5.1** - Write tests first (TDD approach)
3. **Phase 2** - Counter extraction algorithm
4. **Phase 3** - Integration with file creation
5. **Phase 4** - UI updates
6. **Phase 5.2-5.3** - Integration and UI tests
7. **Phase 6** - Documentation and polish

---

## Test Case Examples

### Example 1: Basic Counter

**Template:** `Note {{counter}}`
**Existing files:** `Note 1.md`, `Note 2.md`, `Note 3.md`
**Generated pattern:** `^Note (\d+)$`
**Extracted values:** [1, 2, 3]
**Next value:** 4
**New filename:** `Note 4.md`

### Example 2: Counter with Date

**Template:** `{{date}} - Entry {{counter}}`
**Existing files:**
- `2024-01-15 - Entry 1.md`
- `2024-01-16 - Entry 2.md`
- `2024-01-16 - Entry 3.md`

**Generated pattern:** `^\d{4}-\d{2}-\d{2} - Entry (\d+)$`
**Extracted values:** [1, 2, 3]
**Next value:** 4
**New filename:** `2024-01-17 - Entry 4.md`

### Example 3: Counter at Start

**Template:** `{{counter}}. {{date}} Daily`
**Existing files:**
- `1. 2024-01-15 Daily.md`
- `2. 2024-01-16 Daily.md`

**Generated pattern:** `^(\d+)\. \d{4}-\d{2}-\d{2} Daily$`
**Extracted values:** [1, 2]
**Next value:** 3
**New filename:** `3. 2024-01-17 Daily.md`

### Example 4: No Existing Files

**Template:** `Project {{counter}}`
**counterStartsAt:** 1
**Existing files:** (none)
**Next value:** 1
**New filename:** `Project 1.md`

### Example 5: Custom Start Value

**Template:** `Chapter {{counter}}`
**counterStartsAt:** 100
**Existing files:** (none)
**Next value:** 100
**New filename:** `Chapter 100.md`

### Example 6: Non-Matching Files Ignored

**Template:** `Report {{counter}}`
**Existing files:**
- `Report 1.md` ✓
- `Report 2.md` ✓
- `Other Document.md` ✗
- `Report Draft.md` ✗ (no number)

**Extracted values:** [1, 2]
**Next value:** 3

### Example 7: Special Characters in Template

**Template:** `[Project] {{counter}} (v1.0)`
**Generated pattern:** `^\[Project\] (\d+) \(v1\.0\)$`
**Existing files:** `[Project] 5 (v1.0).md`
**Extracted values:** [5]
**Next value:** 6

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Regex performance on large folders | Only compile pattern once, iterate files |
| Custom date formats not matching | Comprehensive moment-to-regex mapping |
| Number parsing edge cases | Thorough test coverage |
| Race condition on concurrent creates | Document limitation (single-user typical use) |
| Breaking existing templates | Counter is opt-in, no changes to existing behavior |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/types.ts` | Modify | Add `counterStartsAt` field |
| `src/utils/templateParser.ts` | Modify | Add counter variable support |
| `src/services/CounterService.ts` | Create | Core extraction algorithm |
| `src/services/__tests__/CounterService.test.ts` | Create | Comprehensive tests |
| `src/main.ts` | Modify | Integrate counter into file creation |
| `src/settings/TemplateEditor.tsx` | Modify | Add "Starts at" UI |
| `src/utils/templatesIntegration.ts` | Modify | Support counter in parsing |
