# Research: Date, Time, and DateTime Picker Implementation

## Overview

This research explores implementation options for adding Date, Time, and DateTime user prompt types to the Obsidian New Note Template plugin. The goal is to provide intuitive, mobile-friendly pickers that default to "now" and support multiple interaction paradigms.

## Current Prompt System Architecture

The existing prompt system in `src/types.ts` defines:

```typescript
export interface UserPrompt {
  id: string;
  name: string;
  valueType: 'text' | 'numeric';  // Will need to add: 'date' | 'time' | 'datetime'
}
```

Key files:
- `src/types.ts` - Type definitions
- `src/utils/promptParser.ts` - Validation and parsing
- `src/modals/PromptEntryView.tsx` - React UI for prompt input
- `src/settings/PromptEditor.tsx` - Prompt configuration UI
- `styles.css` - Styling (lines 663-905 for prompt styles)

---

## Implementation Options

### Option 1: Custom Build (Recommended)

Build date/time pickers from scratch using React, maintaining full control over UX and styling consistency with Obsidian's theme.

**Pros:**
- No external dependencies
- Complete control over UX and interaction patterns
- Consistent with Obsidian's design system (CSS variables)
- Smaller bundle size
- Full touch/gesture control

**Cons:**
- More development effort
- Need to handle edge cases (leap years, timezones, etc.)

### Option 2: react-mobile-picker

A lightweight iOS-style wheel picker component.

**Package:** `react-mobile-picker` (npm)
**GitHub:** https://github.com/adcentury/react-mobile-picker

**Key Features:**
- Controlled component pattern (matches existing prompt architecture)
- Wheel scrolling via `wheelMode` prop ('natural' | 'normal' | 'off')
- Touch gesture support built-in
- Minimal styling (customizable via render props)
- ~5kb gzipped

**API Example:**
```tsx
<Picker value={pickerValue} onChange={setPickerValue} wheelMode="natural">
  <Picker.Column name="hour">
    {hours.map(h => <Picker.Item key={h} value={h}>{h}</Picker.Item>)}
  </Picker.Column>
  <Picker.Column name="minute">
    {minutes.map(m => <Picker.Item key={m} value={m}>{m}</Picker.Item>)}
  </Picker.Column>
</Picker>
```

### Option 3: Hybrid Approach (Recommended)

Combine a custom calendar grid for dates with wheel pickers for time. This provides:
- Visual calendar for date selection (familiar paradigm)
- Wheel picker for time (fast, touch-friendly)
- Text input fallback for power users

---

## Recommended UX Patterns

### Date Picker

**Primary Interaction: Calendar Grid**
- Display 6 weeks × 7 days grid (42 cells)
- Highlight today and selected date
- Month/year navigation header
- Swipe left/right to change months
- Swipe up/down to change years (or use arrow buttons)

**Secondary Interaction: Direct Input**
- Formatted input field (YYYY-MM-DD or locale-specific)
- Real-time validation
- Auto-complete partial dates (e.g., "15" → "2026-01-15")

**Mobile Enhancements:**
- Full-width calendar on small screens
- Minimum 44px touch targets
- Large tap areas for date cells

### Time Picker

**Primary Interaction: Wheel Picker**
- Hour wheel (1-12 or 0-23)
- Minute wheel (00-59, optionally stepped by 5 or 15)
- AM/PM wheel (if 12-hour format)
- Scroll/swipe to change values
- Desktop: mouse wheel support

**Secondary Interaction: Direct Input**
- Formatted input field (HH:MM or HH:MM:SS)
- inputMode="numeric" for mobile numeric keyboard
- Validation for valid time values

### DateTime Picker

**Combined Approach:**
1. Calendar grid for date selection
2. Wheel picker for time selection
3. Optional: tabs or segmented control to switch between date/time views
4. Show combined preview: "January 16, 2026 at 3:45 PM"

---

## Accessibility Requirements

Based on WCAG and UX best practices:

