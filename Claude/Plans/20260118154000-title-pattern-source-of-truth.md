# Plan: Title Pattern as Single Source of Truth for User Prompts

## Overview

Make the Title Pattern the single source of truth for all User Prompts. The User Prompts section in the Template Editor should always reflect what's in the Title Pattern. Editing a prompt updates the pattern directly.

---

## Current Behavior (Problems)

1. `userPrompts` is stored separately in `TitleTemplate.userPrompts`
2. Prompts added via editor are stored and appended to pattern
3. Prompts typed directly in pattern show "Inline" badge and can only be "Viewed" (read-only)
4. Two sources of truth cause confusion and sync issues

---

## Desired Behavior

1. User Prompts always reflect what's in the Title Pattern (derived, not stored)
2. All prompts are editable via the prompt editor
3. Editing a prompt replaces its syntax in the title pattern
4. Adding a new prompt appends syntax to the pattern
5. Deleting a prompt removes its syntax from the pattern
6. No more "Inline" badge (all prompts come from the pattern)
7. No "Insert" button for existing prompts (already in pattern)

---

## Phase 1: Add Helper Function to Replace Prompt Syntax

- [x] Add `replacePromptSyntax(pattern, oldName, newSyntax)` function to promptParser.ts
- [x] Handles all variations: `{% Name %}`, `{% Name:type %}`, `{% Name:type:format %}`, `{%? Name ?%}`
- [x] Add `removePromptSyntax(pattern, name)` function to remove a prompt from pattern
- [x] Add unit tests for new functions

---

## Phase 2: Update TemplateEditor

- [x] Remove `userPrompts` state - derive directly from pattern using `extractPrompts`
- [x] Update prompt add flow: append syntax to pattern (current behavior is correct)
- [x] Update prompt edit flow:
  - Pass original prompt name to editor
  - On save, call `replacePromptSyntax` to update pattern with new syntax
- [x] Update prompt delete: call `removePromptSyntax` to remove from pattern
- [x] Remove "Insert" button from PromptListItem (prompts are already in pattern)

---

## Phase 3: Update PromptEditor

- [x] Remove `isInlineConfigured` checks (all prompts can be edited)
- [x] All fields are always editable
- [x] Remove the "inline configured" notice message
- [x] Update onSave to pass both old name and new syntax for replacement

---

## Phase 4: Update PromptListItem

- [x] Remove "Inline" badge
- [x] Remove "Insert" button
- [x] Always show "Edit" button (never "View")
- [x] Keep "Delete" button

---

## Phase 5: Update Types

- [x] Remove `isInlineConfigured` from `UserPrompt` interface (no longer needed)
- [x] Remove `isInlineConfigured` from `ParsedPromptSyntax` interface
- [x] On save, don't store `userPrompts` (derived from pattern)

---

## Phase 6: Update main.ts File Creation

- [x] Remove reliance on `template.userPrompts`
- [x] Use `extractPrompts` directly instead of `syncPromptsWithPattern`

---

## Phase 7: Unit Tests

- [x] Test `replacePromptSyntax` with various syntax forms
- [x] Test `removePromptSyntax`
- [x] Update `syncPromptsWithPattern` tests to reflect new behavior

---

## Phase 8: Build and Test

- [x] Build passes with no TypeScript errors
- [x] All 399 tests pass

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/utils/promptParser.ts` | Add `replacePromptSyntax`, `removePromptSyntax` |
| `src/utils/promptParser.test.ts` | Add tests for new functions |
| `src/settings/TemplateEditor.tsx` | Derive prompts from pattern, update edit/delete flows |
| `src/settings/PromptEditor.tsx` | Remove `isInlineConfigured` restrictions, update callback |
| `src/types.ts` | Remove `isInlineConfigured` from UserPrompt |

---

## Commit Message

```
Make title pattern single source of truth for user prompts

- Derive user prompts directly from title pattern instead of storing separately
- All prompts can now be edited via the prompt editor (no more read-only "inline")
- Editing a prompt updates its syntax in the title pattern
- Deleting a prompt removes its syntax from the pattern
- Remove "Inline" badge and "Insert" button from prompt list
- Add replacePromptSyntax() and removePromptSyntax() helper functions
- Remove isInlineConfigured flag from UserPrompt interface
```
