/**
 * Searchable Select Component
 *
 * A dropdown with search/filter capability for large lists.
 */

import { useState, useRef, useEffect, useCallback } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  /** HTML id for the input */
  id: string;
  /** Currently selected value */
  value: string;
  /** Available options */
  options: SelectOption[];
  /** Placeholder text when empty */
  placeholder?: string;
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Optional className for styling */
  className?: string;
}

export function SearchableSelect({
  id,
  value,
  options,
  placeholder = "Search...",
  onChange,
  className = "",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Get the display label for the current value
  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  // Filter options based on search
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
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
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredOptions[highlightedIndex]) {
            onChange(filteredOptions[highlightedIndex].value);
            setIsOpen(false);
            setSearch("");
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSearch("");
          break;
        case "Tab":
          setIsOpen(false);
          setSearch("");
          break;
      }
    },
    [isOpen, filteredOptions, highlightedIndex, onChange]
  );

  // Handle option selection
  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
      setSearch("");
    },
    [onChange]
  );

  // Handle input focus
  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`file-template-searchable-select ${className}`}
    >
      <div className="file-template-searchable-select-input-wrapper">
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="file-template-searchable-select-input"
          value={isOpen ? search : selectedLabel}
          placeholder={isOpen ? placeholder : selectedLabel || placeholder}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button
          type="button"
          className="file-template-searchable-select-toggle"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              inputRef.current?.focus();
            }
          }}
          tabIndex={-1}
          aria-label="Toggle dropdown"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          className="file-template-searchable-select-dropdown"
          role="listbox"
        >
          {filteredOptions.length === 0 ? (
            <li className="file-template-searchable-select-empty">
              No matches found
            </li>
          ) : (
            filteredOptions.map((option, index) => (
              <li
                key={option.value}
                className={`file-template-searchable-select-option ${
                  index === highlightedIndex ? "is-highlighted" : ""
                } ${option.value === value ? "is-selected" : ""}`}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={option.value === value}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
