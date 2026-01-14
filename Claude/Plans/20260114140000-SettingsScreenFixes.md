# Plan: Settings Screen Fixes

## Overview

Fix three issues identified in the settings screen:
1. CSS issue causing repeating diamond icons in folder/file selects
2. File Template dropdown not filtering to Template Folder
3. Both folder and file selection need search functionality

---

## Phase 1: Fix CSS Icon Repetition ✅

The issue is caused by Obsidian's `dropdown` class applying a background image that conflicts with native select styling.

### Tasks
- [x] Remove `dropdown` class from select elements in TemplateEditor
- [x] Ensure `.file-template-editor-select` styles properly override any inherited styles
- [x] Add `background-image: none` to explicitly remove any icon background

### Files Modified
- `src/settings/TemplateEditor.tsx`
- `styles.css`

---

## Phase 2: Filter File Templates by Template Folder ✅

The file template dropdown should only show files from the configured Template Folder.

### Tasks
- [x] Pass `templateFolder` from SettingsTab → TemplateList → TemplateEditor
- [x] Filter templateFiles list based on templateFolder setting
- [x] Show all files if templateFolder is empty

### Files Modified
- `src/settings/SettingsTab.tsx` (pass templateFolder prop)
- `src/settings/TemplateList.tsx` (pass templateFolder prop)
- `src/settings/TemplateEditor.tsx` (filter files based on prop)

---

## Phase 3: Implement Searchable Selects ✅

Replace native select elements with searchable dropdown components that allow users to filter through large lists.

### Approach
Created a `SearchableSelect` component that:
- Shows an input field for typing/searching
- Displays filtered suggestions in a dropdown
- Supports keyboard navigation (up/down/enter/escape)
- Works on mobile with proper touch handling

### Tasks
- [x] Create `src/settings/SearchableSelect.tsx` component
- [x] Replace folder select with SearchableSelect
- [x] Replace file template select with SearchableSelect
- [x] Add styles for the searchable select dropdown
- [x] Ensure mobile-friendly touch targets

### Component API
```typescript
interface SearchableSelectProps {
  id: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  onChange: (value: string) => void;
}
```

### Files Created
- `src/settings/SearchableSelect.tsx`

### Files Modified
- `src/settings/TemplateEditor.tsx`
- `styles.css`

---

## Phase 4: Testing ✅

### Tasks
- [x] Test CSS fix displays correctly
- [x] Test file template filtering with various templateFolder values
- [x] Test searchable select keyboard navigation
- [x] Test searchable select on mobile (touch)
- [x] Run existing tests to ensure no regressions

### Test Results
- 98 tests passing
- Build successful

---

## Dependencies

```
Phase 1 (CSS Fix) ────────┐
                          ├──▶ Phase 4 (Testing)
Phase 2 (Filtering) ──────┤
                          │
Phase 3 (Searchable) ─────┘
```

Phases 1, 2, and 3 can be done in parallel, then Phase 4 verifies everything.

---

## Type Updates Needed

```typescript
// TemplateList props
interface TemplateListProps {
  templates: TitleTemplate[];
  templateFolder: string;  // NEW
  onUpdate: (templates: TitleTemplate[]) => void;
}

// TemplateEditor props
interface TemplateEditorProps {
  template?: TitleTemplate;
  templateFolder: string;  // NEW
  onSave: (template: TitleTemplate) => void;
  onCancel: () => void;
}
```
