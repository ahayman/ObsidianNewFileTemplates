# Settings Autocomplete Feature Parity Plan

## Overview
Update the `SyntaxInput.tsx` component's CodeMirror autocomplete to match the main editor's `PromptSuggest.ts` autocomplete features, including live Moment.js preview and format examples.

## Current State

### Main Editor (PromptSuggest.ts) - Has:
1. **Live format preview** - Non-selectable first item showing actual formatted output when inside `format(...)`
2. **Format preset examples** - Shows live output (e.g., "2026-01-20") alongside format presets
3. **Token examples** - Displays example in a separate column
4. **Two-column layout** - Label + Example columns in suggestion rendering
5. **Visual distinction** - Preview items have accent-colored styling with left border

### Settings Screen (SyntaxInput.tsx) - Missing:
1. No live format preview
2. Format presets show format string, not live example
3. Token examples only in detail text, no visual separation
4. No custom rendering for suggestions
5. No special preview styling

## Implementation Plan

### Phase 1: Add Custom Completion Rendering
- [x] Import `Completion` type from `@codemirror/autocomplete`
- [x] Create custom completion info function that returns DOM elements
- [x] Add `info` property to completion options for rich rendering
- [x] Define completion item structure with `example` and `isPreview` fields

### Phase 2: Add Live Format Preview
- [x] Import `moment` from `obsidian` in SyntaxInput.tsx
- [x] Update `promptCompletions` to detect format content inside `format(...)`
- [x] Generate live preview using `moment().format(formatContent)`
- [x] Add preview item as first completion option (non-selectable via `apply: ""`)
- [x] Mark preview items with a custom class for styling

### Phase 3: Add Format Preset Examples
- [x] Create `getDateExample()` function (port from PromptSuggest.ts)
- [x] Create `getTimeExample()` function (port from PromptSuggest.ts)
- [x] Update date format preset completions to include live example
- [x] Update time format preset completions to include live example
- [x] Display example in the completion info panel

### Phase 4: Enhance Token Display
- [x] Update token completions to include example in structured format
- [x] Ensure `getTokenExample()` output is prominently displayed
- [x] Add token category information for context

### Phase 5: Add CSS Styling
- [x] Add `.cm-tooltip-autocomplete` styling for two-column layout
- [x] Add `.cm-autocomplete-preview` class for preview items
- [x] Style preview item with accent color border (matching main editor)
- [x] Add `.cm-autocomplete-example` for example column styling
- [x] Ensure consistency with existing theme

## Technical Details

### CodeMirror Autocomplete Custom Rendering
CodeMirror 6 allows custom rendering via the `info` property on completion options:

```typescript
{
  label: "YYYY-MM-DD",
  detail: "ISO date format",
  info: () => {
    const div = document.createElement("div");
    div.className = "cm-autocomplete-info";
    div.innerHTML = `<span class="example">2026-01-20</span>`;
    return div;
  }
}
```

For preview items that shouldn't insert text:
```typescript
{
  label: "Preview: 2026-01-20",
  apply: "", // Empty string means nothing is inserted
  info: () => createPreviewElement()
}
```

### Files to Modify
1. `src/components/SyntaxInput.tsx` - Main implementation
2. `styles.css` - CSS for autocomplete styling

### Dependencies
- No new dependencies required
- Uses existing `moment` from `obsidian` package
- Uses existing `@codemirror/autocomplete` module

## Testing Checklist
- [ ] Verify live preview appears when typing inside `format(...)`
- [ ] Verify preview updates as format string changes
- [ ] Verify date presets show live date examples
- [ ] Verify time presets show live time examples
- [ ] Verify token suggestions show examples
- [ ] Verify preview items are not selectable (don't insert text)
- [ ] Verify styling matches main editor appearance
- [ ] Test with date, time, and datetime value types
- [ ] Verify existing functionality is not broken

## Commit Message
```
feat: Add live format preview and examples to settings autocomplete

- Add live Moment.js format preview when typing inside format(...)
- Show actual date/time output for format presets instead of format string
- Add two-column layout with label and example display
- Style preview items with accent color for visual distinction
- Bring settings screen autocomplete to feature parity with main editor
```
