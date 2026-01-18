# Collapsible Date/Time Picker Plan

## Overview

Make the date/time picker components collapsible to save space in the UI. The picker should be collapsed by default, auto-expand on focus, auto-collapse on blur, and provide a manual toggle button. Manual interaction should disable auto-expand/collapse behavior.

## Requirements

1. **Default State**: Collapsed
2. **Auto-expand**: When picker receives focus
3. **Auto-collapse**: When picker loses focus
4. **Manual Toggle**: Collapse/Expand button for user control
5. **Manual Override**: If user manually toggles, disable auto expand/collapse on focus changes

## Affected Components

The pickers are used in `PromptEntryView.tsx` which renders different picker types based on the prompt configuration:
- `DatePicker` - Calendar date selection
- `TimePicker` - Wheel-based time selection
- `DateTimePicker` - Combined date/time with tabs

## Implementation Phases

### Phase 1: Create CollapsiblePicker Wrapper Component

- [x] Create new component `src/components/pickers/CollapsiblePicker.tsx`
- [x] Implement collapsed/expanded state management
- [x] Add `isManuallyControlled` flag to track manual user interaction
- [x] Implement focus/blur detection on the wrapper container
- [x] Add expand/collapse toggle button in header
- [x] Show compact preview when collapsed (current value formatted)
- [x] Style the wrapper with smooth height transition animation

**Component Props:**
```typescript
interface CollapsiblePickerProps {
  label: string;              // Display label (e.g., "Date", "Time")
  previewText: string;        // Formatted value to show when collapsed
  defaultExpanded?: boolean;  // Default: false
  children: React.ReactNode;  // The actual picker component
}
```

**State:**
```typescript
const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? false);
const [isManuallyControlled, setIsManuallyControlled] = useState(false);
```

### Phase 2: Implement Focus Detection Logic

- [x] Use `onFocus` and `onBlur` events on wrapper container
- [x] Use `relatedTarget` in blur event to check if focus moved within container
- [x] Implement debounce/timeout to prevent rapid toggle on tab navigation
- [x] Only auto-expand/collapse if `isManuallyControlled === false`

**Focus Logic:**
```typescript
const handleFocus = () => {
  if (!isManuallyControlled) {
    setIsExpanded(true);
  }
};

const handleBlur = (e: React.FocusEvent) => {
  // Check if focus is still within the container
  if (!containerRef.current?.contains(e.relatedTarget as Node)) {
    if (!isManuallyControlled) {
      setIsExpanded(false);
    }
  }
};
```

### Phase 3: Add Toggle Button UI

- [x] Add header row with label and toggle button
- [x] Use chevron icon that rotates based on expanded state
- [x] Set `isManuallyControlled = true` when button is clicked
- [x] Button should be keyboard accessible (Enter/Space to toggle)
- [x] Add appropriate ARIA attributes (`aria-expanded`, `aria-controls`)

**Header Structure:**
```
[Label: Date]                    [Preview: Jan 18, 2026] [▼/▲]
```

### Phase 4: Styling and Animation

- [x] Add CSS for `.collapsible-picker` wrapper in `styles.css`
- [x] Implement smooth height transition (max-height animation)
- [x] Style collapsed state as compact single row
- [x] Style expanded state with full picker visible
- [x] Add rotation animation for chevron icon
- [x] Ensure mobile-friendly touch targets

**CSS Classes:**
```css
.collapsible-picker { }
.collapsible-picker-header { }
.collapsible-picker-label { }
.collapsible-picker-preview { }
.collapsible-picker-toggle { }
.collapsible-picker-content { }
.collapsible-picker-content.collapsed { }
.collapsible-picker-content.expanded { }
```

### Phase 5: Integrate with PromptEntryView

- [x] Wrap `DatePicker` with `CollapsiblePicker` in PromptEntryView
- [x] Wrap `TimePicker` with `CollapsiblePicker` in PromptEntryView
- [x] Wrap `DateTimePicker` with `CollapsiblePicker` in PromptEntryView
- [x] Pass appropriate label and preview text props
- [x] Format preview text based on current value and format settings
- [x] Test all three picker types work correctly when wrapped

### Phase 6: Testing and Polish

- [ ] Test auto-expand on focus (click into picker area)
- [ ] Test auto-collapse on blur (click outside picker)
- [ ] Test manual toggle disables auto behavior
- [ ] Test keyboard navigation (Tab should respect focus behavior)
- [ ] Test on mobile (touch targets, responsive layout)
- [ ] Test with different themes (light/dark)
- [ ] Verify accessibility with screen reader

## Technical Considerations

1. **Focus Detection Edge Cases**:
   - Clicking the toggle button itself shouldn't trigger blur/focus auto behavior
   - Tab navigation between picker elements should not collapse
   - Clicking "Today" or "Now" buttons should keep picker open

2. **Animation Performance**:
   - Use CSS transforms where possible
   - Consider `will-change` hint for smoother animations
   - Avoid layout thrashing during animation

3. **Accessibility**:
   - Maintain existing ARIA attributes on pickers
   - Add `aria-expanded` on toggle button
   - Ensure collapsed state is still keyboard navigable

4. **State Persistence**:
   - `isManuallyControlled` should persist during the session
   - Consider if we need to reset manual control on value change (probably not)

## Commit Message

```
feat: Add collapsible date/time picker with auto-expand on focus

- Create CollapsiblePicker wrapper component
- Default state is collapsed to save UI space
- Auto-expand when picker receives focus
- Auto-collapse when focus moves outside picker
- Add manual expand/collapse toggle button
- Manual toggle disables auto-expand/collapse behavior
- Add smooth height transition animations
- Maintain full accessibility support
```
