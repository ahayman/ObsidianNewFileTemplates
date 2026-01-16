/**
 * Date Picker Component
 *
 * Full date picker with calendar grid, month/year navigation,
 * and touch swipe support.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { CalendarGrid } from "./CalendarGrid";
import { DatePickerHeader } from "./DatePickerHeader";
import {
  formatDate,
  parseDate,
  getPreviousMonth,
  getNextMonth,
} from "../../utils/dateTimeUtils";

interface DatePickerProps {
  /** Current value as ISO date string (YYYY-MM-DD) or empty */
  value: string;
  /** Called when date changes */
  onChange: (value: string) => void;
  /** Minimum selectable date (YYYY-MM-DD) */
  minDate?: string;
  /** Maximum selectable date (YYYY-MM-DD) */
  maxDate?: string;
  /** Whether to auto-focus on mount (default: false) */
  autoFocus?: boolean;
}

// Minimum swipe distance in pixels to trigger navigation
const SWIPE_THRESHOLD = 50;
// Maximum vertical distance for horizontal swipe detection
const SWIPE_VERTICAL_THRESHOLD = 100;

export function DatePicker({ value, onChange, minDate, maxDate, autoFocus = false }: DatePickerProps) {
  // Parse initial date or use today
  const initialDate = value ? parseDate(value) : new Date();
  const [displayMonth, setDisplayMonth] = useState(
    initialDate ? initialDate.getMonth() + 1 : new Date().getMonth() + 1
  );
  const [displayYear, setDisplayYear] = useState(
    initialDate ? initialDate.getFullYear() : new Date().getFullYear()
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialDate || new Date()
  );

  // Touch tracking for swipe gestures
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update selected date when value prop changes
  useEffect(() => {
    if (value) {
      const parsed = parseDate(value);
      if (parsed) {
        setSelectedDate(parsed);
        setDisplayMonth(parsed.getMonth() + 1);
        setDisplayYear(parsed.getFullYear());
      }
    }
  }, [value]);

  // Navigation handlers
  const handlePrevMonth = useCallback(() => {
    const { month, year } = getPreviousMonth(displayMonth, displayYear);
    setDisplayMonth(month);
    setDisplayYear(year);
  }, [displayMonth, displayYear]);

  const handleNextMonth = useCallback(() => {
    const { month, year } = getNextMonth(displayMonth, displayYear);
    setDisplayMonth(month);
    setDisplayYear(year);
  }, [displayMonth, displayYear]);

  const handlePrevYear = useCallback(() => {
    setDisplayYear((y) => y - 1);
  }, []);

  const handleNextYear = useCallback(() => {
    setDisplayYear((y) => y + 1);
  }, []);

  // Date selection handler
  const handleDateSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      // Navigate to the selected date's month if different
      if (date.getMonth() + 1 !== displayMonth || date.getFullYear() !== displayYear) {
        setDisplayMonth(date.getMonth() + 1);
        setDisplayYear(date.getFullYear());
      }
      onChange(formatDate(date, "YYYY-MM-DD"));
    },
    [displayMonth, displayYear, onChange]
  );

  // Touch event handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Check for horizontal swipe (more horizontal than vertical)
      if (
        Math.abs(deltaX) > SWIPE_THRESHOLD &&
        Math.abs(deltaY) < SWIPE_VERTICAL_THRESHOLD
      ) {
        if (deltaX > 0) {
          // Swipe right - go to previous month
          handlePrevMonth();
        } else {
          // Swipe left - go to next month
          handleNextMonth();
        }
      }
      // Check for vertical swipe (more vertical than horizontal)
      else if (
        Math.abs(deltaY) > SWIPE_THRESHOLD &&
        Math.abs(deltaX) < SWIPE_VERTICAL_THRESHOLD
      ) {
        if (deltaY > 0) {
          // Swipe down - go to previous year
          handlePrevYear();
        } else {
          // Swipe up - go to next year
          handleNextYear();
        }
      }

      touchStartRef.current = null;
    },
    [handlePrevMonth, handleNextMonth, handlePrevYear, handleNextYear]
  );

  // Handle "Today" button click
  const handleTodayClick = useCallback(() => {
    const today = new Date();
    setSelectedDate(today);
    setDisplayMonth(today.getMonth() + 1);
    setDisplayYear(today.getFullYear());
    onChange(formatDate(today, "YYYY-MM-DD"));
  }, [onChange]);

  return (
    <div
      ref={containerRef}
      className="date-picker"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <DatePickerHeader
        month={displayMonth}
        year={displayYear}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onPrevYear={handlePrevYear}
        onNextYear={handleNextYear}
      />

      <CalendarGrid
        month={displayMonth}
        year={displayYear}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        autoFocus={autoFocus}
      />

      {/* Today button */}
      <div className="date-picker-footer">
        <button
          type="button"
          className="date-picker-today-btn"
          onClick={handleTodayClick}
        >
          Today
        </button>
      </div>
    </div>
  );
}
