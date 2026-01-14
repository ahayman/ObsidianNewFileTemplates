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

## Phase 1: Title Template Parser

Create a utility to parse title patterns and substitute variables.

### Tasks
- [ ] Create `src/utils/templateParser.ts`
- [ ] Implement supported variables:
  - `{{date}}` - Current date (YYYY-MM-DD)
  - `{{time}}` - Current time (HH-mm-ss, file-safe format)
  - `{{datetime}}` - Combined date and time
  - `{{timestamp}}` - Unix timestamp
  - `{{year}}` - Current year (YYYY)
  - `{{month}}` - Current month (MM)
  - `{{day}}` - Current day (DD)
- [ ] Create `parseTemplate(pattern: string): string` function
- [ ] Handle edge cases (invalid patterns, missing variables)
- [ ] Write unit tests for template parser

### Files to Create/Modify
- `src/utils/templateParser.ts` (new)
- `src/utils/templateParser.test.ts` (new)

---

## Phase 2: File Creation Service

Create a service to handle file creation with optional template application.

### Tasks
- [ ] Create `src/services/FileService.ts`
- [ ] Implement `createFile(folder: string, filename: string, content?: string): Promise<TFile>`
- [ ] Implement `getTemplateContent(templatePath: string): Promise<string>`
- [ ] Implement `processFileTemplate(content: string, filename: string): string`
  - Support basic variables in file templates: `{{title}}`, `{{date}}`, `{{time}}`
- [ ] Implement `getCurrentFolder(): string` to get active file's folder
- [ ] Implement `ensureFolderExists(path: string): Promise<void>`
- [ ] Handle file name conflicts (append number if file exists)
- [ ] Write unit tests for file service

### Files to Create/Modify
- `src/services/FileService.ts` (new)
- `src/services/FileService.test.ts` (new)

---

## Phase 3: Template Selection Modal

Create a fuzzy search modal for selecting templates.

### Tasks
- [ ] Create `src/modals/TemplateSelectModal.ts`
- [ ] Extend `FuzzySuggestModal<TitleTemplate>`
- [ ] Implement `getItems()` - return all templates from settings
- [ ] Implement `getItemText()` - return template name
- [ ] Implement `onChooseItem()` - trigger file creation
- [ ] Implement custom `renderSuggestion()` to show:
  - Template name
  - Target folder
  - File template (if set)
- [ ] Add support for passing a target folder override (for context menu)
- [ ] Style the modal suggestions

### Files to Create/Modify
- `src/modals/TemplateSelectModal.ts` (new)
- `styles.css` (update)

---

## Phase 4: Settings Tab (React)

Create the settings UI for managing title templates.

### Tasks
- [ ] Create `src/settings/SettingsTab.tsx` - main settings tab component
- [ ] Create `src/settings/TemplateList.tsx` - list of templates with add/edit/delete
- [ ] Create `src/settings/TemplateEditor.tsx` - form for editing a single template
- [ ] Create `src/settings/FolderSuggest.tsx` - folder picker component
- [ ] Create `src/settings/FileSuggest.tsx` - file picker for template files
- [ ] Implement template CRUD operations:
  - Add new template
  - Edit existing template
  - Delete template
  - Reorder templates (optional)
- [ ] Settings fields per template:
  - Name (required)
  - Title Pattern (required, with variable hints)
  - Target Folder (required, with "Current Folder" option)
  - File Template (optional, file picker)
- [ ] Add validation for required fields
- [ ] Add preview of generated title
- [ ] Style the settings components
- [ ] Write tests for settings components

### Files to Create/Modify
- `src/settings/SettingsTab.tsx` (new)
- `src/settings/TemplateList.tsx` (new)
- `src/settings/TemplateEditor.tsx` (new)
- `src/settings/FolderSuggest.tsx` (new)
- `src/settings/FileSuggest.tsx` (new)
- `src/settings/index.ts` (new)
- `styles.css` (update)

---

## Phase 5: Context Menu Integration

Add "New Templated File" option to folder right-click menu.

### Tasks
- [ ] Register `file-menu` event in `main.ts`
- [ ] Check if clicked item is a `TFolder`
- [ ] Add menu item "New Templated File"
- [ ] Open template selection modal with folder override
- [ ] Add appropriate icon

### Files to Create/Modify
- `src/main.ts` (update)

---

## Phase 6: Command Registration

Register commands for the command palette.

### Tasks
- [ ] Register main command: "Create New Templated File"
  - Opens template selection modal
- [ ] Register per-template commands: "Create a new {Template Name} File"
  - Directly creates file using that template
- [ ] Implement dynamic command re-registration when templates change
- [ ] Handle command cleanup on plugin unload
- [ ] Ensure commands work on mobile

### Files to Create/Modify
- `src/main.ts` (update)

---

## Phase 7: Main Plugin Integration

Wire everything together in the main plugin file.

### Tasks
- [ ] Initialize FileService in `onload()`
- [ ] Register SettingsTab
- [ ] Implement `openTemplateModal(targetFolder?: TFolder)`
- [ ] Implement `createFileFromTemplate(templateId: string, targetFolder?: TFolder)`
- [ ] Handle settings changes (re-register commands)
- [ ] Add error handling and user notifications
- [ ] Ensure proper cleanup in `onunload()`

### Files to Create/Modify
- `src/main.ts` (update)
- `src/types.ts` (update if needed)

---

## Phase 8: Mobile Optimization

Ensure the plugin works well on mobile devices.

### Tasks
- [ ] Test modal on mobile viewport sizes
- [ ] Ensure touch targets are appropriately sized (44x44px minimum)
- [ ] Test context menu (long-press on folder)
- [ ] Test command palette on mobile
- [ ] Adjust styles for mobile if needed
- [ ] Add ribbon icon for quick access (optional)

### Files to Create/Modify
- `styles.css` (update)
- `src/main.ts` (optional ribbon icon)

---

## Phase 9: Testing & Polish

Final testing and polish.

### Tasks
- [ ] Write integration tests
- [ ] Test all user flows:
  - Create template in settings
  - Use command palette to create file
  - Use context menu to create file
  - Use direct template command
- [ ] Test edge cases:
  - No templates defined
  - Invalid folder paths
  - File name conflicts
  - Missing file templates
- [ ] Add helpful notices/toasts for user feedback
- [ ] Review and update README.md
- [ ] Manual testing in Obsidian test vault

### Files to Create/Modify
- Various test files
- `README.md` (update)

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
