# Plan: Optional Prompt Fields

## Overview

Add support for optional prompt fields that don't require values. When no value is entered, an empty string is used in the title.

### Syntax

```
{%? PromptName:type:format ?%}
```

The question marks (`?`) at the start and end indicate the field is optional.

### Examples

| Syntax | Description |
|--------|-------------|
| `{%? Subtitle ?%}` | Optional text field |
| `{%? Author:text ?%}` | Optional text with explicit type |
| `{%? Date:date:ISO ?%}` | Optional date with format |
| `{% Title %}-{%? Subtitle ?%}` | Mixed required and optional |

### Behavior

- Optional fields show "(optional)" indicator in the prompt form
- Validation passes even when optional field is empty
- Empty optional fields substitute to empty string in filename
- Required fields (standard `{% %}` syntax) work as before

---

## Phase 1: Update Type Definitions

- [x] Add `isOptional` flag to `UserPrompt` interface
- [x] Add `isOptional` to `ParsedPromptSyntax` interface

---

## Phase 2: Update Prompt Parser

- [x] Update regex patterns to detect optional syntax `{%? ... ?%}`
- [x] Update `parsePromptSyntax()` to handle optional marker
- [x] Update `extractPrompts()` to set `isOptional` flag
- [x] Update `getPromptName()` to handle optional syntax
- [x] Ensure `substitutePrompts()` and `previewWithPrompts()` handle both syntaxes

---

## Phase 3: Update Validation

- [x] Update `validatePromptValue()` to allow empty values for optional prompts
- [x] Update `allPromptsValid()` to handle optional fields (uses validatePromptValue)

---

## Phase 4: Update UI

- [x] Update `PromptEntryView` to show "(optional)" label
- [x] Update `PromptEntryView` to not show error for empty optional fields
- [x] Update `PromptListItem` to show optional indicator
- [x] Add checkbox in `PromptEditor` to toggle optional status

---

## Phase 5: Testing

- [x] Build passes with no TypeScript errors
- [x] Backward compatibility maintained with existing syntax
- [x] Unit tests added (66 tests in promptParser.test.ts)

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/types.ts` | Add `isOptional` to `UserPrompt` and `ParsedPromptSyntax` |
| `src/utils/promptParser.ts` | Update regex and parsing to handle optional syntax |
| `src/modals/PromptEntryView.tsx` | Show optional indicator, adjust validation display |
| `src/settings/PromptEditor.tsx` | Add optional toggle, show optional badge |

---

## Commit Message

```
Add optional prompt fields with {%? syntax ?%}

- Optional fields don't require values (empty string used if blank)
- Show "(optional)" indicator in prompt form
- Validation passes for empty optional fields
- Backward compatible with required {% syntax %}
```
