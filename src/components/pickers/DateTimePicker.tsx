/**
 * DateTime Picker Component
 *
 * Combined date and time picker with tabbed interface.
 * Shows a unified preview of selected date and time.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { DatePicker } from "./DatePicker";
import { TimePicker } from "./TimePicker";
import {
  parseDateTime,
  parseDate,
  parseTime,
  formatDate,
  MONTH_NAMES,
  formatTimeValue,
} from "../../utils/dateTimeUtils";

interface DateTimePickerProps {
  /** Current value as ISO datetime string (YYYY-MM-DDTHH:mm) or empty */
  value: string;
  /** Called when datetime changes */
  onChange: (value: string) => void;
  /** Minute step interval (default: 1) */
  minuteStep?: 1 | 5 | 15 | 30;
  /** Whether to auto-focus on mount (default: false) */
  autoFocus?: boolean;
  /** Whether the field is optional - shows clear button when true */
  optional?: boolean;
  /** Called when clear button is clicked */
  onClear?: () => void;
}

type TabType = "date" | "time";

export function DateTimePicker({
  value,
  onChange,
  minuteStep = 1,
  autoFocus = false,
  optional = false,
  onClear,
}: DateTimePickerProps) {
  // Parse initial value or use now
  const initialDateTime = useMemo(() => {
    if (value) {
      const parsed = parseDateTime(value);
      if (parsed) {
        return parsed;
      }
    }
    return new Date();
  }, [value]);

  const [activeTab, setActiveTab] = useState<TabType>("date");
  const [dateValue, setDateValue] = useState(() =>
    formatDate(initialDateTime, "YYYY-MM-DD")
  );
  const [timeValue, setTimeValue] = useState(() => {
    const hours = String(initialDateTime.getHours()).padStart(2, "0");
    const minutes = String(initialDateTime.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  });

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      const parsed = parseDateTime(value);
      if (parsed) {
        setDateValue(formatDate(parsed, "YYYY-MM-DD"));
        const hours = String(parsed.getHours()).padStart(2, "0");
        const minutes = String(parsed.getMinutes()).padStart(2, "0");
        setTimeValue(`${hours}:${minutes}`);
      }
    }
  }, [value]);

  // Combine date and time and emit change
  const emitChange = useCallback(
    (newDate: string, newTime: string) => {
      const datetime = `${newDate}T${newTime}`;
      onChange(datetime);
    },
    [onChange]
  );

  // Handle date change
  const handleDateChange = useCallback(
    (newDate: string) => {
      setDateValue(newDate);
      emitChange(newDate, timeValue);
    },
    [emitChange, timeValue]
  );

  // Handle time change
  const handleTimeChange = useCallback(
    (newTime: string) => {
      setTimeValue(newTime);
      emitChange(dateValue, newTime);
    },
    [emitChange, dateValue]
  );

  // Format preview string (always use 12h format for readability)
  const previewString = useMemo(() => {
    const dateParsed = parseDate(dateValue);
    const timeParsed = parseTime(timeValue);

    if (!dateParsed || !timeParsed) {
      return "Select date and time";
    }

    const monthName = MONTH_NAMES[dateParsed.getMonth()];
    const day = dateParsed.getDate();
    const year = dateParsed.getFullYear();
    const timeStr = formatTimeValue(timeParsed.hours, timeParsed.minutes, "12h");

    return `${monthName} ${day}, ${year} at ${timeStr}`;
  }, [dateValue, timeValue]);

  // Handle "Now" button
  const handleNowClick = useCallback(() => {
    const now = new Date();
    const newDate = formatDate(now, "YYYY-MM-DD");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const newTime = `${hours}:${minutes}`;

    setDateValue(newDate);
    setTimeValue(newTime);
    emitChange(newDate, newTime);
  }, [emitChange]);

  return (
    <div className="datetime-picker">
      {/* Preview */}
      <div className="datetime-picker-preview" aria-live="polite">
        {previewString}
      </div>

      {/* Tabs */}
      <div className="datetime-picker-tabs" role="tablist">
        <button
          type="button"
          className={`datetime-picker-tab ${activeTab === "date" ? "active" : ""}`}
          onClick={() => setActiveTab("date")}
          role="tab"
          aria-selected={activeTab === "date"}
          aria-controls="datetime-date-panel"
          tabIndex={-1}
        >
          Date
        </button>
        <button
          type="button"
          className={`datetime-picker-tab ${activeTab === "time" ? "active" : ""}`}
          onClick={() => setActiveTab("time")}
          role="tab"
          aria-selected={activeTab === "time"}
          aria-controls="datetime-time-panel"
          tabIndex={-1}
        >
          Time
        </button>
      </div>

      {/* Tab panels */}
      <div className="datetime-picker-panels">
        <div
          id="datetime-date-panel"
          className={`datetime-picker-panel ${activeTab === "date" ? "active" : ""}`}
          role="tabpanel"
          hidden={activeTab !== "date"}
        >
          <DatePicker value={dateValue} onChange={handleDateChange} autoFocus={autoFocus} />
        </div>

        <div
          id="datetime-time-panel"
          className={`datetime-picker-panel ${activeTab === "time" ? "active" : ""}`}
          role="tabpanel"
          hidden={activeTab !== "time"}
        >
          <TimePicker
            value={timeValue}
            onChange={handleTimeChange}
            minuteStep={minuteStep}
            showNowButton={false}
          />
        </div>
      </div>

      {/* Footer with Now button and optional Clear button */}
      <div className="datetime-picker-footer">
        <button
          type="button"
          className="datetime-picker-now-btn"
          onClick={handleNowClick}
          tabIndex={-1}
        >
          Now
        </button>
        {optional && onClear && (
          <button
            type="button"
            className="datetime-picker-clear-btn"
            onClick={onClear}
            title="Clear date and time"
            tabIndex={-1}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
