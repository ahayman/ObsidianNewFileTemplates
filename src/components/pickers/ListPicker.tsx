/**
 * List Picker Component
 *
 * A dropdown list picker for selecting a single option from a predefined list.
 * Features:
 * - Auto-opens on focus
 * - Auto-closes on selection
 * - Clear button to remove selection
 * - Keyboard navigation (arrow keys, Enter, Escape)
 */

import { useState, useRef, useEffect, useCallback } from "react";

interface ListPickerProps {
  /** Currently selected value */
  value: string;
  /** Available options to choose from */
  options: string[];
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Called when clear button is clicked */
  onClear: () => void;
  /** Placeholder text when no selection */
  placeholder?: string;
}

export function ListPicker({
  value,
  options,
  onChange,
  onClear,
  placeholder = "Select an option...",
}: ListPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Track if focus just happened to avoid immediate close on click
  const justFocusedRef = useRef(false);

  // Reset highlighted index when options change or dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Try to highlight the currently selected value
      const selectedIndex = options.indexOf(value);
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, options, value]);

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
          e.preventDefault();
          if (options[highlightedIndex]) {
            onChange(options[highlightedIndex]);
            setIsOpen(false);
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
    [isOpen, options, highlightedIndex, onChange]
  );

  // Handle option selection
  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
    },
    [onChange]
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
      className="list-picker"
    >
      <div
        ref={inputRef}
        className="list-picker-input"
        tabIndex={0}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={`list-picker-value ${!value ? "placeholder" : ""}`}>
          {value || placeholder}
        </span>
        <div className="list-picker-actions">
          {value && (
            <button
              type="button"
              className="list-picker-clear"
              onClick={handleClear}
              tabIndex={-1}
              aria-label="Clear selection"
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
            className={`list-picker-chevron ${isOpen ? "open" : ""}`}
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
          className="list-picker-dropdown"
          role="listbox"
        >
          {options.map((option, index) => (
            <li
              key={option}
              className={`list-picker-option ${
                index === highlightedIndex ? "is-highlighted" : ""
              } ${option === value ? "is-selected" : ""}`}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={option === value}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
