# Research: Syntax Highlighting and Autocomplete for Obsidian Plugins

**Date:** 2026-01-18
**Topic:** Templater-style syntax highlighting and autocomplete implementation
**Purpose:** Feasibility study for integrating similar features into the New Note Template plugin

---

## Executive Summary

This research examines how the Templater plugin implements syntax highlighting and autocomplete, and evaluates the feasibility of integrating similar features into the New Note Template plugin. The study found that Templater uses:

1. **Autocomplete**: Obsidian's built-in `EditorSuggest` API (not CodeMirror 6 autocomplete)
2. **Syntax Highlighting**: A CodeMirror 5 mode wrapped with CM6's `StreamLanguage.define()`

Both approaches are **feasible** to implement in this plugin, with the `EditorSuggest` approach being simpler and more robust.

---

## Part 1: Templater's Implementation Analysis

### 1.1 Autocomplete Implementation

Templater uses **Obsidian's `EditorSuggest` API** rather than CodeMirror 6's native autocomplete system.

**Key source file**: `src/editor/Autocomplete.ts`

**How it works**:

```typescript
class TemplaterSuggest extends EditorSuggest<SuggestionItem> {
  // Trigger pattern for "tp." followed by module/function
  private triggerPattern = /tp\.(?<module>[a-z]*)?(?<fn_trigger>\.(?<fn>[a-zA-Z_.]*)?)?$/;

  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
    // Match trigger pattern, return null if no match
    const line = editor.getLine(cursor.line);
    const match = line.slice(0, cursor.ch).match(this.triggerPattern);
    if (!match) return null;

    return {
      start: { line: cursor.line, ch: cursor.ch - match[0].length },
      end: cursor,
      query: match[0]
    };
  }

  getSuggestions(context: EditorSuggestContext): SuggestionItem[] {
    // Return filtered suggestions based on context
    return this.filterSuggestions(context.query);
  }

  selectSuggestion(suggestion: SuggestionItem, evt: MouseEvent | KeyboardEvent): void {
    // Insert the selected suggestion
    this.context.editor.replaceRange(
      suggestion.queryKey,
      this.context.start,
      this.context.end
    );
  }
}
```

**Registration**:
```typescript
this.plugin.registerEditorSuggest(new TemplaterSuggest(this.plugin));
```

### 1.2 Syntax Highlighting Implementation

Templater uses a **CodeMirror 5 overlay mode** wrapped for CM6 compatibility.

**Key source files**:
- `src/editor/Editor.ts` - Extension registration
- `src/editor/mode/custom_overlay.js` - CM5 overlay mode implementation

**How it works**:

```typescript
// In Editor.ts
import { StreamLanguage } from "@codemirror/language";
import { Prec } from "@codemirror/state";

// Wrap CM5 mode for CM6
const templaterLanguage = StreamLanguage.define(
  window.CodeMirror.getMode({}, TEMPLATER_MODE_NAME)
);

// Register with high precedence
const extension = Prec.high(templaterLanguage);
this.plugin.registerEditorExtension(extension);
```

The overlay mode tokenizes text and returns CSS class names for styling:

```javascript
// In custom_overlay.js
token: function(stream, state) {
  // Match templater syntax like <% %>
  if (stream.match(/<%[-~=]?/)) {
    state.inTemplaterBlock = true;
    return "templater-opening-tag";
  }
  // Continue parsing...
}
```

### 1.3 Dynamic Extension Management

Templater uses a pattern for toggling extensions without re-registration:

```typescript
private activeEditorExtensions: Extension[] = [];

// Register once
this.plugin.registerEditorExtension(this.activeEditorExtensions);

// Toggle by modifying array contents
enableHighlighting() {
  this.activeEditorExtensions.push(this.highlightExtension);
  this.plugin.app.workspace.updateOptions();
}

disableHighlighting() {
  this.activeEditorExtensions.length = 0;
  this.plugin.app.workspace.updateOptions();
}
```

---

## Part 2: Alternative Approaches

### 2.1 Pure CodeMirror 6 Approach

Instead of wrapping CM5 modes, you can use native CM6 APIs:

#### ViewPlugin with Decorations

```typescript
import { ViewPlugin, Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

class TemplateHighlightPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();

    // Match your template syntax
    const pattern = /\{\{[^}]+\}\}|\{%[^%]+%\}/g;

    for (const { from, to } of view.visibleRanges) {
      const text = view.state.sliceDoc(from, to);
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const start = from + match.index;
        const end = start + match[0].length;

        builder.add(start, end, Decoration.mark({ class: "template-syntax" }));
      }
    }

    return builder.finish();
  }
}

const highlightPlugin = ViewPlugin.fromClass(TemplateHighlightPlugin, {
  decorations: v => v.decorations
});
```

