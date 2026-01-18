/**
 * Collapsible Picker Wrapper Component
 *
 * Wraps date/time picker components with collapse/expand functionality.
 * Features:
 * - Default state: collapsed
 * - Auto-expand on focus (when not manually controlled)
 * - Auto-collapse on blur (when not manually controlled)
 * - Manual expand/collapse toggle button
 * - Manual interaction disables auto behavior
 */

import { useState, useCallback, useRef } from "react";

interface CollapsiblePickerProps {
  /** Display label for the picker (e.g., "Date", "Time") */
  label: string;
  /** Formatted value to show when collapsed */
  previewText: string;
  /** Default expanded state (default: false) */
  defaultExpanded?: boolean;
  /** The picker component to wrap */
  children: React.ReactNode;
}

export function CollapsiblePicker({
  label,
  previewText,
  defaultExpanded = false,
  children,
}: CollapsiblePickerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isManuallyControlled, setIsManuallyControlled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<number | null>(null);

  // Handle manual toggle
  const handleToggleClick = useCallback(() => {
    setIsManuallyControlled(true);
    setIsExpanded((prev) => !prev);
  }, []);

  // Handle focus on container - auto-expand if not manually controlled
  const handleFocus = useCallback(() => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    if (!isManuallyControlled) {
      setIsExpanded(true);
    }
  }, [isManuallyControlled]);

  // Handle blur on container - auto-collapse if focus moves outside
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // Use timeout to check if focus actually left the container
      // This handles the case where focus moves between child elements
      blurTimeoutRef.current = window.setTimeout(() => {
        // Check if the new focused element is outside our container
        const focusedElement = document.activeElement;
        const isOutside = !containerRef.current?.contains(focusedElement);

        if (isOutside && !isManuallyControlled) {
          setIsExpanded(false);
        }
        blurTimeoutRef.current = null;
      }, 10);
    },
    [isManuallyControlled]
  );

  // Handle keyboard on toggle button
  const handleToggleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggleClick();
      }
    },
    [handleToggleClick]
  );

  return (
    <div
      ref={containerRef}
      className={`collapsible-picker ${isExpanded ? "expanded" : "collapsed"}`}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* Header - always visible */}
      <div className="collapsible-picker-header">
        <span className="collapsible-picker-label">{label}</span>
        <span className="collapsible-picker-preview">{previewText}</span>
        <button
          type="button"
          className="collapsible-picker-toggle"
          onClick={handleToggleClick}
          onKeyDown={handleToggleKeyDown}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse picker" : "Expand picker"}
        >
          <svg
            className={`collapsible-picker-chevron ${isExpanded ? "rotated" : ""}`}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Content - shown when expanded */}
      <div
        className={`collapsible-picker-content ${isExpanded ? "expanded" : "collapsed"}`}
        aria-hidden={!isExpanded}
      >
        {children}
      </div>
    </div>
  );
}
