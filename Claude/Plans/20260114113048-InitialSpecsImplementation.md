# Plan: Initial Specs Implementation

## Overview

Implement the core functionality of the File Template Plugin as defined in `/Claude/Specs/1-FileTemplatePlugin.md`. This includes:
- Title template system with variable substitution
- Settings UI for managing templates (React-based)
- Template selection modal
- File creation with optional file template application
- Folder context menu integration
- Command palette integration with per-template commands
- Mobile support

---

## Phase 1: Title Template Parser ✅

Create a utility to parse title patterns and substitute variables.

### Tasks
- [x] Create `src/utils/templateParser.ts`
- [x] Implement supported variables:
  - `{{date}}` - Current date (YYYY-MM-DD)
  - `{{time}}` - Current time (HH-mm-ss, file-safe format)
  - `{{datetime}}` - Combined date and time
  - `{{timestamp}}` - Unix timestamp
  - `{{year}}` - Current year (YYYY)
  - `{{month}}` - Current month (MM)
  - `{{day}}` - Current day (DD)
- [x] Create `parseTemplate(pattern: string): string` function
- [x] Handle edge cases (invalid patterns, missing variables)
- [x] Write unit tests for template parser (36 tests)

### Files Created
- `src/utils/templateParser.ts`
- `src/utils/templateParser.test.ts`
- `src/utils/index.ts`

---

## Phase 2: File Creation Service ✅

Create a service to handle file creation with optional template application.

### Tasks
- [x] Create `src/services/FileService.ts`
- [x] Implement `createFile(folder: string, filename: string, content?: string): Promise<TFile>`
- [x] Implement `getTemplateContent(templatePath: string): Promise<string>`
- [x] Implement `processFileTemplate(content: string, filename: string): string`
  - Support basic variables in file templates: `{{title}}`, `{{date}}`, `{{time}}`
- [x] Implement `getCurrentFolder(): string` to get active file's folder
- [x] Implement `ensureFolderExists(path: string): Promise<void>`
- [x] Handle file name conflicts (append number if file exists)
- [x] Write unit tests for file service (30 tests)

### Files Created
- `src/services/FileService.ts`
- `src/services/FileService.test.ts`
- `src/services/index.ts`

---

## Phase 3: Template Selection Modal ✅

Create a fuzzy search modal for selecting templates.

### Tasks
- [x] Create `src/modals/TemplateSelectModal.ts`
- [x] Extend `FuzzySuggestModal<TitleTemplate>`
- [x] Implement `getItems()` - return all templates from settings
- [x] Implement `getItemText()` - return template name
- [x] Implement `onChooseItem()` - trigger file creation
- [x] Implement custom `renderSuggestion()` to show:
  - Template name (with fuzzy match highlighting)
  - Target folder (with override support)
  - File template (if set)
  - Title pattern preview
- [x] Add support for passing a target folder override (for context menu)
- [x] Style the modal suggestions
- [x] Add empty state message when no templates configured
- [x] Add mobile-optimized styles (larger touch targets)

### Files Created/Modified
- `src/modals/TemplateSelectModal.ts` (new)
- `src/modals/index.ts` (new)
- `styles.css` (updated with modal + settings + mobile styles)

---

## Phase 4: Settings Tab (React) ✅

Create the settings UI for managing title templates.

### Tasks
- [x] Create `src/settings/SettingsTab.tsx` - main settings tab component
- [x] Create `src/settings/TemplateList.tsx` - list of templates with add/edit/delete
- [x] Create `src/settings/TemplateEditor.tsx` - form for editing a single template
- [x] Create `src/settings/AppContext.tsx` - React context for Obsidian App
- [x] Folder/file pickers integrated into TemplateEditor using native select elements
- [x] Implement template CRUD operations:
  - Add new template
  - Edit existing template
  - Delete template (with confirmation)
- [x] Settings fields per template:
  - Name (required)
  - Title Pattern (required, with clickable variable hints)
  - Target Folder (required, with "Current Folder" option)
  - File Template (optional, dropdown)
- [x] Add validation for required fields
- [x] Add preview of generated title
- [x] Style the settings components
- [x] Write tests for settings components (10 tests)

### Files Created/Modified
- `src/settings/SettingsTab.tsx` (new)
- `src/settings/TemplateList.tsx` (new)
- `src/settings/TemplateEditor.tsx` (new)
- `src/settings/TemplateEditor.test.tsx` (new)
- `src/settings/AppContext.tsx` (new)
- `src/settings/index.ts` (new)
- `styles.css` (updated with form styles)

---

## Phase 5: Context Menu Integration ✅

Add "New Templated File" option to folder right-click menu.

