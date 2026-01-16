/**
 * Date Picker Header Component
 *
 * Displays month/year with navigation buttons.
 * Supports quick year navigation.
 */

import { useCallback } from "react";
import { MONTH_NAMES } from "../../utils/dateTimeUtils";

interface DatePickerHeaderProps {
  /** Currently displayed month (1-12) */
  month: number;
  /** Currently displayed year */
  year: number;
  /** Called when previous month button is clicked */
  onPrevMonth: () => void;
  /** Called when next month button is clicked */
  onNextMonth: () => void;
  /** Called when previous year button is clicked */
  onPrevYear: () => void;
  /** Called when next year button is clicked */
  onNextYear: () => void;
}

export function DatePickerHeader({
  month,
  year,
  onPrevMonth,
  onNextMonth,
  onPrevYear,
  onNextYear,
}: DatePickerHeaderProps) {
  const monthName = MONTH_NAMES[month - 1];

  return (
    <div className="date-picker-header">
      {/* Year navigation */}
      <button
        type="button"
        className="date-picker-nav-btn date-picker-nav-year"
        onClick={onPrevYear}
        aria-label="Previous year"
        title="Previous year"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        >
          <polyline points="11 17 6 12 11 7" />
          <polyline points="18 17 13 12 18 7" />
        </svg>
      </button>

      {/* Month navigation */}
      <button
        type="button"
        className="date-picker-nav-btn date-picker-nav-month"
        onClick={onPrevMonth}
        aria-label="Previous month"
        title="Previous month"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Month/Year display */}
      <div className="date-picker-header-title" aria-live="polite">
        <span className="date-picker-header-month">{monthName}</span>
        <span className="date-picker-header-year">{year}</span>
      </div>

      {/* Month navigation */}
      <button
        type="button"
        className="date-picker-nav-btn date-picker-nav-month"
        onClick={onNextMonth}
        aria-label="Next month"
        title="Next month"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Year navigation */}
      <button
        type="button"
        className="date-picker-nav-btn date-picker-nav-year"
        onClick={onNextYear}
        aria-label="Next year"
        title="Next year"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        >
          <polyline points="13 17 18 12 13 7" />
          <polyline points="6 17 11 12 6 7" />
        </svg>
      </button>
    </div>
  );
}