### Keyboard Navigation
- **Tab**: Move between picker elements
- **Arrow keys**: Navigate calendar grid / change wheel values
- **Enter**: Select date / confirm selection
- **Escape**: Close picker / cancel

### ARIA Attributes
```tsx
<div role="dialog" aria-label="Choose a date">
  <div role="grid" aria-label="January 2026">
    <div role="row">
      <div role="gridcell" aria-selected="true" tabIndex={0}>16</div>
    </div>
  </div>
</div>
```

### Screen Reader Support
- Announce selected date/time on change
- Provide context for navigation ("January 2026, press right arrow for February")
- Use `aria-live` for dynamic updates

### Visual Focus Indicators
- Clear focus ring on interactive elements
- High contrast between selected/unselected states
- Never rely solely on color for state indication

---

## Implementation Architecture

### Proposed Component Structure

```
src/
├── components/
│   ├── pickers/
│   │   ├── DatePicker.tsx        # Calendar grid component
│   │   ├── TimePicker.tsx        # Wheel picker for time
│   │   ├── DateTimePicker.tsx    # Combined picker
│   │   ├── CalendarGrid.tsx      # Calendar grid sub-component
│   │   ├── WheelColumn.tsx       # Single wheel column
│   │   └── hooks/
│   │       ├── useCalendar.ts    # Calendar calculation logic
│   │       ├── useWheelGesture.ts # Touch/wheel handling
│   │       └── useDateFormat.ts  # Date formatting utilities
```

### Type Definitions

```typescript
// Extend existing UserPrompt type
export interface UserPrompt {
  id: string;
  name: string;
  valueType: 'text' | 'numeric' | 'date' | 'time' | 'datetime';
  // Optional configuration for date/time prompts
  dateConfig?: {
    format?: string;           // e.g., 'YYYY-MM-DD', 'MM/DD/YYYY'
    minDate?: string;          // Minimum selectable date
    maxDate?: string;          // Maximum selectable date
  };
  timeConfig?: {
    format?: '12h' | '24h';    // 12-hour or 24-hour format
    minuteStep?: number;       // Step for minutes (1, 5, 15, 30)
    showSeconds?: boolean;     // Include seconds picker
  };
}
```

### Calendar Grid Logic

```typescript
// Calendar calculation helpers
export function getMonthDays(month: number, year: number): number {
  const months30 = [4, 6, 9, 11];
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return month === 2 ? (isLeapYear ? 29 : 28) :
         months30.includes(month) ? 30 : 31;
}

export function getFirstDayOfMonth(month: number, year: number): number {
  return new Date(year, month - 1, 1).getDay(); // 0 = Sunday
}

export function generateCalendarGrid(month: number, year: number): Date[][] {
  // Returns 6 weeks × 7 days array including prev/next month days
  const firstDay = getFirstDayOfMonth(month, year);
  const daysInMonth = getMonthDays(month, year);
  const daysInPrevMonth = getMonthDays(month - 1 || 12, month === 1 ? year - 1 : year);

  const grid: Date[][] = [];
  let dayCounter = 1;
  let nextMonthDay = 1;

  for (let week = 0; week < 6; week++) {
    const weekRow: Date[] = [];
    for (let day = 0; day < 7; day++) {
      const cellIndex = week * 7 + day;
      if (cellIndex < firstDay) {
        // Previous month
        weekRow.push(new Date(
          month === 1 ? year - 1 : year,
          (month - 2 + 12) % 12,
          daysInPrevMonth - (firstDay - cellIndex - 1)
        ));
      } else if (dayCounter <= daysInMonth) {
        // Current month
        weekRow.push(new Date(year, month - 1, dayCounter++));
      } else {
        // Next month
        weekRow.push(new Date(
          month === 12 ? year + 1 : year,
          month % 12,
          nextMonthDay++
        ));
      }
    }
    grid.push(weekRow);
  }

  return grid;
}
```

### Wheel Picker Implementation

