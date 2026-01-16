/**
 * Calendar Grid Component
 *
 * Displays a 6-week × 7-day grid for date selection.
 * Supports touch tap selection and keyboard navigation.
 */

import { useCallback, useMemo, useRef, useEffect } from "react";
import {
  generateCalendarGrid,
  isSameDay,
  isToday,
  DAY_NAMES_SHORT,
} from "../../utils/dateTimeUtils";

interface CalendarGridProps {
  /** Currently displayed month (1-12) */
  month: number;
  /** Currently displayed year */
  year: number;
  /** Currently selected date */
  selectedDate: Date | null;
  /** Called when a date is selected */
  onDateSelect: (date: Date) => void;
  /** Called when focus should move to previous month */
  onPrevMonth?: () => void;
  /** Called when focus should move to next month */
  onNextMonth?: () => void;
  /** Whether to auto-focus on mount (default: false) */
  autoFocus?: boolean;
}

export function CalendarGrid({
  month,
  year,
  selectedDate,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
  autoFocus = false,
}: CalendarGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const focusedDateRef = useRef<Date | null>(selectedDate);

  // Generate the calendar grid
  const grid = useMemo(() => generateCalendarGrid(month, year), [month, year]);

  // Check if a date is in the current month
  const isCurrentMonth = useCallback(
    (date: Date) => {
      return date.getMonth() + 1 === month && date.getFullYear() === year;
    },
    [month, year]
  );

  // Handle date cell click
  const handleDateClick = useCallback(
    (date: Date) => {
      onDateSelect(date);
    },
    [onDateSelect]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, date: Date) => {
      let newDate: Date | null = null;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          newDate = new Date(date);
          newDate.setDate(date.getDate() - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          newDate = new Date(date);
          newDate.setDate(date.getDate() + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          newDate = new Date(date);
          newDate.setDate(date.getDate() - 7);
          break;
        case "ArrowDown":
          e.preventDefault();
          newDate = new Date(date);
          newDate.setDate(date.getDate() + 7);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          onDateSelect(date);
          return;
        case "Home":
          e.preventDefault();
          newDate = new Date(year, month - 1, 1);
          break;
        case "End":
          e.preventDefault();
          newDate = new Date(year, month, 0); // Last day of current month
          break;
        case "PageUp":
          e.preventDefault();
          if (onPrevMonth) onPrevMonth();
          return;
        case "PageDown":
          e.preventDefault();
          if (onNextMonth) onNextMonth();
          return;
      }

      if (newDate) {
        focusedDateRef.current = newDate;
        // If new date is outside current month, trigger navigation
        if (newDate.getMonth() + 1 !== month || newDate.getFullYear() !== year) {
          if (newDate < new Date(year, month - 1, 1)) {
            if (onPrevMonth) onPrevMonth();
          } else {
            if (onNextMonth) onNextMonth();
          }
        }
        // Focus the new date cell
        requestAnimationFrame(() => {
          const dateStr = newDate!.toISOString().split("T")[0];
          const cell = gridRef.current?.querySelector(
            `[data-date="${dateStr}"]`
          ) as HTMLElement;
          cell?.focus();
        });
      }
    },
    [month, year, onDateSelect, onPrevMonth, onNextMonth]
  );

  // Focus selected date on mount only if autoFocus is true
  useEffect(() => {
    if (autoFocus && selectedDate && gridRef.current) {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const cell = gridRef.current.querySelector(
        `[data-date="${dateStr}"]`
      ) as HTMLElement;
      if (cell && isCurrentMonth(selectedDate)) {
        cell.focus();
      }
    }
    // Only run on mount, not on selectedDate changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  return (
    <div className="date-picker-grid-container" ref={gridRef} role="grid" aria-label="Calendar">
      {/* Day headers */}
      <div className="date-picker-day-headers" role="row">
        {DAY_NAMES_SHORT.map((day, index) => (
          <div
            key={index}
            className="date-picker-day-header"
            role="columnheader"
            aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][index]}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="date-picker-grid" role="rowgroup">
        {grid.map((week, weekIndex) => (
          <div key={weekIndex} className="date-picker-week" role="row">
            {week.map((date) => {
              const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
              const isTodayDate = isToday(date);
              const isOtherMonth = !isCurrentMonth(date);
              const dateStr = date.toISOString().split("T")[0];

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={`date-picker-cell ${isSelected ? "selected" : ""} ${
                    isTodayDate ? "today" : ""
                  } ${isOtherMonth ? "other-month" : ""}`}
                  data-date={dateStr}
                  onClick={() => handleDateClick(date)}
                  onKeyDown={(e) => handleKeyDown(e, date)}
                  tabIndex={isSelected || (!selectedDate && isTodayDate) ? 0 : -1}
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={date.toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
