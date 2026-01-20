/**
 * Multi List Picker Component
 *
 * A dropdown list picker for selecting multiple options from a predefined list.
 * Features:
 * - Auto-opens on focus
 * - Stays open after selection (allows multiple selections)
 * - Checkmark and alternate background for selected items
 * - Toggle selection on click
 * - Clear button to remove all selections
 * - Keyboard navigation (arrow keys, Enter, Escape)
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

interface MultiListPickerProps {
  /** Currently selected values */
  values: string[];
  /** Available options to choose from */
  options: string[];
  /** Called when selection changes */
  onChange: (values: string[]) => void;
  /** Called when clear button is clicked */
  onClear: () => void;
  /** Placeholder text when no selection */
  placeholder?: string;
}

export function MultiListPicker({
  values,
  options,
  onChange,
  onClear,
  placeholder = "Select options...",
}: MultiListPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Track if focus just happened to avoid immediate close on click
  const justFocusedRef = useRef(false);

  // Create a Set for O(1) lookup of selected values
  const selectedSet = useMemo(() => new Set(values), [values]);

  // Display text for the input
  const displayText = useMemo(() => {
    if (values.length === 0) return "";
    if (values.length === 1) return values[0];
    return `${values.length} items selected`;
  }, [values]);

  // Reset highlighted index when options change or dropdown opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
    }
  }, [isOpen, options]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Toggle a value's selection
  const toggleValue = useCallback(
    (optionValue: string) => {
      if (selectedSet.has(optionValue)) {
        // Deselect - remove from values
        onChange(values.filter(v => v !== optionValue));
      } else {
        // Select - add to values (maintain order from options)
        const newValues = [...values, optionValue];
        // Sort by options order for consistent output
        newValues.sort((a, b) => options.indexOf(a) - options.indexOf(b));
        onChange(newValues);
      }
    },
    [values, selectedSet, onChange, options]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (options[highlightedIndex]) {
            toggleValue(options[highlightedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          break;
        case "Tab":
          setIsOpen(false);
          break;
      }
    },
    [isOpen, options, highlightedIndex, toggleValue]
  );

  // Handle option click (toggle selection)
  const handleOptionClick = useCallback(
    (optionValue: string) => {
      toggleValue(optionValue);
      // Don't close dropdown - allow multiple selections
    },
    [toggleValue]
  );

  // Handle focus - auto-open dropdown
  const handleFocus = useCallback(() => {
    justFocusedRef.current = true;
    setIsOpen(true);
  }, []);

  // Handle click - toggle dropdown, but skip if focus just opened it
  const handleClick = useCallback(() => {
    if (justFocusedRef.current) {
      // Focus just opened the dropdown, don't toggle it closed
      justFocusedRef.current = false;
      return;
    }
    setIsOpen((prev) => !prev);
  }, []);

  // Handle clear button click
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClear();
      setIsOpen(false);
    },
    [onClear]
  );

  return (
    <div
      ref={containerRef}
      className="multi-list-picker"
    >
      <div
        ref={inputRef}
        className="multi-list-picker-input"
        tabIndex={0}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={`multi-list-picker-value ${!displayText ? "placeholder" : ""}`}>
          {displayText || placeholder}
        </span>
        <div className="multi-list-picker-actions">
          {values.length > 0 && (
            <button
              type="button"
              className="multi-list-picker-clear"
              onClick={handleClear}
              tabIndex={-1}
              aria-label="Clear all selections"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="currentColor"
              >
                <path d="M9.5 2.5L2.5 9.5M2.5 2.5L9.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <svg
            className={`multi-list-picker-chevron ${isOpen ? "open" : ""}`}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </div>
      </div>

      {isOpen && options.length > 0 && (
        <ul
          ref={listRef}
          className="multi-list-picker-dropdown"
          role="listbox"
          aria-multiselectable="true"
        >
          {options.map((option, index) => {
            const isSelected = selectedSet.has(option);
            return (
              <li
                key={option}
                className={`multi-list-picker-option ${
                  index === highlightedIndex ? "is-highlighted" : ""
                } ${isSelected ? "is-selected" : ""}`}
                onClick={() => handleOptionClick(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={isSelected}
              >
                <span className="multi-list-picker-checkbox">
                  {isSelected && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                    >
                      <path
                        d="M2 6L5 9L10 3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  )}
                </span>
                <span className="multi-list-picker-label">{option}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