```typescript
interface WheelColumnProps {
  values: string[];
  selectedValue: string;
  onChange: (value: string) => void;
  itemHeight?: number;     // Default: 36px
  visibleItems?: number;   // Default: 5
}

function WheelColumn({ values, selectedValue, onChange, itemHeight = 36, visibleItems = 5 }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Touch/mouse handling
  const handleTouchStart = (e: TouchEvent) => { /* ... */ };
  const handleTouchMove = (e: TouchEvent) => { /* ... */ };
  const handleTouchEnd = () => { /* snap to nearest item */ };

  // Wheel handling for desktop
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = Math.sign(e.deltaY);
    const currentIndex = values.indexOf(selectedValue);
    const newIndex = Math.max(0, Math.min(values.length - 1, currentIndex + delta));
    onChange(values[newIndex]);
  };

  return (
    <div
      ref={containerRef}
      className="wheel-column"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      // ... other event handlers
    >
      {values.map((value, index) => (
        <div
          key={value}
          className={`wheel-item ${value === selectedValue ? 'selected' : ''}`}
          style={{ height: itemHeight }}
        >
          {value}
        </div>
      ))}
    </div>
  );
}
```

---

## Gesture Handling

### Touch Gestures

```typescript
interface TouchState {
  startY: number;
  startTime: number;
  lastY: number;
  velocity: number;
}

function useWheelGesture(onValueChange: (delta: number) => void) {
  const touchState = useRef<TouchState | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchState.current = {
      startY: e.touches[0].clientY,
      startTime: Date.now(),
      lastY: e.touches[0].clientY,
      velocity: 0
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchState.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = touchState.current.lastY - currentY;
    const deltaTime = Date.now() - touchState.current.startTime;

    touchState.current.velocity = deltaY / deltaTime;
    touchState.current.lastY = currentY;

    // Emit change based on delta (threshold: item height)
    onValueChange(Math.round(deltaY / ITEM_HEIGHT));
  }, [onValueChange]);

  const handleTouchEnd = useCallback(() => {
    // Apply momentum scrolling based on velocity
    const velocity = touchState.current?.velocity || 0;
    // Animate to final position with easing
    touchState.current = null;
  }, []);

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}
```

### Swipe for Calendar Navigation

```typescript
function useSwipeNavigation(onPrevMonth: () => void, onNextMonth: () => void) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;

    // Horizontal swipe detection (min 50px, more horizontal than vertical)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        onPrevMonth();
      } else {
        onNextMonth();
      }
    }

    touchStart.current = null;
  };

  return { handleTouchStart, handleTouchEnd };
}
```

---

## CSS Styling

### Calendar Grid Styles

```css
/* Calendar Container */
.date-picker-calendar {
  width: 100%;
  background: var(--background-primary);
  border-radius: 8px;
  overflow: hidden;
}

/* Calendar Header */
.date-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 8px;
  background: var(--background-secondary);
}

.date-picker-header-title {
  font-weight: 600;
  color: var(--text-normal);
}

.date-picker-nav-btn {
  padding: 8px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  min-width: 44px;
  min-height: 44px;
}

.date-picker-nav-btn:hover {
  background: var(--background-modifier-hover);
  color: var(--text-normal);
}

/* Calendar Grid */
.date-picker-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  padding: 8px;
}

/* Day Headers */
.date-picker-day-header {
  text-align: center;
  font-size: 0.75em;
  font-weight: 500;
  color: var(--text-muted);
  padding: 8px 0;
}

/* Date Cells */
.date-picker-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.9em;
  color: var(--text-normal);
  transition: background-color 0.15s ease;
  min-height: 36px;
}

.date-picker-cell:hover {
  background: var(--background-modifier-hover);
}

.date-picker-cell.other-month {
  color: var(--text-muted);
  opacity: 0.5;
}

.date-picker-cell.today {
  border: 2px solid var(--interactive-accent);
}

.date-picker-cell.selected {
  background: var(--interactive-accent);
  color: var(--text-on-accent);
}

.date-picker-cell.selected:hover {
  background: var(--interactive-accent-hover);
}

/* Mobile Adjustments */
.is-mobile .date-picker-cell {
  min-height: 44px;
}

.is-mobile .date-picker-nav-btn {
  padding: 12px;
}
```

