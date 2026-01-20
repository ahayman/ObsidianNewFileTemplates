# Intelligent Bracket Closure Feature Plan

## Overview

Add intelligent bracket auto-closure and auto-removal functionality to both the main Obsidian editor and the Settings screen Title formatter input. This feature will automatically insert closing brackets when opening brackets are typed, and remove closing brackets when opening brackets are deleted.

## Requirements Summary

1. **Auto-close `{%` and `{%?`** - When typed, add a space and closing brackets (`%}` or `?%}`)
2. **Auto-delete closing prompt brackets** - When deleting `{%` or `{%?`, also delete the closing brackets if only spaces exist between cursor and closing brackets
3. **Auto-close parentheses in prompts** - When typing `(` within prompt syntax, auto-insert `)`
4. **Auto-close `{{` in Settings Title formatter** - Same behavior as parentheses for double curly brackets
5. **Settings toggle** - Add setting to enable/disable auto-closure (default: on)

## Technical Analysis

### Components to Modify

1. **`src/components/SyntaxInput.tsx`** - Settings Title formatter (CodeMirror 6 based)
2. **`src/editor/PromptSuggest.ts`** or new file - Main editor bracket handling
3. **`src/types.ts`** - Add new setting type
4. **`src/main.ts`** - Default settings
5. **`src/settings/SettingsTab.tsx`** - Add toggle UI

### Implementation Approach

The bracket closure logic will be implemented as CodeMirror 6 extensions (for SyntaxInput) and Obsidian Editor event handlers (for main editor).

---

## Phase 1: Settings Infrastructure

- [x] Add `autoBracketClosure: boolean` to `PluginSettings` interface in `src/types.ts`
- [x] Add default value `autoBracketClosure: true` in `src/main.ts` (DEFAULT_SETTINGS)
- [x] Add settings toggle UI in `src/settings/SettingsTab.tsx`
  - [x] Create a new Setting with name "Auto-close brackets"
  - [x] Add description explaining the feature
  - [x] Add toggle control
  - [x] Wire up to plugin settings save

---

## Phase 2: SyntaxInput Auto-Closure (Settings Title Formatter)

### 2.1 Create Bracket Closure Extension

- [x] Create new file `src/components/bracketClosure.ts` for reusable CodeMirror extension
- [x] Implement `createBracketClosureExtension(options)` function
  - [x] Accept options for which bracket types to handle
  - [x] Return CodeMirror `Extension` type

### 2.2 Implement Auto-Insert Logic

- [x] Handle `{%` insertion → insert ` %}` after cursor
- [x] Handle `{%?` insertion → insert ` ?%}` after cursor
- [x] Handle `{{` insertion → insert `}}` after cursor (Settings only)
- [x] Handle `(` insertion within prompt syntax → insert `)` after cursor
- [x] Use CodeMirror `inputHandler` facet or `keymap` extension

### 2.3 Implement Auto-Delete Logic

- [x] Detect backspace on `{%` with matching `%}` ahead (only spaces between)
- [x] Detect backspace on `{%?` with matching `?%}` ahead
- [x] Detect backspace on `(` with matching `)` immediately after
- [x] Detect backspace on `{{` with matching `}}` immediately after (Settings only)
- [x] Use CodeMirror `keymap` extension for Delete/Backspace handling

### 2.4 Integrate with SyntaxInput

- [x] Import bracket closure extension in `SyntaxInput.tsx`
- [x] Add prop to enable/disable feature based on settings
- [x] Add prop to enable `{{}}` closure (for Settings variant)
- [x] Add extension to CodeMirror configuration conditionally

---

## Phase 3: Main Editor Auto-Closure

### 3.1 Create Editor Extension

- [x] Create new file `src/editor/BracketClosure.ts`
- [x] Implement Obsidian `EditorSuggest` subclass or use `editorExtension` API
- [x] Register extension in `main.ts` plugin initialization

### 3.2 Implement Auto-Insert Logic (Main Editor)

- [x] Handle `{%` insertion → insert ` %}`
- [x] Handle `{%?` insertion → insert ` ?%}`
- [x] Handle `(` insertion within prompt syntax → insert `)`
- [x] Note: `{{` auto-closure is NOT enabled for main editor (only Settings)

### 3.3 Implement Auto-Delete Logic (Main Editor)

- [x] Handle backspace deletion with same rules as SyntaxInput
- [x] Ensure code block detection to avoid interference

### 3.4 Context Detection

- [x] Implement helper to detect if cursor is within prompt syntax
- [x] Reuse or extend existing prompt parsing utilities from `promptParser.ts`

---

## Phase 4: Testing & Polish

- [x] Build succeeds without errors
- [x] Fixed type test to include new setting property

---

## Phase 5: Documentation & Cleanup

- [x] Add inline code comments for complex logic
- [x] Ensure consistent code style with existing codebase
- [x] Create commit message

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/types.ts` | Modify | Add `autoBracketClosure` to settings interface |
| `src/types.test.ts` | Modify | Add test for new setting |
| `src/main.ts` | Modify | Register editor extension conditionally |
| `src/settings/SettingsTab.tsx` | Modify | Add toggle UI for auto-closure setting |
| `src/settings/TemplateList.tsx` | Modify | Pass autoBracketClosure prop |
| `src/settings/TemplateEditor.tsx` | Modify | Pass autoBracketClosure prop to SyntaxInput |
| `src/components/bracketClosure.ts` | Create | CodeMirror bracket closure extension |
| `src/components/index.ts` | Modify | Export bracket closure extension |
| `src/components/SyntaxInput.tsx` | Modify | Integrate bracket closure extension |
| `src/editor/BracketClosure.ts` | Create | Main editor bracket closure handler |
| `src/editor/index.ts` | Modify | Export editor bracket closure extension |

---

## Commit Message

```
feat: Add intelligent bracket auto-closure for prompts

- Auto-insert closing brackets when typing {%, {%?, {{, or (
- Auto-delete closing brackets when deleting opening brackets
- Add settings toggle to enable/disable auto-closure (default: on)
- Apply {{ }} auto-closure only in Settings Title formatter
- Apply () auto-closure only within prompt syntax context
```
