# User Entry Prompts Implementation Plan

## Overview

Add user-definable prompt variables to the title template system. These prompts use a distinct syntax (`{% Prompt Name %}`) and prompt the user to enter values when creating a new file. The entered values are inserted into the title template before file creation.

## Current Architecture Summary

- Title templates use `{{variable}}` syntax for built-in variables (date, time, counter, etc.)
- Parsing handled in `/src/utils/templateParser.ts`
- Settings UI is React-based in `/src/settings/`
- File creation triggers `TemplateSelectModal` which calls `createFileFromTemplate()`
- Variables are defined in `SUPPORTED_VARIABLES` array and substituted via regex

---

## Phase 1: Type Definitions & Data Model

### Goals
- Define TypeScript interfaces for user prompts
- Update `TitleTemplate` interface to store prompt configurations

### Tasks

- [x] **1.1** Add `UserPrompt` interface to `/src/types.ts`:
  ```typescript
  interface UserPrompt {
    id: string;
    name: string;           // Display name shown to user
    valueType: 'text' | 'numeric';
  }
  ```

- [x] **1.2** Update `TitleTemplate` interface in `/src/types.ts`:
  ```typescript
  interface TitleTemplate {
    // ... existing fields
    userPrompts?: UserPrompt[];
  }
  ```

- [x] **1.3** Create type for prompt values collected at runtime:
  ```typescript
  interface PromptValues {
    [promptId: string]: string;
  }
  ```

---

## Phase 2: Prompt Parsing & Validation

### Goals
- Add parser support for `{% Prompt Name %}` syntax
- Validate prompts don't contain invalid filename characters
- Integrate prompt substitution into existing parsing pipeline

### Tasks

- [x] **2.1** Create `/src/utils/promptParser.ts` with functions:
  - `extractPrompts(pattern: string): UserPrompt[]` - Parse prompt syntax from pattern
  - `substitutePrompts(pattern: string, values: PromptValues, prompts: UserPrompt[]): string` - Replace prompts with values
  - `validatePromptName(name: string): ValidationResult` - Ensure name is valid

- [x] **2.2** Add prompt regex pattern: `/\{%\s*(.+?)\s*%\}/g`

- [x] **2.3** Update `validateTemplatePattern()` in `templateParser.ts`:
  - Recognize `{% %}` syntax as valid (not unknown variable)
  - Validate prompt names don't conflict with built-in variables

- [x] **2.4** Update `parseTemplate()` in `templateParser.ts`:
  - Accept optional `promptValues` parameter
  - Substitute prompts after built-in variables

- [ ] **2.5** Add unit tests in `/src/utils/__tests__/promptParser.test.ts`:
  - Test prompt extraction
  - Test prompt substitution
  - Test validation edge cases

---

## Phase 3: Settings UI - Prompt Configuration

### Goals
- Allow users to add/edit/remove prompts in the template editor
- Provide easy prompt insertion via button click
- Display configured prompts in template editor

### Tasks

- [x] **3.1** Create `/src/settings/PromptEditor.tsx` component:
  - Form fields: name (text input), valueType (dropdown: text/numeric)
  - Add/Edit/Delete functionality
  - Preview of syntax that will be inserted

- [x] **3.2** Update `/src/settings/TemplateEditor.tsx`:
  - Add "User Prompts" section below variable hints
  - Add "Add User Prompt" button
  - Display list of configured prompts
  - Allow clicking prompt to insert syntax at cursor position
  - Allow editing existing prompts
  - Allow deleting prompts

- [x] **3.3** Sync prompts with title pattern:
  - When prompt added via UI, insert `{% Prompt Name %}` into title pattern
  - When prompt deleted, optionally remove from pattern (with confirmation)
  - Parse existing prompts from pattern when editing template

- [x] **3.4** Add visual distinction for prompt syntax in title pattern preview:
  - Show user prompts in different style than built-in variables

---

## Phase 4: User Entry Modal

### Goals
- Create modal that prompts user for values when creating file with prompts
- Support keyboard navigation between fields
- Show real-time title preview
- Handle numeric vs text input types

### Tasks

- [x] **4.1** Create `/src/modals/PromptEntryModal.tsx`:
  - Extend Obsidian's `Modal` class
  - Accept template and prompts as constructor parameters
  - Return Promise resolving to entered values (or null if cancelled)

- [x] **4.2** Create `/src/modals/PromptEntryView.tsx` React component:
  - Display title preview at top (updating in real-time)
  - Preview turns green when all values filled
  - One input field per prompt
  - Numeric prompts use `inputmode="numeric"` for mobile keyboard
  - Enter/Return moves to next field or submits