### Wheel Picker Styles

```css
/* Wheel Picker Container */
.wheel-picker {
  display: flex;
  justify-content: center;
  gap: 4px;
  background: var(--background-primary);
  border-radius: 8px;
  padding: 8px;
  user-select: none;
  touch-action: none;
}

/* Single Wheel Column */
.wheel-column {
  position: relative;
  height: 180px; /* 5 items × 36px */
  width: 60px;
  overflow: hidden;
  cursor: grab;
}

.wheel-column:active {
  cursor: grabbing;
}

/* Wheel Items Container */
.wheel-items {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  transition: transform 0.1s ease-out;
}

/* Individual Wheel Item */
.wheel-item {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1em;
  color: var(--text-muted);
  opacity: 0.4;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.wheel-item.selected {
  color: var(--text-normal);
  opacity: 1;
  font-weight: 500;
  transform: scale(1.1);
}

/* Selection Highlight */
.wheel-selection-highlight {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 36px;
  transform: translateY(-50%);
  background: var(--background-modifier-hover);
  border-radius: 4px;
  pointer-events: none;
}

/* Wheel Separator (for time: HH:MM) */
.wheel-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  font-weight: 600;
  color: var(--text-normal);
}

/* Mobile Wheel Adjustments */
.is-mobile .wheel-column {
  width: 80px;
}

.is-mobile .wheel-item {
  height: 44px;
  font-size: 1.2em;
}

.is-mobile .wheel-picker {
  height: 220px; /* 5 items × 44px */
}
```

---

## Date/Time Formatting

### Format Options

```typescript
export type DateFormat =
  | 'YYYY-MM-DD'      // ISO 8601 (default, recommended for filenames)
  | 'MM/DD/YYYY'      // US format
  | 'DD/MM/YYYY'      // European format
  | 'MMM DD, YYYY'    // Human readable (Jan 16, 2026)
  | 'YYYY-MM-DDTHH:mm'; // ISO datetime

export type TimeFormat =
  | 'HH:mm'           // 24-hour (default)
  | 'hh:mm a'         // 12-hour with AM/PM
  | 'HH:mm:ss';       // 24-hour with seconds

export function formatDate(date: Date, format: DateFormat): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  switch (format) {
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
    case 'MMM DD, YYYY': return `${monthNames[date.getMonth()]} ${day}, ${year}`;
    default: return `${year}-${month}-${day}`;
  }
}

export function formatTime(date: Date, format: TimeFormat): string {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours24 < 12 ? 'AM' : 'PM';

  switch (format) {
    case 'HH:mm': return `${String(hours24).padStart(2, '0')}:${minutes}`;
    case 'hh:mm a': return `${hours12}:${minutes} ${ampm}`;
    case 'HH:mm:ss': return `${String(hours24).padStart(2, '0')}:${minutes}:${seconds}`;
    default: return `${String(hours24).padStart(2, '0')}:${minutes}`;
  }
}
```

---

## Validation Updates

Update `src/utils/promptParser.ts`:

