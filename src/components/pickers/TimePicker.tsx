/**
 * Time Picker Component
 *
 * Wheel-based time picker with hour, minute, and optional AM/PM columns.
 * Supports 12-hour and 24-hour formats.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { WheelColumn } from "./WheelColumn";
import {
  generateHours,
  generateMinutes,
  parseTime,
  getCurrentTime,
  roundMinutesToStep,
  TimeFormat,
} from "../../utils/dateTimeUtils";

interface TimePickerProps {
  /** Current value as time string (HH:mm) or empty */
  value: string;
  /** Called when time changes */
  onChange: (value: string) => void;
  /** Initial time format: 12-hour or 24-hour (default: 12h) */
  format?: TimeFormat;
  /** Minute step interval (default: 1) */
  minuteStep?: 1 | 5 | 15 | 30;
  /** Whether to auto-focus on mount (default: false) - reserved for future use */
  autoFocus?: boolean;
  /** Whether the field is optional - shows clear button when true */
  optional?: boolean;
  /** Called when clear button is clicked */
  onClear?: () => void;
  /** Whether to show the Now button (default: true, set false when embedded in DateTimePicker) */
  showNowButton?: boolean;
}

export function TimePicker({
  value,
  onChange,
  format: initialFormat = "12h",
  minuteStep = 1,
  autoFocus: _autoFocus = false,
  optional = false,
  onClear,
  showNowButton = true,
}: TimePickerProps) {
  // Track current format (user can toggle)
  const [format, setFormat] = useState<TimeFormat>(initialFormat);
  // Parse initial time or use current time
  const initialTime = useMemo(() => {
    if (value) {
      const parsed = parseTime(value);
      if (parsed) {
        return {
          hours: parsed.hours,
          minutes: roundMinutesToStep(parsed.minutes, minuteStep),
        };
      }
    }
    const current = getCurrentTime();
    return {
      hours: current.hours,
      minutes: roundMinutesToStep(current.minutes, minuteStep),
    };
  }, [value, minuteStep]);

  const [hours, setHours] = useState(initialTime.hours);
  const [minutes, setMinutes] = useState(initialTime.minutes);

  // Generate value arrays
  const hourValues = useMemo(() => generateHours(format), [format]);
  const minuteValues = useMemo(() => generateMinutes(minuteStep), [minuteStep]);
  const ampmValues = useMemo(() => ["AM", "PM"], []);

  // Calculate display values
  const displayHour = useMemo(() => {
    if (format === "12h") {
      const h = hours % 12 || 12;
      return String(h);
    }
    return String(hours).padStart(2, "0");
  }, [hours, format]);

  const displayMinute = useMemo(
    () => String(minutes).padStart(2, "0"),
    [minutes]
  );

  const displayAmpm = useMemo(() => (hours < 12 ? "AM" : "PM"), [hours]);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      const parsed = parseTime(value);
      if (parsed) {
        setHours(parsed.hours);
        setMinutes(roundMinutesToStep(parsed.minutes, minuteStep));
      }
    }
  }, [value, minuteStep]);

  // Emit change
  const emitChange = useCallback(
    (newHours: number, newMinutes: number) => {
      const timeStr = `${String(newHours).padStart(2, "0")}:${String(
        newMinutes
      ).padStart(2, "0")}`;
      onChange(timeStr);
    },
    [onChange]
  );

  // Handle hour change
  const handleHourChange = useCallback(
    (hourStr: string) => {
      let newHours: number;

      if (format === "12h") {
        const hourNum = parseInt(hourStr);
        const isPM = hours >= 12;
        if (hourNum === 12) {
          newHours = isPM ? 12 : 0;
        } else {
          newHours = isPM ? hourNum + 12 : hourNum;
        }
      } else {
        newHours = parseInt(hourStr);
      }

      setHours(newHours);
      emitChange(newHours, minutes);
    },
    [emitChange, format, hours, minutes]
  );

  // Handle minute change
  const handleMinuteChange = useCallback(
    (minuteStr: string) => {
      const newMinutes = parseInt(minuteStr);
      setMinutes(newMinutes);
      emitChange(hours, newMinutes);
    },
    [emitChange, hours]
  );

  // Handle AM/PM change
  const handleAmpmChange = useCallback(
    (ampm: string) => {
      let newHours = hours;

      if (ampm === "AM" && hours >= 12) {
        newHours = hours - 12;
      } else if (ampm === "PM" && hours < 12) {
        newHours = hours + 12;
      }

      if (newHours !== hours) {
        setHours(newHours);
        emitChange(newHours, minutes);
      }
    },
    [emitChange, hours, minutes]
  );

  // Handle "Now" button click
  const handleNowClick = useCallback(() => {
    const current = getCurrentTime();
    const roundedMinutes = roundMinutesToStep(current.minutes, minuteStep);
    setHours(current.hours);
    setMinutes(roundedMinutes);
    emitChange(current.hours, roundedMinutes);
  }, [emitChange, minuteStep]);

  return (
    <div className="time-picker">
      <div className="time-picker-wheels">
        {/* Hour wheel */}
        <WheelColumn
          values={hourValues}
          selectedValue={displayHour}
          onChange={handleHourChange}
          label="Hour"
        />

        {/* Separator */}
        <div className="time-picker-separator">:</div>

        {/* Minute wheel */}
        <WheelColumn
          values={minuteValues}
          selectedValue={displayMinute}
          onChange={handleMinuteChange}
          label="Minute"
        />

        {/* AM/PM wheel (12-hour format only) */}
        {format === "12h" && (
          <WheelColumn
            values={ampmValues}
            selectedValue={displayAmpm}
            onChange={handleAmpmChange}
            label="AM/PM"
          />
        )}
      </div>

      {/* Actions row below wheels */}
      <div className="time-picker-actions">
        {showNowButton && (
          <button
            type="button"
            className="time-picker-now-btn"
            onClick={handleNowClick}
            tabIndex={-1}
          >
            Now
          </button>
        )}
        <button
          type="button"
          className="time-picker-format-toggle"
          onClick={() => setFormat(format === "12h" ? "24h" : "12h")}
          title={format === "12h" ? "Switch to 24-hour format" : "Switch to 12-hour format"}
          tabIndex={-1}
        >
          {format === "12h" ? "24h" : "12h"}
        </button>
        {optional && onClear && (
          <button
            type="button"
            className="time-picker-clear-btn"
            onClick={onClear}
            title="Clear time"
            tabIndex={-1}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
