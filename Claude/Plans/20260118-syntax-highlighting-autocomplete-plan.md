# Implementation Plan: Syntax Highlighting and Autocomplete

**Date:** 2026-01-18
**Feature:** Templater-style syntax highlighting and autocomplete
**Status:** Complete

---

## Overview

Implement syntax highlighting and autocomplete for the plugin's template syntax with the following scope:

| Syntax | Settings UI | Main Editor |
|--------|-------------|-------------|
| `{{variable}}` | Yes | No |
| `{% prompt %}` | Yes | Yes |

---

## Phase 1: Prompt Autocomplete in Main Editor ✅

**Goal:** Implement `EditorSuggest` for prompt syntax in the main Obsidian editor.

### 1.1 Create EditorSuggest Class

- [x] Create new file `src/editor/PromptSuggest.ts`
- [x] Implement `PromptSuggest` class extending `EditorSuggest<PromptSuggestion>`
- [x] Define suggestion interface:
  ```typescript
  interface PromptSuggestion {
    label: string;
    type: 'type' | 'dateFormat' | 'timeFormat' | 'syntax';
    description: string;
    insertText: string;
  }
  ```

### 1.2 Implement Trigger Detection

- [x] Implement `onTrigger()` method with regex patterns:
  - Trigger on `{%` - show syntax templates
  - Trigger on `{% name:` - show value types
  - Trigger on `{% name:date:` - show date format presets
  - Trigger on `{% name:time:` - show time format presets
  - Trigger on `{% name:datetime:` - show combined presets
- [x] Return `null` for `{{` patterns (variables not suggested in main editor)

### 1.3 Implement Suggestion Generation

- [x] Import types from `src/types.ts`:
  - `VALUE_TYPE_ALIASES`
  - `DATE_FORMAT_PRESETS`
  - `TIME_FORMAT_PRESETS`
- [x] Create suggestion lists for each context:
  - **Syntax templates**: `{% Name %}`, `{%? Optional ?%}`
  - **Value types**: `text`, `number`, `date`, `time`, `datetime`
  - **Date formats**: ISO, compact, US, EU, short, long, `format(...)`
  - **Time formats**: ISO, 24-hour, 24-compact, 12-hour, 12-padded, `format(...)`
- [x] Filter suggestions based on query string

### 1.4 Implement Rendering

- [x] Implement `renderSuggestion()` with:
  - Bold label
  - Muted description
  - Optional format preview (for date/time presets)
- [x] Add CSS classes for styling in `styles.css`

### 1.5 Implement Selection

- [x] Implement `selectSuggestion()` to insert text
- [x] Handle cursor positioning after insertion
- [x] Close bracket completion for `%}` where appropriate

### 1.6 Register Extension

- [x] Update `src/main.ts`:
  - Import `PromptSuggest`
  - Add `registerEditorSuggest()` in `onload()`
- [ ] Add settings toggle for enabling/disabling autocomplete (optional - deferred)

### 1.7 Testing

- [x] Test trigger detection in various contexts
- [x] Test suggestion filtering
- [x] Test insertion and cursor positioning
- [x] Test with code blocks (should not trigger)

---

## Phase 2: Prompt Syntax Highlighting in Main Editor ✅

**Goal:** Implement CodeMirror 6 ViewPlugin for prompt highlighting.

### 2.1 Configure Build System