```typescript
export function validatePromptValue(
  value: string,
  prompt: UserPrompt
): PromptValidationResult {
  // Empty check
  if (!value.trim()) {
    return { valid: false, error: "Value cannot be empty" };
  }

  // Type-specific validation
  switch (prompt.valueType) {
    case 'numeric':
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, error: "Must be a valid number" };
      }
      break;

    case 'date':
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        return { valid: false, error: "Must be a valid date (YYYY-MM-DD)" };
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { valid: false, error: "Invalid date" };
      }
      break;

    case 'time':
      const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
      if (!timeRegex.test(value)) {
        return { valid: false, error: "Must be a valid time (HH:MM)" };
      }
      break;

    case 'datetime':
      const dtRegex = /^\d{4}-\d{2}-\d{2}T([01]?\d|2[0-3]):([0-5]\d)$/;
      if (!dtRegex.test(value)) {
        return { valid: false, error: "Must be a valid datetime" };
      }
      break;
  }

  // Filename character validation
  const INVALID_FILENAME_CHARS = /[*"\\/<>?|:\x00-\x1f]/g;
  if (INVALID_FILENAME_CHARS.test(value)) {
    return { valid: false, error: "Contains invalid filename characters" };
  }

  return { valid: true };
}
```

---

## Integration with PromptEntryView

```tsx
// In PromptEntryView.tsx, render different inputs based on valueType
function renderPromptInput(prompt: UserPrompt, value: string, onChange: (v: string) => void) {
  switch (prompt.valueType) {
    case 'date':
      return (
        <DatePicker
          value={value ? new Date(value) : new Date()}
          onChange={(date) => onChange(formatDate(date, 'YYYY-MM-DD'))}
        />
      );

    case 'time':
      return (
        <TimePicker
          value={value || formatTime(new Date(), 'HH:mm')}
          onChange={onChange}
          format="24h"
        />
      );

    case 'datetime':
      return (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          onChange={(dt) => onChange(dt.toISOString().slice(0, 16))}
        />
      );

    case 'numeric':
      return (
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
```

---

## Recommended Implementation Approach

### Phase 1: Core Infrastructure
1. Extend `UserPrompt` type with new value types
2. Add date/time formatting utilities
3. Update validation logic in `promptParser.ts`
4. Update `PromptEditor.tsx` with new type options

### Phase 2: Date Picker
1. Create `CalendarGrid` component with month navigation
2. Add touch swipe support for month navigation
3. Add keyboard navigation (arrow keys)
4. Style with Obsidian CSS variables

### Phase 3: Time Picker
1. Create `WheelColumn` component with scroll/touch support
2. Build `TimePicker` composing multiple wheel columns
3. Add desktop mouse wheel support
4. Add direct text input fallback

### Phase 4: DateTime Picker
1. Combine Date and Time pickers
2. Add tabbed or inline view switching
3. Show combined preview

### Phase 5: Polish
1. Mobile optimizations (touch targets, gestures)
2. Accessibility audit (keyboard, screen reader)
3. Animation/transition refinements
4. Default value handling ("now")

---

## External Library Consideration

If development time is constrained, `react-mobile-picker` is recommended:

**Installation:**
```bash
yarn add react-mobile-picker
```

**Pros:**
- Minimal footprint (~5kb)
- Controlled component pattern matches existing architecture
- Supports touch gestures and mouse wheel
- Render props for custom styling

**Cons:**
- Need to wrap for date-specific logic (month days, etc.)
- May need CSS overrides for Obsidian theme consistency

---

## Sources

- [Mobiscroll React DateTime Picker](https://demo.mobiscroll.com/react/datetime)
- [react-mobile-picker GitHub](https://github.com/adcentury/react-mobile-picker)
- [LogRocket: Creating a Custom React Datepicker](https://blog.logrocket.com/react-custom-datepicker/)
- [Time Picker UX: Best Practices - Eleken](https://www.eleken.co/blog-posts/time-picker-ux)
- [Date Picker UI Design - Cieden](https://cieden.com/book/atoms/date-picker/date-picker-ui)
- [Smashing Magazine: Designing The Perfect Date Time Picker](https://www.smashingmagazine.com/2017/07/designing-perfect-date-time-picker/)
- [Nielsen Norman Group: Date Input Form Fields](https://www.nngroup.com/articles/date-input/)
- [MUI X Date Pickers](https://mui.com/x/react-date-pickers/date-picker/)
- [LogRocket: Build Accessible Date Picker](https://blog.logrocket.com/how-to-build-an-accessible-date-picker-component-in-react/)
