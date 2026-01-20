/**
 * Collapsible Picker Wrapper Component
 *
 * Wraps date/time picker components with collapse/expand functionality.
 * Features:
 * - Single tab stop - TAB enters/exits the field, arrow keys navigate within
 * - Default state: collapsed
 * - Auto-expand on focus (when not manually controlled)
 * - Auto-collapse on blur (when not manually controlled)
 * - Manual expand/collapse toggle button
 * - Escape key collapses and returns focus to header
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
  const headerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<number | null>(null);

  // Track if focus just happened to avoid immediate close on click
  // (same pattern as ListPicker)
  const justFocusedRef = useRef(false);

  // Handle manual toggle via the toggle button
  const handleToggleClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation(); // Don't trigger header click
    setIsManuallyControlled(true);
    setIsExpanded((prev) => !prev);
  }, []);

  // Handle click on header - expand if collapsed, but respect justFocusedRef
  const handleHeaderClick = useCallback(() => {
    if (justFocusedRef.current) {
      // Focus just expanded it, don't toggle closed
      justFocusedRef.current = false;
      return;
    }
    if (!isExpanded && !isManuallyControlled) {
      setIsExpanded(true);
    }
  }, [isExpanded, isManuallyControlled]);

  // Handle focus on container - auto-expand if not manually controlled
  const handleFocus = useCallback(() => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    if (!isManuallyControlled) {
      justFocusedRef.current = true;
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

  // Handle keyboard navigation on header
  const handleHeaderKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (!isExpanded) {
            setIsExpanded(true);
          } else {
            setIsManuallyControlled(true);
            setIsExpanded(false);
          }
          break;
        case "Escape":
          if (isExpanded) {
            e.preventDefault();
            setIsManuallyControlled(true);
            setIsExpanded(false);
            headerRef.current?.focus();
          }
          break;
        case "ArrowDown":
          if (!isExpanded) {
            e.preventDefault();
            setIsExpanded(true);
          }
          break;
      }
    },
    [isExpanded]
  );

  // Handle Escape key anywhere in the picker to collapse
  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        e.preventDefault();
        setIsManuallyControlled(true);
        setIsExpanded(false);
        headerRef.current?.focus();
      }
    },
    [isExpanded]
  );

  return (
    <div
      ref={containerRef}
      className={`collapsible-picker ${isExpanded ? "expanded" : "collapsed"}`}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleContainerKeyDown}
    >
      {/* Header - single tab stop for the picker */}
      <div
        ref={headerRef}
        className="collapsible-picker-header"
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-label={`${label}: ${previewText}`}
      >
        <span className="collapsible-picker-label">{label}</span>
        <span className="collapsible-picker-preview">{previewText}</span>
        <span
          className="collapsible-picker-toggle"
          onClick={handleToggleClick}
          aria-hidden="true"
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
        </span>
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