#### CM6 Native Autocomplete

```typescript
import { autocompletion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";

function templateCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/\{\{[^}]*$/);
  if (!word) return null;

  return {
    from: word.from + 2, // After "{{"
    options: [
      { label: "date", type: "variable", info: "Current date" },
      { label: "time", type: "variable", info: "Current time" },
      { label: "counter", type: "variable", info: "Auto-increment counter" },
    ]
  };
}

const autocompleteExtension = autocompletion({
  override: [templateCompletions]
});
```

### 2.2 Obsidian EditorSuggest (Recommended for Autocomplete)

This is simpler and more Obsidian-native:

```typescript
import { EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo } from "obsidian";

interface TemplateSuggestion {
  label: string;
  type: "variable" | "prompt";
  description: string;
  insertText: string;
}

class TemplateSuggest extends EditorSuggest<TemplateSuggestion> {
  // Trigger on "{{" or "{%"
  onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
    const line = editor.getLine(cursor.line);
    const beforeCursor = line.slice(0, cursor.ch);

    // Match {{ or {%
    const varMatch = beforeCursor.match(/\{\{([^}]*)$/);
    const promptMatch = beforeCursor.match(/\{%\??\s*([^%]*)$/);

    if (varMatch) {
      return {
        start: { line: cursor.line, ch: cursor.ch - varMatch[1].length },
        end: cursor,
        query: varMatch[1]
      };
    }

    if (promptMatch) {
      return {
        start: { line: cursor.line, ch: cursor.ch - promptMatch[1].length },
        end: cursor,
        query: promptMatch[1]
      };
    }

    return null;
  }

  getSuggestions(context: EditorSuggestContext): TemplateSuggestion[] {
    const query = context.query.toLowerCase();

    const suggestions: TemplateSuggestion[] = [
      { label: "date", type: "variable", description: "Current date", insertText: "date}}" },
      { label: "time", type: "variable", description: "Current time", insertText: "time}}" },
      { label: "datetime", type: "variable", description: "Date and time", insertText: "datetime}}" },
      { label: "counter", type: "variable", description: "Auto-increment", insertText: "counter}}" },
      // Add prompt suggestions...
    ];

    return suggestions.filter(s => s.label.toLowerCase().includes(query));
  }

  renderSuggestion(suggestion: TemplateSuggestion, el: HTMLElement): void {
    el.createDiv({ cls: "suggestion-title", text: suggestion.label });
    el.createDiv({ cls: "suggestion-description", text: suggestion.description });
  }

  selectSuggestion(suggestion: TemplateSuggestion): void {
    const { editor, start, end } = this.context!;
    editor.replaceRange(suggestion.insertText, start, end);
  }
}
```

---

## Part 3: Feasibility Analysis

### 3.1 Current Plugin State

Based on codebase exploration:
- **No existing CodeMirror integration** - Uses React form-based UI
- **Pattern editing is plain text** - In `TemplateEditor.tsx` textarea
- **Prompt parsing exists** - `promptParser.ts` already has regex patterns

### 3.2 Implementation Approaches

| Approach | Complexity | Maintenance | Robustness |
|----------|------------|-------------|------------|
| EditorSuggest (Obsidian) | Low | Low | High |
| StreamLanguage (CM5 wrap) | Medium | Medium | Medium |
| ViewPlugin (Pure CM6) | High | Medium | High |

### 3.3 Recommended Approach

**For Autocomplete**: Use `EditorSuggest`
- Simpler implementation
- Uses Obsidian's native UI styling
- Handles keyboard navigation automatically
- Better integration with Obsidian's ecosystem

**For Syntax Highlighting**: Use CM6 `ViewPlugin` with `Decoration.mark()`
- Native CM6 approach (future-proof)
- Works with Live Preview mode
- No CM5 legacy code
- Better performance with visible ranges

### 3.4 Integration Points

The autocomplete/highlighting would apply in two contexts:

1. **Settings UI** (`TemplateEditor.tsx`)
   - Title pattern textarea
   - Could replace with CodeMirror-enabled input

