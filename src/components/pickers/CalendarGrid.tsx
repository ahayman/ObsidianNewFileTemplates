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
  getPreviousMonth,
  getNextMonth,
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
  /** Called when focus should move to previous year */
  onPrevYear?: () => void;
  /** Called when focus should move to next year */
  onNextYear?: () => void;
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
  onPrevYear,
  onNextYear,
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

  // Find which row a date falls in within the displayed grid
  const getDateRowIndex = useCallback(
    (date: Date): number => {
      for (let row = 0; row < grid.length; row++) {
        for (const gridDate of grid[row]) {
          if (isSameDay(gridDate, date)) {
            return row;
          }
        }
      }
      return -1; // Date not in grid
    },
    [grid]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, date: Date) => {
      let newDate: Date | null = null;
      let navigated = false;

      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const rowIndex = getDateRowIndex(date);
      const isLeftEdge = dayOfWeek === 0; // Sunday
      const isRightEdge = dayOfWeek === 6; // Saturday
      const isTopRow = rowIndex === 0;
      const isBottomRow = rowIndex === grid.length - 1;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (isLeftEdge) {
            // At left edge (Sunday) - go to previous month
            if (onPrevMonth) {
              onPrevMonth();
              navigated = true;
              // Focus Saturday (column 6) at the same row in the new grid
              const { month: newMonth, year: newYear } = getPreviousMonth(month, year);
              const newGrid = generateCalendarGrid(newMonth, newYear);
              newDate = newGrid[rowIndex][6]; // Same row, Saturday
            }
          } else {
            newDate = new Date(date);
            newDate.setDate(date.getDate() - 1);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (isRightEdge) {
            // At right edge (Saturday) - go to next month
            if (onNextMonth) {
              onNextMonth();
              navigated = true;
              // Focus Sunday (column 0) at the same row in the new grid
              const { month: newMonth, year: newYear } = getNextMonth(month, year);
              const newGrid = generateCalendarGrid(newMonth, newYear);
              newDate = newGrid[rowIndex][0]; // Same row, Sunday
            }
          } else {
            newDate = new Date(date);
            newDate.setDate(date.getDate() + 1);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (isTopRow) {
            // At top row - go to previous year (same month)
            if (onPrevYear) {
              onPrevYear();
              navigated = true;
              // Focus bottom row at the same column (day of week) in the new grid
              const dayOfWeek = date.getDay();
              const newGrid = generateCalendarGrid(month, year - 1);
              newDate = newGrid[newGrid.length - 1][dayOfWeek]; // Bottom row, same column
            }
          } else {
            newDate = new Date(date);
            newDate.setDate(date.getDate() - 7);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (isBottomRow) {
            // At bottom row - go to next year (same month)
            if (onNextYear) {
              onNextYear();
              navigated = true;
              // Focus top row at the same column (day of week) in the new grid
              const dayOfWeek = date.getDay();
              const newGrid = generateCalendarGrid(month, year + 1);
              newDate = newGrid[0][dayOfWeek]; // Top row, same column
            }
          } else {
            newDate = new Date(date);
            newDate.setDate(date.getDate() + 7);
          }
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
          if (e.shiftKey && onPrevYear) {
            onPrevYear();
          } else if (onPrevMonth) {
            onPrevMonth();
          }
          return;
        case "PageDown":
          e.preventDefault();
          if (e.shiftKey && onNextYear) {
            onNextYear();
          } else if (onNextMonth) {
            onNextMonth();
          }
          return;
      }

      if (newDate) {
        focusedDateRef.current = newDate;

        // Check if the new date is visible in the current grid (including greyed-out days)
        const isInCurrentGrid = grid.some(week =>
          week.some(gridDate => isSameDay(gridDate, newDate!))
        );

        // Only trigger navigation if we haven't already navigated AND the date is NOT in the current grid
        // This allows focusing greyed-out days from prev/next month without changing the view
        if (!navigated && !isInCurrentGrid) {
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
    [month, year, grid, getDateRowIndex, onDateSelect, onPrevMonth, onNextMonth, onPrevYear, onNextYear]
  );

  // Handle keyboard navigation when the grid container is focused (no specific cell)
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Only handle arrow keys when the grid container itself is focused
      if (e.target !== gridRef.current) return;

      const arrowKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
      if (!arrowKeys.includes(e.key)) return;

      e.preventDefault();

      // Determine starting date: use selected date, focused date, or today
      const startDate = selectedDate || focusedDateRef.current || new Date();

      // Focus the appropriate cell based on the starting date
      // If the starting date is in the current month, focus it
      // Otherwise, focus the first day of the current month
      let targetDate: Date;
      if (startDate.getMonth() + 1 === month && startDate.getFullYear() === year) {
        targetDate = startDate;
      } else {
        // Focus first day of current month
        targetDate = new Date(year, month - 1, 1);
      }

      const dateStr = targetDate.toISOString().split("T")[0];
      const cell = gridRef.current?.querySelector(
        `[data-date="${dateStr}"]`
      ) as HTMLElement;

      if (cell) {
        cell.focus();
        // After focusing, dispatch the same key event to trigger navigation
        // Use a small delay to ensure focus is set first
        requestAnimationFrame(() => {
          handleKeyDown(e, targetDate);
        });
      }
    },
    [selectedDate, month, year, handleKeyDown]
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
    <div
      className="date-picker-grid-container"
      ref={gridRef}
      role="grid"
      aria-label="Calendar"
      tabIndex={0}
      onKeyDown={handleGridKeyDown}
    >
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
                  tabIndex={-1}
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