### Tasks
- [x] Register `file-menu` event in `main.ts`
- [x] Check if clicked item is a `TFolder`
- [x] Add menu item "New Templated File"
- [x] Open template selection modal with folder override
- [x] Add "file-plus" icon

### Files Modified
- `src/main.ts`

---

## Phase 6: Command Registration ✅

Register commands for the command palette.

### Tasks
- [x] Register main command: "Create New Templated File"
  - Opens template selection modal
- [x] Register per-template commands: "Create a new {Template Name} File"
  - Directly creates file using that template
- [x] Implement dynamic command re-registration when templates change
- [x] Commands work on mobile (uses standard Obsidian command API)

### Files Modified
- `src/main.ts`

---

## Phase 7: Main Plugin Integration ✅

Wire everything together in the main plugin file.

### Tasks
- [x] Initialize FileService in `onload()`
- [x] Register SettingsTab
- [x] Implement `openTemplateModal(targetFolder?: TFolder)`
- [x] Implement `createFileFromTemplate(template, targetFolder?)`
- [x] Handle settings changes via `onSettingsChange()` callback
- [x] Add error handling and user notifications (Notice)
- [x] Proper cleanup handled by Obsidian's `registerEvent()`

### Files Modified
- `src/main.ts`

---

## Phase 8: Mobile Optimization ✅

Ensure the plugin works well on mobile devices.

### Tasks
- [x] Touch targets sized appropriately (44px+ minimum)
- [x] Context menu works via long-press (uses standard Obsidian API)
- [x] Command palette works on mobile (uses standard Obsidian API)
- [x] Enhanced mobile styles:
  - Larger form inputs (16px font to prevent iOS zoom)
  - Stacked list item layout on mobile
  - Full-width add button
  - Increased padding and spacing
  - Larger variable hint buttons
- [x] Added ribbon icon for quick access on mobile

### Files Modified
- `styles.css` (comprehensive mobile styles)
- `src/main.ts` (ribbon icon added)

---

## Phase 9: Testing & Polish ✅

Final testing and polish.

### Tasks
- [x] Write integration tests (17 new tests in main.test.ts)
- [x] Test all user flows (covered by integration tests):
  - File creation workflow
  - Template configuration
  - Settings management
- [x] Test edge cases:
  - Empty template pattern
  - Dangerous filename characters
  - Unknown variables
  - Missing file templates
  - Nested folder paths
  - Root folder handling
- [x] User feedback via Notice (success/error messages)
- [x] Comprehensive README.md with:
  - Feature overview
  - Installation instructions
  - Usage guide with examples
  - Development setup

### Test Summary
- **98 tests passing**
- **5 test suites**
- Core logic (services, utils): 100% coverage
- Build output: 205KB (main.js), 7KB (styles.css)

### Files Created/Modified
- `src/main.test.ts` (new - integration tests)
- `README.md` (comprehensive documentation)

---

## Dependencies Between Phases

```
Phase 1 (Parser) ──────┐
                       ├──▶ Phase 7 (Integration)
Phase 2 (FileService) ─┤
                       │
Phase 3 (Modal) ───────┤
                       │
Phase 4 (Settings) ────┘

Phase 5 (Context Menu) ──▶ Depends on Phase 3, 7
Phase 6 (Commands) ──────▶ Depends on Phase 7

Phase 8 (Mobile) ────────▶ After Phase 7
Phase 9 (Testing) ───────▶ After all phases
```

**Recommended Order:** 1 → 2 → 3 → 4 → 7 → 5 → 6 → 8 → 9

---

## Type Definitions (Reference)

```typescript
interface TitleTemplate {
  id: string;
  name: string;
  titlePattern: string;
  folder: string;        // Path or "current"
  fileTemplate?: string; // Path to template file
}

interface PluginSettings {
  templates: TitleTemplate[];
  templateFolder: string;
}
```

---

## Estimated Scope

| Phase | Complexity | New Files | Modified Files |
|-------|------------|-----------|----------------|
| 1     | Low        | 2         | 0              |
| 2     | Medium     | 2         | 0              |
| 3     | Medium     | 1         | 1              |
| 4     | High       | 6         | 1              |
| 5     | Low        | 0         | 1              |
| 6     | Low        | 0         | 1              |
| 7     | Medium     | 0         | 2              |
| 8     | Low        | 0         | 2              |
| 9     | Medium     | varies    | 1              |

---

## Notes

- React components will use the `AppContext` pattern to access the Obsidian `App` instance
- File templates are read directly from the vault, no integration with core Templates plugin API
- Commands are registered once at load; template changes require plugin reload for new commands
- Mobile uses the same code paths; no platform-specific logic needed