2. **Main Editor** (when editing template files)
   - Highlight template syntax in .md files
   - Autocomplete when typing {{ or {%

### 3.5 Implementation Effort Estimate

| Component | Effort | Dependencies |
|-----------|--------|--------------|
| EditorSuggest autocomplete | Small | None |
| Settings UI CodeMirror | Medium | @codemirror packages |
| Main editor highlighting | Medium | registerEditorExtension |
| CSS styling | Small | styles.css updates |

### 3.6 Potential Challenges

1. **CodeMirror Version Alignment**: Must mark @codemirror as external in esbuild to use Obsidian's versions
2. **Settings UI**: Current textarea would need to be replaced with a proper CodeMirror instance
3. **Multiple Contexts**: Need to handle both settings editing and main editor

### 3.7 Package Dependencies

For pure CM6 approach, add to esbuild.config.mjs:

```javascript
external: [
  "obsidian",
  "@codemirror/state",
  "@codemirror/view",
  "@codemirror/language",
  "@codemirror/autocomplete"
]
```

---

## Part 4: Code Examples for This Plugin

### 4.1 Variable Suggestions

Based on current `templateParser.ts` built-in variables:

```typescript
const BUILTIN_VARIABLES = [
  { label: "date", description: "Current date (format: YYYY-MM-DD)" },
  { label: "time", description: "Current time (format: HH:mm)" },
  { label: "datetime", description: "Date and time combined" },
  { label: "year", description: "Current year (YYYY)" },
  { label: "month", description: "Current month (MM)" },
  { label: "day", description: "Current day (DD)" },
  { label: "timestamp", description: "Unix timestamp" },
  { label: "counter", description: "Auto-incrementing counter" }
];
```

### 4.2 Prompt Syntax Suggestions

Based on current `promptParser.ts`:

```typescript
const PROMPT_TYPES = [
  { label: "text", description: "Free-form text input" },
  { label: "number", description: "Numeric input only" },
  { label: "date", description: "Date picker" },
  { label: "time", description: "Time picker" },
  { label: "datetime", description: "Date and time picker" }
];

const DATE_FORMATS = ["ISO", "compact", "US", "EU", "short", "long"];
const TIME_FORMATS = ["ISO", "24-hour", "24-compact", "12-hour", "12-padded"];
```

### 4.3 Syntax Highlighting Classes

```css
/* Template variable syntax: {{variable}} */
.template-variable-bracket {
  color: var(--text-accent);
}

.template-variable-name {
  color: var(--text-accent);
  font-weight: 600;
}

/* Prompt syntax: {% Name:type:format %} */
.template-prompt-bracket {
  color: var(--text-success);
}

.template-prompt-name {
  color: var(--text-success);
  font-weight: 600;
}

.template-prompt-type {
  color: var(--text-muted);
}

.template-prompt-optional {
  opacity: 0.7;
}
```

---

## Part 5: Conclusions and Recommendations

### 5.1 Feasibility: HIGH

Implementing Templater-style syntax highlighting and autocomplete is highly feasible for this plugin.

### 5.2 Recommended Implementation Order

1. **Phase 1**: EditorSuggest autocomplete for main editor
   - Lowest effort, highest impact
   - Works immediately with existing codebase

2. **Phase 2**: CM6 ViewPlugin syntax highlighting for main editor
   - Adds visual feedback when editing templates
   - Requires esbuild config changes

3. **Phase 3**: Enhanced settings UI (optional)
   - Replace textarea with CodeMirror instance
   - Would require more significant refactoring

### 5.3 Key Technical Decisions

1. **Use EditorSuggest over CM6 autocomplete** - Simpler, better Obsidian integration
2. **Use ViewPlugin over StreamLanguage** - Native CM6, no legacy code
3. **Mark @codemirror external in esbuild** - Critical for version compatibility

---

## Sources

- [Templater GitHub Repository](https://github.com/SilentVoid13/Templater)
- [Obsidian CM6 Attributes Reference Plugin](https://github.com/nothingislost/obsidian-cm6-attributes)
- [Obsidian Plugin Developer Docs - Decorations](https://marcusolsson.github.io/obsidian-plugin-docs/editor/extensions/decorations)
- [CodeMirror 6 Decoration Example](https://codemirror.net/examples/decoration/)
- [CodeMirror 6 Autocompletion Example](https://codemirror.net/examples/autocompletion/)
- [Obsidian CodeMirror 6 Migration Guide](https://obsidian.md/blog/codemirror-6-migration-guide/)
- [Obsidian EditorSuggest API](https://docs.obsidian.md/Reference/TypeScript+API/EditorSuggest)
- [obsidian-completr Plugin](https://github.com/tth05/obsidian-completr)