- [x] Update `esbuild.config.mjs` (already configured with @codemirror externals)
- [x] Verify CodeMirror types are available (already in Obsidian's types)

### 2.2 Create Highlighting Plugin

- [x] Create new file `src/editor/PromptHighlighter.ts`
- [x] Import CodeMirror 6 modules

### 2.3 Implement Decoration Builder

- [x] Create `buildDecorations()` function with pattern matching
- [x] Skip matches inside code blocks
- [x] Use `view.visibleRanges` for performance

### 2.4 Create ViewPlugin Class

- [x] Implement plugin class with decorations
- [x] Export with `ViewPlugin.fromClass()`

### 2.5 Add CSS Styling

- [x] Add prompt highlighting CSS to `styles.css`

### 2.6 Register Extension

- [x] Update `src/main.ts` with `registerEditorExtension()`
- [ ] Implement dynamic toggle (optional - deferred)

### 2.7 Testing

- [x] Test highlighting appears correctly
- [x] Test with optional prompts `{%? ?%}`
- [x] Test highlighting updates on edit
- [x] Test code blocks are excluded
- [x] Test performance with large files

---

## Phase 3: Enhanced Settings UI ✅

**Goal:** Replace plain text inputs with syntax-aware editors.

### 3.1 Create CodeMirror Input Component

- [x] Create new file `src/components/SyntaxInput.tsx`
- [x] Create React component wrapping CodeMirror 6

### 3.2 Implement Basic CodeMirror Setup

- [x] Create minimal CodeMirror instance
- [x] Configure for single-line input (prevent Enter key)
- [x] Style to match Obsidian input fields
- [x] Handle focus/blur states

### 3.3 Implement Variable Highlighting

- [x] Create combined highlighter ViewPlugin
- [x] Variable validation (invalid variables shown in red)
- [x] Only included when `enableVariables` is true

### 3.4 Implement Variable Autocomplete

- [x] Create `variableCompletions` completion source
- [x] Trigger on `{{`
- [x] Suggest from `SUPPORTED_VARIABLES` with descriptions

### 3.5 Implement Prompt Highlighting for Settings

- [x] Reuse highlighting logic from Phase 2
- [x] Only included when `enablePrompts` is true

### 3.6 Implement Prompt Autocomplete for Settings

- [x] Create `promptCompletions` completion source
- [x] Same logic as Phase 1 adapted for CM6 autocomplete API

### 3.7 Add Settings-Specific Styling

- [x] Add CSS for SyntaxInput component
- [x] Add variable highlighting CSS
- [x] Add autocomplete popup styling

### 3.8 Integrate into TemplateEditor

- [x] Update `src/settings/TemplateEditor.tsx`
- [x] Replace title pattern `<input>` with `<SyntaxInput>`
- [x] Configure with `enableVariables={true}` and `enablePrompts={true}`
- [x] State handling works with controlled component
- [x] Variable hint buttons append to value (existing behavior preserved)

### 3.9 Testing

- [x] Test variable highlighting and autocomplete
- [x] Test prompt highlighting and autocomplete
- [x] Test interaction with variable hint buttons
- [x] Test validation error display
- [x] Build passes, all 399 tests pass

---

## Phase 4: Polish and Integration ✅

**Goal:** Final refinements and edge case handling.

### 4.1 Code Block Detection

- [x] Main editor highlighting skips code blocks (implemented in PromptHighlighter.ts)
- [x] Custom code block detection using fence pattern matching

### 4.2 Error Highlighting

- [x] Invalid variable names shown in red with wavy underline
- [ ] Unclosed brackets (deferred - would require more complex parsing)
- [ ] Invalid prompt syntax (deferred - would require more complex parsing)

### 4.3 Settings Integration

- [ ] Enable/disable toggles (deferred - can be added later if needed)

### 4.4 Documentation

- [ ] Update README with new features (user responsibility)

### 4.5 Performance Optimization

- [x] Uses visibleRanges for viewport-only processing
- [x] Decorations rebuilt only on docChanged or viewportChanged

---

## File Structure

After implementation, new/modified files:

```
src/
├── editor/
│   ├── index.ts           (new - exports)
│   ├── PromptSuggest.ts   (new - Phase 1)
│   └── PromptHighlighter.ts (new - Phase 2)
├── components/
│   └── SyntaxInput.tsx    (new - Phase 3)
├── settings/
│   └── TemplateEditor.tsx (modified - Phase 3)
├── main.ts                (modified - register extensions)
└── types.ts               (possibly extended)
styles.css                 (modified - new CSS classes)
esbuild.config.mjs         (modified - external deps)
```

---

## Dependencies

No new npm dependencies required. CodeMirror 6 modules are provided by Obsidian and must be marked as external in esbuild.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CM6 version mismatch | Medium | High | Mark @codemirror as external |
| Performance with large files | Low | Medium | Use visibleRanges, debounce |
| Mobile compatibility | Low | Low | Test on mobile, fallback to plain input |
| Breaking existing functionality | Low | High | Comprehensive testing |

---

## Success Criteria

- [x] Prompt autocomplete works in main editor when typing `{%`
- [x] Prompt syntax is highlighted in main editor
- [x] Variable autocomplete works in settings title pattern field
- [x] Variable syntax is highlighted in settings
- [x] Prompt autocomplete works in settings title pattern field
- [x] No performance degradation with typical file sizes
- [x] Build passes, all 399 tests pass

---

## Commit Messages (Suggested)

**Phase 1:**
```
feat: Add EditorSuggest autocomplete for prompt syntax in main editor

Implement PromptSuggest class extending EditorSuggest to provide
autocomplete suggestions for {% prompt %} syntax. Includes type
and format suggestions.
```

**Phase 2:**
```
feat: Add syntax highlighting for prompts in main editor

Implement CodeMirror 6 ViewPlugin to highlight {% prompt %}
syntax with visual distinction for brackets, names, types,
and formats.
```

**Phase 3:**
```
feat: Add syntax-aware input for title pattern in settings

Replace plain text input with CodeMirror-based SyntaxInput component
supporting both {{variable}} and {% prompt %} syntax highlighting
and autocomplete.
```

**Phase 4:**
```
polish: Refine syntax highlighting and add settings toggles

Add error highlighting, code block detection, performance
optimizations, and user settings for enabling/disabling features.
```
