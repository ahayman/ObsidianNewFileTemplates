# Implementation Plan: Syntax Highlighting and Autocomplete

**Date:** 2026-01-18
**Feature:** Templater-style syntax highlighting and autocomplete
**Status:** Draft

---

## Overview

Implement syntax highlighting and autocomplete for the plugin's template syntax with the following scope:

| Syntax | Settings UI | Main Editor |
|--------|-------------|-------------|
| `{{variable}}` | Yes | No |
| `{% prompt %}` | Yes | Yes |

---

## Phase 1: Prompt Autocomplete in Main Editor

**Goal:** Implement `EditorSuggest` for prompt syntax in the main Obsidian editor.

### 1.1 Create EditorSuggest Class

- [ ] Create new file `src/editor/PromptSuggest.ts`
- [ ] Implement `PromptSuggest` class extending `EditorSuggest<PromptSuggestion>`
- [ ] Define suggestion interface:
  ```typescript
  interface PromptSuggestion {
    label: string;
    type: 'type' | 'dateFormat' | 'timeFormat' | 'syntax';
    description: string;
    insertText: string;
  }
  ```

### 1.2 Implement Trigger Detection

- [ ] Implement `onTrigger()` method with regex patterns:
  - Trigger on `{%` - show syntax templates
  - Trigger on `{% name:` - show value types
  - Trigger on `{% name:date:` - show date format presets
  - Trigger on `{% name:time:` - show time format presets
  - Trigger on `{% name:datetime:` - show combined presets
- [ ] Return `null` for `{{` patterns (variables not suggested in main editor)

### 1.3 Implement Suggestion Generation

- [ ] Import types from `src/types.ts`:
  - `VALUE_TYPE_ALIASES`
  - `DATE_FORMAT_PRESETS`
  - `TIME_FORMAT_PRESETS`
- [ ] Create suggestion lists for each context:
  - **Syntax templates**: `{% Name %}`, `{%? Optional ?%}`
  - **Value types**: `text`, `number`, `date`, `time`, `datetime`
  - **Date formats**: ISO, compact, US, EU, short, long, `format(...)`
  - **Time formats**: ISO, 24-hour, 24-compact, 12-hour, 12-padded, `format(...)`
- [ ] Filter suggestions based on query string

### 1.4 Implement Rendering

- [ ] Implement `renderSuggestion()` with:
  - Bold label
  - Muted description
  - Optional format preview (for date/time presets)
- [ ] Add CSS classes for styling in `styles.css`

### 1.5 Implement Selection

- [ ] Implement `selectSuggestion()` to insert text
- [ ] Handle cursor positioning after insertion
- [ ] Close bracket completion for `%}` where appropriate

### 1.6 Register Extension

- [ ] Update `src/main.ts`:
  - Import `PromptSuggest`
  - Add `registerEditorSuggest()` in `onload()`
- [ ] Add settings toggle for enabling/disabling autocomplete (optional)

### 1.7 Testing

- [ ] Test trigger detection in various contexts
- [ ] Test suggestion filtering
- [ ] Test insertion and cursor positioning
- [ ] Test with code blocks (should not trigger)

---

## Phase 2: Prompt Syntax Highlighting in Main Editor

**Goal:** Implement CodeMirror 6 ViewPlugin for prompt highlighting.

### 2.1 Configure Build System

- [ ] Update `esbuild.config.mjs`:
  ```javascript
  external: [
    "obsidian",
    "@codemirror/state",
    "@codemirror/view",
    "@codemirror/language"
  ]
  ```
