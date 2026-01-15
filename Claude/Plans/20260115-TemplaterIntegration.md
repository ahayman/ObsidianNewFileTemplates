# Plan: Templater Plugin Integration

## Status: COMPLETED ✓

## Overview

Integrate with the Templater plugin so that when our plugin creates a new note from a template containing Templater syntax (`<% ... %>`), the Templater plugin processes those commands automatically.

## Current State

- **File creation flow**: `createFileFromTemplate()` in `main.ts` → `FileService.createFile()` → `vault.create()` → opens file
- **Template processing**: Currently only processes our own variables (`{{date}}`, `{{title}}`, etc.) via `processFileTemplate()`
- **No Templater awareness**: The plugin doesn't detect or interact with Templater

## Goal

1. Detect if Templater is installed and enabled
2. Check if selected file templates contain Templater syntax
3. Provide per-template settings for Templater processing
4. Show appropriate UI based on Templater availability and template content
5. Process templates with Templater when enabled

---

## Phase 1: Create Templater Integration Service ✓

Create a dedicated service to handle all Templater-related functionality.

- [x] Create `/src/services/TemplaterService.ts` with the following functions:
  - [x] `getTemplaterPlugin(app: App)` - Returns the Templater plugin instance or null
  - [x] `isTemplaterEnabled(app: App): boolean` - Check if Templater is installed and enabled
  - [x] `hasTemplaterSyntax(content: string): boolean` - Detect `<% ... %>` patterns in a string
  - [x] `doesTemplaterAutoProcess(app: App): boolean` - Check if Templater's `trigger_on_file_creation` is enabled
  - [x] `processTemplaterInFile(app: App, file: TFile): Promise<void>` - Call Templater's API to process a file
  - [x] `checkFileForTemplaterSyntax(app: App, filePath: string): Promise<boolean>` - Read a file and check for Templater syntax
  - [x] `getTemplaterStatus(app: App, fileTemplatePath?: string): Promise<TemplaterStatus>` - Helper for UI

- [x] Add TypeScript interface for Templater plugin structure:
  ```typescript
  interface TemplaterPluginInstance {
      templater: {
          overwrite_file_commands(file: TFile): Promise<void>;
          parse_template(config: { target_file: TFile; run_mode: number }, content: string): Promise<string>;
      };
      settings: {
          trigger_on_file_creation: boolean;
      };
  }
  ```

---

## Phase 2: Update Types for Per-Template Settings ✓

Add Templater-specific settings to each Title Template.

- [x] Update `TitleTemplate` interface in `/src/types.ts`:
  ```typescript
  interface TitleTemplate {
      id: string;
      name: string;
      titlePattern: string;
      folder: string;
      fileTemplate?: string;
      useTemplater?: boolean;  // NEW: Process this template with Templater
  }
  ```

- [x] Default `useTemplater` to `true` when:
  - A file template is selected AND
  - The file template contains Templater syntax AND
  - Templater is installed but does NOT auto-process on file creation

---

## Phase 3: Update Template Editor UI ✓

Modify the TemplateEditor component to show Templater options based on context.

- [x] Add state to track Templater status in `TemplateEditor.tsx`:
  - [x] `templaterStatus.templaterAvailable` - Is Templater plugin installed?
  - [x] `templaterStatus.templaterAutoProcesses` - Does Templater auto-process on file creation?
  - [x] `templaterStatus.hasTemplaterSyntax` - Does selected file template have Templater syntax?

- [x] When file template selection changes:
  - [x] Check if selected file contains Templater syntax using `getTemplaterStatus()`
  - [x] Update `templaterStatus` state

- [x] Render Templater UI section conditionally (only when file template is selected):

  **Scenario A: Has Templater syntax + Templater available + NO auto-process**
  - [x] Show toggle: "Process template with Templater"
  - [x] Toggle controls `useTemplater` setting on the template
  - [x] Default to enabled

  **Scenario B: Has Templater syntax + Templater available + auto-process enabled**
  - [x] Show info message: "Automatically processed by Templater"
  - [x] No toggle needed (Templater handles it)
  - [x] Style as informational (not a warning)

  **Scenario C: Has Templater syntax + Templater NOT available**
  - [x] Show warning message: "This template contains Templater syntax but the Templater plugin is not installed"
  - [x] Style as warning (yellow/orange)

  **Scenario D: No Templater syntax**
  - [x] Show nothing - no Templater UI elements

