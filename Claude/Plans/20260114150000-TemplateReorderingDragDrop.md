# Template Reordering with Drag and Drop

## Overview
Add the ability for users to reorder templates in the settings screen using drag and drop. The template order should be preserved and reflected when opening the template selection modal.

## Requirements
- [x] Drag and drop reordering of templates in settings
- [x] Alternative keyboard/button-based reordering for accessibility
- [x] Template order persists to settings
- [x] Modal displays templates in user-defined order
- [x] Mobile touch support (via move up/down buttons, always visible on mobile)

## Design Decisions

### Approach: Native HTML5 Drag and Drop + Touch Support
Rather than adding a dependency like `@dnd-kit` or `react-beautiful-dnd`, we'll implement drag and drop using native browser APIs. This keeps the plugin lightweight and reduces bundle size.

**Pros:**
- No additional dependencies
- Full control over behavior
- Smaller bundle size
- Works with existing React patterns

**Cons:**
- More implementation work
- Need to handle touch events separately for mobile

### Accessibility
For users who cannot use drag and drop (keyboard users, screen readers), we'll add up/down arrow buttons that appear on hover/focus.

## Implementation Plan

### Phase 1: Add Drag Handle and Visual Indicators
- [x] Add a drag handle icon to `TemplateListItem` component
- [x] Add CSS for drag handle styling
- [x] Add CSS for drag-over visual feedback (drop indicator)
- [x] Add CSS for dragging item visual state

### Phase 2: Implement Drag and Drop Logic
- [x] Add drag state management to `TemplateList`
- [x] Implement `onDragStart`, `onDragOver`, `onDragEnd`, `onDrop` handlers
- [x] Calculate drop position based on mouse/touch position
- [x] Reorder templates array and call `onUpdate`

### Phase 3: Add Move Up/Down Buttons
- [x] Add up/down arrow buttons to each template item
- [x] Disable first item's "up" button, last item's "down" button
- [x] Implement `moveUp` and `moveDown` handlers
- [x] Style buttons to appear on hover/focus

### Phase 4: Mobile Touch Support
- [x] Move up/down buttons always visible on mobile (via CSS)
- [x] Touch-friendly button sizing (min 36px)
- [x] Drag handle visible as visual indicator

### Phase 5: Testing
- [x] Add unit tests for reorder logic
- [x] Add tests for move up/down functionality
- [x] Add tests for drag and drop handlers
- [ ] Manual testing in Obsidian (desktop and mobile)

## Technical Details

### State Management
```typescript
// In TemplateList
const [draggedId, setDraggedId] = useState<string | null>(null);
const [dragOverId, setDragOverId] = useState<string | null>(null);
const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | null>(null);
```

### Reorder Function
```typescript
function reorderTemplates(
  templates: TitleTemplate[],
  fromIndex: number,
  toIndex: number
): TitleTemplate[] {
  const result = [...templates];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}
```

### Drag Handle Icon (SVG)
Using a grip/drag handle icon (6 dots in 2 columns).

### CSS Classes
- `.file-template-list-item.is-dragging` - opacity/transform during drag
- `.file-template-list-item.drag-over-above` - top border indicator
- `.file-template-list-item.drag-over-below` - bottom border indicator
- `.file-template-drag-handle` - drag handle styling
- `.file-template-move-buttons` - up/down button container

## Files to Modify

1. **src/settings/TemplateList.tsx**
   - Add drag and drop state and handlers
   - Add reorder functions
   - Pass drag props to TemplateListItem

2. **src/settings/TemplateListItem.tsx** (extract from TemplateList.tsx)
   - Add drag handle
   - Add move up/down buttons
   - Add drag event handlers
   - Add touch event handlers

3. **styles.css**
   - Add drag handle styles
   - Add drag feedback styles
   - Add move button styles

4. **src/settings/__tests__/TemplateList.test.tsx**
   - Add tests for reordering functionality

## Estimated Changes
- ~150 lines new code in TemplateList/TemplateListItem
- ~50 lines new CSS
- ~80 lines new tests