- [ ] Verify CodeMirror types are available (already in Obsidian's types)

### 2.2 Create Highlighting Plugin

- [ ] Create new file `src/editor/PromptHighlighter.ts`
- [ ] Import CodeMirror 6 modules:
  ```typescript
  import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from "@codemirror/view";
  import { RangeSetBuilder } from "@codemirror/state";
  ```

### 2.3 Implement Decoration Builder

- [ ] Create `buildDecorations()` function:
  - Match prompt patterns: `/\{%(\??)([^%]+)(\??)\s*%\}/g`
  - Create mark decorations for:
    - Opening bracket `{%` or `{%?`
    - Prompt content (name, type, format)
    - Closing bracket `%}` or `?%}`
  - Skip matches inside code blocks
- [ ] Use `view.visibleRanges` for performance

### 2.4 Create ViewPlugin Class

- [ ] Implement plugin class:
  ```typescript
  class PromptHighlightPlugin {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }
  }
  ```
- [ ] Export with `ViewPlugin.fromClass()`:
  ```typescript
  export const promptHighlighter = ViewPlugin.fromClass(
    PromptHighlightPlugin,
    { decorations: v => v.decorations }
  );
  ```

### 2.5 Add CSS Styling

- [ ] Add to `styles.css`:
  ```css
  /* Prompt syntax highlighting */
  .cm-prompt-bracket {
    color: var(--text-success);
    font-weight: 600;
  }

  .cm-prompt-optional {
    color: var(--text-success);
    opacity: 0.8;
  }

  .cm-prompt-name {
    color: var(--text-success);
  }

  .cm-prompt-type {
    color: var(--text-muted);
  }

  .cm-prompt-format {
    color: var(--text-faint);
  }
  ```

### 2.6 Register Extension

- [ ] Update `src/main.ts`:
  - Import `promptHighlighter`
  - Use `registerEditorExtension()` in `onload()`
- [ ] Implement dynamic toggle (optional):
  ```typescript
  private highlighterExtensions: Extension[] = [];

  onload() {
    this.registerEditorExtension(this.highlighterExtensions);
    this.highlighterExtensions.push(promptHighlighter);
    this.app.workspace.updateOptions();
  }
  ```

### 2.7 Testing

- [ ] Test highlighting appears correctly
- [ ] Test with optional prompts `{%? ?%}`
- [ ] Test highlighting updates on edit
- [ ] Test code blocks are excluded
- [ ] Test performance with large files

---

## Phase 3: Enhanced Settings UI

**Goal:** Replace plain text inputs with syntax-aware editors.

### 3.1 Create CodeMirror Input Component

- [ ] Create new file `src/components/SyntaxInput.tsx`
- [ ] Create React component wrapping CodeMirror 6:
  ```typescript
  interface SyntaxInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    enableVariables?: boolean;  // Enable {{}} highlighting
    enablePrompts?: boolean;    // Enable {% %} highlighting
    singleLine?: boolean;
  }
  ```

### 3.2 Implement Basic CodeMirror Setup

- [ ] Create minimal CodeMirror instance:
  ```typescript
  import { EditorView, basicSetup } from "@codemirror/basic-setup";
  import { EditorState } from "@codemirror/state";
  ```
- [ ] Configure for single-line input (if `singleLine` prop)
- [ ] Style to match Obsidian input fields
- [ ] Handle focus/blur states

### 3.3 Implement Variable Highlighting

- [ ] Create `variableHighlighter` ViewPlugin:
  - Match pattern: `/\{\{(\w+)\}\}/g`
  - Decorations:
    - `cm-variable-bracket` for `{{` and `}}`
    - `cm-variable-name` for the variable name
    - `cm-variable-invalid` for unrecognized variables
- [ ] Only include when `enableVariables` is true

### 3.4 Implement Variable Autocomplete

- [ ] Create `variableCompletions` completion source:
  - Trigger on `{{`
  - Suggest from `SUPPORTED_VARIABLES`
  - Include descriptions for each variable
- [ ] Only include when `enableVariables` is true

### 3.5 Implement Prompt Highlighting for Settings

- [ ] Reuse `buildDecorations` logic from Phase 2
- [ ] Additional decorations for inline type/format parsing
- [ ] Only include when `enablePrompts` is true

### 3.6 Implement Prompt Autocomplete for Settings

- [ ] Create `promptCompletions` completion source:
  - Same logic as Phase 1 `PromptSuggest`
  - Adapted for CodeMirror 6 autocomplete API
- [ ] Only include when `enablePrompts` is true

### 3.7 Add Settings-Specific Styling

- [ ] Add to `styles.css`:
  ```css
  /* Settings CodeMirror input */
  .file-template-syntax-input {
    /* Match .file-template-editor-input styling */
  }

  .file-template-syntax-input .cm-editor {
    /* Override CodeMirror defaults */
  }

  /* Variable highlighting (settings only) */
  .cm-variable-bracket {
    color: var(--text-accent);
    font-weight: 600;
  }

  .cm-variable-name {
    color: var(--text-accent);
  }

  .cm-variable-invalid {
    color: var(--text-error);
    text-decoration: wavy underline;
  }
  ```

### 3.8 Integrate into TemplateEditor

- [ ] Update `src/settings/TemplateEditor.tsx`:
  - Replace title pattern `<input>` (line 262-269) with `<SyntaxInput>`
  - Configure with `enableVariables={true}` and `enablePrompts={true}`
- [ ] Update state handling for controlled component
- [ ] Ensure variable hint buttons still work (insert at cursor)

### 3.9 Testing

- [ ] Test variable highlighting and autocomplete
- [ ] Test prompt highlighting and autocomplete
- [ ] Test interaction with variable hint buttons
- [ ] Test validation error display
- [ ] Test mobile responsiveness
- [ ] Test focus management

---

## Phase 4: Polish and Integration

**Goal:** Final refinements and edge case handling.

### 4.1 Code Block Detection

- [ ] Ensure main editor highlighting skips code blocks
- [ ] Use existing `removeCodeBlocks()` logic from `promptParser.ts`
- [ ] Handle fenced code blocks (```) and inline code (`)

### 4.2 Error Highlighting

- [ ] Highlight invalid variable names in red
- [ ] Highlight unclosed brackets
- [ ] Highlight invalid prompt syntax

### 4.3 Settings Integration

- [ ] Add settings for:
  - [ ] Enable/disable main editor prompt highlighting
  - [ ] Enable/disable main editor prompt autocomplete
- [ ] Store in plugin settings

### 4.4 Documentation

- [ ] Update README with new features
- [ ] Add examples of prompt syntax
- [ ] Document keyboard shortcuts

### 4.5 Performance Optimization

- [ ] Profile highlighting with large files
- [ ] Optimize regex patterns
- [ ] Debounce decoration updates if needed

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

- [ ] Prompt autocomplete works in main editor when typing `{%`
- [ ] Prompt syntax is highlighted in main editor
- [ ] Variable autocomplete works in settings title pattern field
- [ ] Variable syntax is highlighted in settings
- [ ] Prompt autocomplete works in settings title pattern field
- [ ] No performance degradation with typical file sizes
- [ ] Works on both desktop and mobile

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