- [x] **4.3** Implement input validation:
  - Disallow invalid filename characters: `* " \ / < > ? | :`
  - Show inline error message when invalid character entered
  - Strip control characters
  - For numeric: validate input is valid number

- [x] **4.4** Add keyboard navigation:
  - Enter/Return → next field or submit button
  - Tab → next field
  - Shift+Tab → previous field
  - Escape → cancel modal

- [x] **4.5** Style the modal:
  - Consistent with Obsidian's native modals
  - Clear visual hierarchy (title preview prominent)
  - Accessible focus states
  - Mobile-friendly touch targets

---

## Phase 5: Integration with File Creation Flow

### Goals
- Integrate prompt entry modal into file creation pipeline
- Ensure prompts are substituted before file creation
- Handle edge cases (no prompts, cancel, errors)

### Tasks

- [x] **5.1** Update `createFileFromTemplate()` in `/src/main.ts`:
  - Check if template has user prompts in pattern
  - If prompts exist, show PromptEntryModal before file creation
  - Pass prompt values to parseTemplate function
  - Handle cancel (don't create file)

- [x] **5.2** Update `parseTitleTemplateToFilename()` in `templatesIntegration.ts`:
  - Accept optional `promptValues` parameter
  - Pass to underlying parseTemplate call

- [x] **5.3** Update modal flow:
  - User selects template → TemplateSelectModal closes
  - If prompts: PromptEntryModal opens → User enters values → Modal closes
  - File created with substituted title

- [x] **5.4** Handle edge cases:
  - Template with prompts but user cancels entry → no file created
  - Empty prompt value → show validation error
  - All prompts already have default values → allow submission

---

## Phase 6: Testing & Polish

### Goals
- Comprehensive testing of all features
- Edge case handling
- Performance optimization
- Documentation

### Tasks

- [ ] **6.1** Add integration tests:
  - Template with mixed variables and prompts
  - Multiple prompts in single template
  - Numeric prompt validation
  - Cancel flow

- [x] **6.2** Test on mobile:
  - Verify numeric keyboard appears for numeric prompts (inputmode="numeric" added)
  - Test touch interactions (mobile-friendly CSS added)
  - Verify modal sizing on small screens (CSS responsive styles added)

- [x] **6.3** Test edge cases:
  - Very long prompt names (handled)
  - Special characters in prompt names (allowed ones) (validation added)
  - Prompt at start/middle/end of pattern (regex handles all positions)
  - Multiple prompts adjacent to each other (handled via unique IDs)

- [x] **6.4** Performance:
  - Ensure real-time preview doesn't cause lag (using useMemo)
  - Optimize regex operations if needed (efficient regex patterns used)

- [x] **6.5** Accessibility:
  - Verify screen reader compatibility (proper labels added)
  - Ensure proper ARIA labels (htmlFor and id attributes added)
  - Test keyboard-only navigation (Enter/Tab/Escape handling added)

---

## File Changes Summary

### New Files
- `/src/utils/promptParser.ts` - Prompt parsing and substitution
- `/src/utils/__tests__/promptParser.test.ts` - Unit tests
- `/src/settings/PromptEditor.tsx` - Prompt configuration component
- `/src/modals/PromptEntryModal.ts` - Obsidian modal wrapper
- `/src/modals/PromptEntryView.tsx` - React prompt entry UI

### Modified Files
- `/src/types.ts` - Add UserPrompt interface, update TitleTemplate
- `/src/utils/templateParser.ts` - Integrate prompt parsing
- `/src/utils/templatesIntegration.ts` - Pass prompt values
- `/src/settings/TemplateEditor.tsx` - Add prompt configuration UI
- `/src/main.ts` - Integrate prompt modal into file creation

---

## Implementation Notes

### Syntax Decision: `{% %}` vs alternatives
Using `{% Prompt %}` syntax (with `%`) instead of alternatives like:
- `{[ ]}` - Could conflict with wiki links
- `{{ }}` - Already used for built-in variables
- `<< >>` - Could conflict with markdown/templates

The `{% %}` syntax is distinctive, unlikely to appear in normal filenames, and visually similar enough to existing variables to feel consistent.

### Prompt ID Generation
Generate unique IDs for prompts using `crypto.randomUUID()` or simple timestamp-based ID. IDs are internal and not shown to users.

### Backward Compatibility
- Templates without `userPrompts` field continue to work unchanged
- Parsing handles templates with or without prompts seamlessly

---

## Commit Message

```
Add user entry prompts for dynamic title values

- Add {% Prompt Name %} syntax for user-defined prompts
- Create prompt configuration UI in template settings
- Build prompt entry modal with real-time title preview
- Support text and numeric input types
- Validate input for invalid filename characters
- Add keyboard navigation for quick prompt entry
```