- [x] Add appropriate styling in `styles.css` for:
  - [x] Info message style (for auto-process message)
  - [x] Warning message style (for missing Templater)
  - [x] Toggle container style

---

## Phase 4: Integrate into File Creation Flow ✓

Modify the file creation process to call Templater when appropriate.

- [x] Update `main.ts:createFileFromTemplate()` to:
  - [x] Check if the template has `useTemplater: true`
  - [x] Check if Templater is available and does NOT auto-process
  - [x] If both conditions met, call `processTemplaterInFile()` after file creation
  - [x] Ensure proper ordering: create file → process Templater → open file

- [x] Handle timing considerations:
  - [x] Templater needs the file to exist before processing
  - [x] Wait for Templater processing to complete before opening file

- [x] Processing logic:
  ```typescript
  // After file creation
  if (template.useTemplater && isTemplaterEnabled(app) && !doesTemplaterAutoProcess(app)) {
      await processTemplaterInFile(app, file);
  }
  // Then open file
  ```

---

## Phase 5: Error Handling and User Feedback ✓

Add robust error handling and user notifications.

- [x] Handle Templater processing errors:
  - [x] Wrap Templater calls in try-catch
  - [x] Show user-friendly error notice if processing fails
  - [x] Log detailed error for debugging
  - [x] Still open the file even if Templater processing fails

- [x] Handle edge cases:
  - [x] File template deleted after being selected → graceful handling
  - [x] Templater plugin disabled after template configured → skip processing silently
  - [x] Defensive checks for test environments

---

## Phase 6: Testing and Documentation ✓

Verify the integration works correctly in various scenarios.

- [x] Build passes: `yarn build` succeeds
- [x] All tests pass: 124 tests passing

---

## Implementation Notes

### Key Code Locations

| File | Purpose |
|------|---------|
| `/src/services/TemplaterService.ts` | New file - Templater integration logic |
| `/src/types.ts` | Add `useTemplater` to `TitleTemplate` interface |
| `/src/settings/TemplateEditor.tsx` | Conditional Templater UI |
| `/src/main.ts` | `createFileFromTemplate()` - call Templater processing |
| `/styles.css` | Styles for info/warning messages |

### Templater API Reference

```typescript
// Get Templater plugin
const templater = app.plugins.plugins["templater-obsidian"];

// Check if installed
const isInstalled = templater !== undefined;

// Check auto-process setting
const autoProcesses = templater?.settings?.trigger_on_file_creation;

// Process file
await templater.templater.overwrite_file_commands(file);
```

### Templater Syntax Detection

```typescript
const TEMPLATER_PATTERN = /<%[\s\S]*?%>/;
const hasTemplater = TEMPLATER_PATTERN.test(content);
```

### UI Decision Tree

```
File Template Selected?
├── NO → Show nothing
└── YES → Check for Templater syntax
    ├── NO syntax → Show nothing
    └── HAS syntax → Check Templater installed
        ├── NOT installed → Show warning
        └── IS installed → Check auto-process
            ├── Auto-processes → Show "Automatically processed by Templater"
            └── Does NOT auto-process → Show toggle for useTemplater
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Templater API changes in future versions | Use try-catch, gracefully degrade |
| Double processing if Templater auto-processes | Check `trigger_on_file_creation` before processing |
| Timing issues with file creation | Ensure file exists before calling Templater |
| TypeScript errors (no Templater types) | Use custom interfaces with `@ts-ignore` where needed |
| Performance on large template files | Syntax check is simple regex, should be fast |
| File template deleted after selection | Handle missing file gracefully in editor and creation |

---

## Success Criteria

1. ✓ Template Editor shows appropriate UI based on file template content and Templater availability
2. ✓ Per-template `useTemplater` setting is saved and respected
3. ✓ Files are processed with Templater only when explicitly enabled and Templater won't auto-process
4. ✓ No double processing when Templater's auto-trigger is enabled
5. ✓ Clear warnings when Templater syntax detected but Templater unavailable
6. ✓ Graceful error handling if Templater processing fails
