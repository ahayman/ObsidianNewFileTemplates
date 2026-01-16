# Implementation Plan: Date, Time, and DateTime Picker Prompts

## Overview

Add three new user prompt types (`date`, `time`, `datetime`) to the plugin. These will display interactive pickers instead of text fields, defaulting to "now" and supporting multiple interaction paradigms for ease of use.

## Goals

1. Add date picker with calendar grid (swipe navigation, tap selection)
2. Add time picker with wheel columns (scroll/swipe selection)
3. Add datetime picker combining both
4. Maintain consistency with existing UI/UX patterns
5. Full mobile and accessibility support
6. No external dependencies (custom React components)

---

## Phase 1: Core Infrastructure ✅

Extend the type system and validation logic to support new prompt types.

### Tasks

- [x] **1.1** Update `UserPrompt` type in `src/types.ts`
  - Add `'date' | 'time' | 'datetime'` to `valueType` union
  - Add optional `dateConfig` and `timeConfig` properties for format options

- [x] **1.2** Create date/time formatting utilities in `src/utils/dateTimeUtils.ts`
  - `formatDate(date: Date, format: string): string`
  - `formatTime(date: Date, format: string): string`
  - `formatDateTime(date: Date, dateFormat: string, timeFormat: string): string`
  - `parseDate(value: string): Date | null`
  - `parseTime(value: string): { hours: number, minutes: number } | null`
  - `isValidDate(value: string): boolean`
  - `isValidTime(value: string): boolean`

- [x] **1.3** Update validation in `src/utils/promptParser.ts`
  - Add validation cases for `date`, `time`, `datetime` in `validatePromptValue()`
  - Date format: `YYYY-MM-DD`
  - Time format: `HH:mm`
  - DateTime format: `YYYY-MM-DDTHH:mm`

- [x] **1.4** Update `PromptEditor.tsx` value type dropdown
  - Add options: "Date", "Time", "Date & Time"
  - Update hint text for each type

---

## Phase 2: Calendar Grid Component ✅

Build the date picker with a full calendar grid.

### Tasks

- [x] **2.1** Create calendar calculation functions in `src/utils/dateTimeUtils.ts`
  - `getMonthDays(month, year)` - days in a month (handle leap years)
  - `getFirstDayOfMonth(month, year)` - weekday the month starts on
  - `generateCalendarGrid(month, year)` - 6×7 date array
  - `isSameDay(date1, date2)` - comparison helper
  - `isToday(date)` - check if date is today

- [x] **2.2** Create `CalendarGrid.tsx` component
  - Props: `selectedDate`, `onDateSelect`, `month`, `year`, `onMonthChange`, `onYearChange`
  - Render day-of-week headers (Sun-Sat)
  - Render 6 rows × 7 columns of date cells
  - Highlight today with border
  - Highlight selected date with fill
  - Dim dates from adjacent months

- [x] **2.3** Create `DatePickerHeader.tsx` component
  - Display current month and year
  - Previous/Next month buttons
  - Previous/Next year buttons (or dropdown)
  - Accessible button labels

- [x] **2.4** Create main `DatePicker.tsx` component
  - Compose header + grid
  - Manage month/year navigation state
  - Default to current date if no value
  - Emit formatted date string on selection

- [x] **2.5** Add swipe gesture support for calendar navigation
  - Swipe left → next month
  - Swipe right → previous month
  - Swipe up → next year
  - Swipe down → previous year

- [x] **2.6** Add keyboard navigation for calendar
  - Arrow keys to move selection
  - Enter to confirm selection
  - Escape to cancel
  - Tab to move between header controls

- [x] **2.7** Add CSS styles for calendar in `styles.css`
  - Calendar container, header, grid
  - Date cell states (default, hover, today, selected, other-month)
  - Mobile adjustments (larger touch targets)
  - Use Obsidian CSS variables for theming

---

## Phase 3: Wheel Picker Component ✅

Build the time picker with scrollable wheel columns.

### Tasks

- [x] **3.1** Create `WheelColumn.tsx` with gesture handling
  - Track touch start, move, end events
  - Calculate scroll velocity for momentum
  - Handle mouse wheel events for desktop
  - Snap to nearest item on release

