# Date Picker Keyboard Navigation Improvements

## Overview
Improve keyboard navigation in the DatePicker/CalendarGrid components to provide a better UX when using arrow keys.

## Current Behavior
- Arrow keys only work after clicking on a specific day cell (cell must be focused)
- Left/Right arrows move by 1 day, wrapping within the month until reaching month edges
- Up/Down arrows move by 7 days, crossing to prev/next month when reaching edges

## Required Changes

### 1. Immediate Arrow Key Response
When tabbing into a Date field, arrow keys should work immediately without needing to click a day first.

### 2. New Edge Navigation Behavior
- **Left at left edge (column 0)**: Go to previous month
- **Right at right edge (column 6)**: Go to next month
- **Up from top row (row 0)**: Go to previous year (keeping month same)
- **Down from bottom row (row 5)**: Go to next year (keeping month same)

## Implementation Plan

### Phase 1: Add Year Navigation Props to CalendarGrid
- [x] Add `onPrevYear` and `onNextYear` callback props to `CalendarGridProps`
- [x] Pass year navigation handlers from `DatePicker` to `CalendarGrid`

### Phase 2: Enable Immediate Arrow Key Response
- [x] Make the grid container itself focusable with `tabIndex={0}`
- [x] Add `onKeyDown` handler to the grid container
- [x] When arrow keys are pressed on the container (no cell focused), focus the selected date or today's date
- [x] Track which cell is focused and use that for navigation context

### Phase 3: Implement Edge-Based Navigation
- [x] Modify `handleKeyDown` to detect edge conditions:
  - Check if current date's day-of-week is Sunday (column 0) for left edge
  - Check if current date's day-of-week is Saturday (column 6) for right edge
  - Check if current date falls in the first row of the displayed grid for top edge
  - Check if current date falls in the last row of the displayed grid for bottom edge
- [x] For left edge + ArrowLeft: call `onPrevMonth()` and focus last Saturday of that month
- [x] For right edge + ArrowRight: call `onNextMonth()` and focus first Sunday of that month
- [x] For top edge + ArrowUp: call `onPrevYear()` and keep same date (adjust if invalid)
- [x] For bottom edge + ArrowDown: call `onNextYear()` and keep same date (adjust if invalid)

### Phase 4: Focus Management After Navigation
- [x] After month/year navigation, ensure the appropriate cell is focused:
  - For month navigation: focus the equivalent position in the new month
  - For year navigation: focus the same day of month (or last valid day if the new month is shorter)
- [x] Use `focusedDateRef` to track the intended focus target across navigation

### Phase 5: Edge-Continuous Navigation (Bug Fix)
- [x] When navigating over greyed-out days (prev/next month visible in grid), don't change view
- [x] When triggering edge navigation, focus the "adjacent" cell in the new view:
  - Up from top row → focus bottom row of prev year at same column (day of week)
  - Down from bottom row → focus top row of next year at same column (day of week)
  - Left from Sunday → focus Saturday of prev month at same row
  - Right from Saturday → focus Sunday of next month at same row
- [x] Use `generateCalendarGrid()` to calculate the target cell in the new view

## Files to Modify
1. `src/components/pickers/CalendarGrid.tsx` - Main keyboard navigation logic
2. `src/components/pickers/DatePicker.tsx` - Pass year navigation handlers

## Testing Considerations
- Tab into a DatePicker and immediately use arrow keys
- Navigate to left edge (Sunday) and press Left arrow
- Navigate to right edge (Saturday) and press Right arrow
- Navigate to top row and press Up arrow
- Navigate to bottom row and press Down arrow
- Verify focus is maintained correctly after each navigation
