# Plan: Template Variable Processing

## Overview

Update the plugin to process template variables the same way Obsidian's core Templates plugin does, including:
- Using moment.js for date/time formatting
- Supporting custom format syntax `{{date:FORMAT}}` and `{{time:FORMAT}}`
- Reading the user's date/time format settings from the Templates plugin

---

## Phase 1: Create Templates Integration Utility ✅

Create a utility to access the Templates plugin settings and process variables.

### Tasks
- [x] Create `src/utils/templatesIntegration.ts`
- [x] Implement `getTemplatesSettings(app)` to get user's date/time formats
- [x] Handle case when Templates plugin is disabled (use defaults)
- [x] Export helper types

### Files Created
- `src/utils/templatesIntegration.ts`

---

## Phase 2: Update FileService Template Processing ✅

Update the `processFileTemplate` method to use moment.js and support custom formats.

### Tasks
- [x] Import `moment` from obsidian
- [x] Update `processFileTemplate` to use moment.js formatting
- [x] Support `{{date}}` with configured format
- [x] Support `{{date:CUSTOM_FORMAT}}` syntax
- [x] Support `{{time}}` with configured format
- [x] Support `{{time:CUSTOM_FORMAT}}` syntax
- [x] Keep `{{title}}` variable support
- [x] Keep backward compatibility with existing variables

### Files Modified
- `src/services/FileService.ts`
- `src/utils/index.ts`

---

## Phase 3: Update Main Plugin ✅

FileService already had App instance access.

### Tasks
- [x] Update FileService to accept App and use templatesIntegration
- [x] Ensure template processing uses user's configured formats

---

## Phase 4: Update Tests ✅

Update tests to handle the new template processing.

### Tasks
- [x] Update FileService tests for new date/time format handling
- [x] Add tests for custom format syntax
- [x] Verify backward compatibility
- [x] Add mock for moment.js in obsidian mock

### Files Modified
- `src/services/FileService.test.ts`
- `src/main.test.ts`
- `__mocks__/obsidian.ts`

### Test Results
- 102 tests passing
- Build successful

---

## Template Variable Reference

### Supported Variables (after implementation)

| Variable | Description | Example |
|----------|-------------|---------|
| `{{title}}` | Filename (without extension) | `My Note` |
| `{{date}}` | Date in user's configured format | `2026-01-14` |
| `{{date:FORMAT}}` | Date with custom moment.js format | `{{date:MMMM Do, YYYY}}` → `January 14th, 2026` |
| `{{time}}` | Time in user's configured format | `14:30` |
| `{{time:FORMAT}}` | Time with custom moment.js format | `{{time:h:mm A}}` → `2:30 PM` |

### Format Examples

```
{{date:YYYY-MM-DD}}        → 2026-01-14
{{date:MMMM D, YYYY}}      → January 14, 2026
{{date:dddd}}              → Tuesday
{{time:HH:mm:ss}}          → 14:30:45
{{time:h:mm A}}            → 2:30 PM
```

---

## Notes

- The `app.internalPlugins` API is undocumented; always use fallback defaults
- moment.js is bundled with Obsidian and available via `import { moment } from 'obsidian'`
- Default formats: date = `YYYY-MM-DD`, time = `HH:mm`