- [x] **3.2** Create `WheelColumn.tsx` component
  - Props: `values[]`, `selectedValue`, `onChange`, `itemHeight`, `visibleItems`
  - Render scrollable list of values
  - Center selected item with highlight
  - Apply opacity/scale transforms to non-selected items
  - Handle touch drag and mouse wheel

- [x] **3.3** Create `TimePicker.tsx` component
  - Compose hour + minute columns (+ optional AM/PM for 12h)
  - Props: `value`, `onChange`, `format: '12h' | '24h'`, `minuteStep`
  - Default to current time if no value
  - Emit formatted time string

- [x] **3.4** Display current selection
  - Time display below wheels shows formatted time
  - "Now" button to reset to current time

- [x] **3.5** Add CSS styles for wheel picker in `styles.css`
  - Wheel container with overflow hidden
  - Selection highlight bar
  - Item styles with transform/opacity transitions
  - Mobile adjustments

---

## Phase 4: DateTime Picker Component ✅

Combine date and time pickers into a unified component.

### Tasks

- [x] **4.1** Create `DateTimePicker.tsx` component
  - Props: `value`, `onChange`
  - Tabbed interface (Date tab, Time tab)
  - Show combined preview: "Jan 16, 2026 at 3:45 PM"

- [x] **4.2** Manage combined state
  - Parse incoming datetime string
  - Track date and time separately
  - Combine on either change
  - Emit ISO datetime format: `YYYY-MM-DDTHH:mm`

- [x] **4.3** Add CSS styles for datetime picker
  - Container layout
  - Tab styles
  - Preview display

---

## Phase 5: Integration with Prompt System ✅

Wire up the new pickers to the prompt entry flow.

### Tasks

- [x] **5.1** Update `PromptEntryView.tsx` to render pickers based on `valueType`
  - Conditional rendering with switch on valueType
  - `text` → standard text input
  - `numeric` → text input with numeric keyboard
  - `date` → DatePicker component
  - `time` → TimePicker component
  - `datetime` → DateTimePicker component

- [x] **5.2** Initialize date/time prompts with "now" as default
  - Date: current date formatted as `YYYY-MM-DD`
  - Time: current time formatted as `HH:mm`
  - DateTime: current datetime formatted as `YYYY-MM-DDTHH:mm`

- [x] **5.3** Update modal styling for picker layout
  - Pickers get border styling in modal context
  - Focus states for pickers
  - Error states for pickers

- [ ] **5.4** Test validation flow
  - Verify error states display correctly
  - Ensure picker values pass validation
  - Test edge cases (Feb 29, midnight, etc.)

---

## Phase 6: Polish and Accessibility (Partially Complete)

Final refinements for production quality.

### Tasks

- [x] **6.1** Accessibility (basic implementation)
  - ARIA labels on all interactive elements
  - `role="grid"`, `role="gridcell"`, `role="listbox"`, `role="option"` on appropriate elements
  - `aria-selected` states
  - `aria-live` regions for date/time display updates
  - Keyboard navigation (arrow keys, Enter, Escape, Home, End, PageUp, PageDown)

- [x] **6.2** Animation and transitions
  - Selection state transitions in CSS
  - Momentum scrolling in wheel picker (implemented)
  - Smooth snap-to-item animation

- [x] **6.3** Mobile optimization
  - 44px minimum touch targets on mobile
  - Swipe gestures for calendar navigation
  - Touch drag for wheel picker
  - Larger fonts on mobile

- [x] **6.4** Edge case handling (partial)
  - Uses local timezone throughout
  - Leap year handled via Date object
  - 12/24 hour format support
  - Default to "now" for empty values

- [x] **6.5** Performance optimization
  - useMemo for calendar grid calculations
  - useMemo for hour/minute value arrays
  - useCallback for event handlers

---

## File Structure

