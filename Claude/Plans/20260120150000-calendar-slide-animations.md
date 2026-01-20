# Calendar Slide Animations

## Overview
Add slide animations to the DatePicker calendar grid when navigating between months/years, creating the illusion of moving through a contiguous 2D space.

## Animation Direction Logic
The new view "pushes" the current view in the direction of movement:

| Navigation | Direction | New View Enters From | Old View Exits To |
|------------|-----------|---------------------|-------------------|
| Prev Year (Up) | Up | Top | Bottom |
| Next Year (Down) | Down | Bottom | Top |
| Prev Month (Left) | Left | Left | Right |
| Next Month (Right) | Right | Right | Left |

## Implementation Plan

### Phase 1: Track Navigation Direction
- [x] Add state to track the slide direction in CalendarGrid
- [x] Pass direction information when navigation callbacks are triggered
- [x] Reset direction after animation completes

### Phase 2: CSS Animations
- [x] Create keyframe animations for each direction:
  - `slide-from-top`: Enter from top (for prev year)
  - `slide-from-bottom`: Enter from bottom (for next year)
  - `slide-from-left`: Enter from left (for prev month)
  - `slide-from-right`: Enter from right (for next month)
- [x] Apply animation class to the grid based on direction
- [x] Use appropriate duration and easing for smooth feel

### Phase 3: Coordinate with DatePicker
- [x] Update DatePicker to pass navigation direction to CalendarGrid
- [x] Handle header button clicks with appropriate direction
- [x] Handle swipe gestures with appropriate direction

## Files to Modify
1. `src/components/pickers/CalendarGrid.tsx` - Add direction state and animation classes
2. `src/components/pickers/DatePicker.tsx` - Pass direction on navigation
3. `src/styles.css` - Add slide animation keyframes

## Technical Considerations
- Use CSS `transform: translateX/Y` for smooth GPU-accelerated animations
- Animation duration should be short (~200-250ms) to feel responsive
- Use `ease-out` for natural deceleration
- Need to handle rapid successive navigations gracefully