```
src/
├── components/
│   └── pickers/
│       ├── DatePicker.tsx          # Main date picker
│       ├── TimePicker.tsx          # Main time picker
│       ├── DateTimePicker.tsx      # Combined picker
│       ├── CalendarGrid.tsx        # Calendar grid sub-component
│       ├── DatePickerHeader.tsx    # Month/year navigation
│       ├── WheelColumn.tsx         # Single wheel column
│       └── hooks/
│           ├── useCalendar.ts      # Calendar calculations
│           ├── useWheelGesture.ts  # Touch/wheel handling
│           └── useSwipeGesture.ts  # Swipe navigation
├── utils/
│   ├── dateTimeUtils.ts            # NEW: Date/time formatting
│   ├── promptParser.ts             # UPDATE: Add validation
│   └── templateParser.ts           # No changes needed
├── types.ts                        # UPDATE: Extend UserPrompt
├── modals/
│   └── PromptEntryView.tsx         # UPDATE: Render pickers
└── settings/
    └── PromptEditor.tsx            # UPDATE: New type options
```

---

## Type Definitions

### Updated `UserPrompt` Interface

```typescript
export interface UserPrompt {
  id: string;
  name: string;
  valueType: 'text' | 'numeric' | 'date' | 'time' | 'datetime';
  // Optional configuration (future enhancement)
  dateConfig?: {
    format?: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
    minDate?: string;
    maxDate?: string;
  };
  timeConfig?: {
    format?: '12h' | '24h';
    minuteStep?: 1 | 5 | 15 | 30;
  };
}
```

### Component Props

```typescript
interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (time: string) => void;
  format?: '12h' | '24h';
  minuteStep?: number;
}

interface DateTimePickerProps {
  value: Date | null;
  onChange: (datetime: Date) => void;
}

interface WheelColumnProps {
  values: string[];
  selectedValue: string;
  onChange: (value: string) => void;
  itemHeight?: number;
  visibleItems?: number;
}
```

---

## Output Formats

| Type | Output Format | Example |
|------|---------------|---------|
| date | `YYYY-MM-DD` | `2026-01-16` |
| time | `HH:mm` | `14:30` |
| datetime | `YYYY-MM-DDTHH:mm` | `2026-01-16T14:30` |

These formats are filename-safe and sort correctly lexicographically.

---

## Testing Checklist

### Unit Tests
- [ ] Calendar grid generation (correct days, leap years)
- [ ] Date formatting and parsing
- [ ] Time formatting and parsing
- [ ] Validation for all prompt types

### Integration Tests
- [ ] Prompt entry modal with date picker
- [ ] Prompt entry modal with time picker
- [ ] Prompt entry modal with datetime picker
- [ ] Mixed prompts (text + date + time in same template)

### Manual Testing
- [ ] Desktop: mouse click, wheel scroll, keyboard navigation
- [ ] Mobile: touch tap, swipe gestures, wheel drag
- [ ] Dark theme and light theme
- [ ] Various screen sizes (phone, tablet, desktop)

---

## Estimated Complexity

| Phase | Complexity | Key Challenges |
|-------|------------|----------------|
| 1. Infrastructure | Low | Type updates, basic validation |
| 2. Calendar | Medium | Grid calculation, swipe gestures |
| 3. Wheel Picker | High | Touch physics, momentum scrolling |
| 4. DateTime | Low | Composition of existing components |
| 5. Integration | Medium | State management, modal layout |
| 6. Polish | Medium | Accessibility, edge cases |

---

## Dependencies

**None required.** All components will be built with React and vanilla TypeScript.

Optional future consideration: `react-mobile-picker` (~5kb) could replace custom wheel implementation if development time is constrained.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Wheel physics feel unnatural | Reference iOS behavior, tune velocity/friction constants |
| Poor mobile performance | Test early on actual devices, optimize touch handlers |
| Accessibility gaps | Follow WAI-ARIA date picker patterns, test with screen readers |
| Timezone confusion | Always use local time, document behavior clearly |

---

## Success Criteria

1. Users can select dates via calendar tap or swipe navigation
2. Users can select times via wheel scroll or direct input
3. Pickers default to current date/time
4. All interactions work smoothly on mobile devices
5. Full keyboard navigation support
6. Screen reader compatibility
7. Consistent styling with Obsidian themes
