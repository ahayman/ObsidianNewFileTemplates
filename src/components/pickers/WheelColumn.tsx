/**
 * Wheel Column Component
 *
 * A single scrollable column for picker wheels (iOS-style).
 * Supports touch drag, mouse wheel, and keyboard navigation.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

interface WheelColumnProps {
  /** Array of values to display */
  values: string[];
  /** Currently selected value */
  selectedValue: string;
  /** Called when value changes */
  onChange: (value: string) => void;
  /** Height of each item in pixels (default: 40) */
  itemHeight?: number;
  /** Number of visible items (default: 5, must be odd) */
  visibleItems?: number;
  /** Label for accessibility */
  label?: string;
}

// Animation constants
const MOMENTUM_FRICTION = 0.95;
const MOMENTUM_MIN_VELOCITY = 0.5;
const SNAP_DURATION = 150;

export function WheelColumn({
  values,
  selectedValue,
  onChange,
  itemHeight = 40,
  visibleItems = 5,
  label = "value",
}: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const touchStateRef = useRef<{
    startY: number;
    startOffset: number;
    lastY: number;
    lastTime: number;
    velocity: number;
  } | null>(null);

  // Calculate the offset needed to center the selected item
  const selectedIndex = useMemo(
    () => values.indexOf(selectedValue),
    [values, selectedValue]
  );
  const centerOffset = Math.floor(visibleItems / 2) * itemHeight;

  // Current scroll offset (negative values scroll up)
  const [offset, setOffset] = useState(() => -selectedIndex * itemHeight);

  // Update offset when selected value changes externally
  useEffect(() => {
    const newOffset = -selectedIndex * itemHeight;
    setOffset(newOffset);
  }, [selectedIndex, itemHeight]);

  // Calculate which index is currently centered
  const getCenteredIndex = useCallback(
    (currentOffset: number) => {
      const index = Math.round(-currentOffset / itemHeight);
      return Math.max(0, Math.min(values.length - 1, index));
    },
    [itemHeight, values.length]
  );

  // Snap to nearest item
  const snapToNearest = useCallback(
    (currentOffset: number, animated = true) => {
      const targetIndex = getCenteredIndex(currentOffset);
      const targetOffset = -targetIndex * itemHeight;

      if (animated) {
        // Animate to target
        const startOffset = currentOffset;
        const startTime = performance.now();

        const animate = (time: number) => {
          const elapsed = time - startTime;
          const progress = Math.min(1, elapsed / SNAP_DURATION);
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const newOffset = startOffset + (targetOffset - startOffset) * eased;

          setOffset(newOffset);

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            setOffset(targetOffset);
            if (values[targetIndex] !== selectedValue) {
              onChange(values[targetIndex]);
            }
          }
        };

        animationRef.current = requestAnimationFrame(animate);
      } else {
        setOffset(targetOffset);
        if (values[targetIndex] !== selectedValue) {
          onChange(values[targetIndex]);
        }
      }
    },
    [getCenteredIndex, itemHeight, onChange, selectedValue, values]
  );

  // Apply momentum and then snap
  const applyMomentum = useCallback(
    (initialVelocity: number, startOffset: number) => {
      let velocity = initialVelocity;
      let currentOffset = startOffset;
      let lastTime = performance.now();

      const animate = (time: number) => {
        const deltaTime = time - lastTime;
        lastTime = time;

        velocity *= MOMENTUM_FRICTION;
        currentOffset += velocity * deltaTime * 0.1;

        // Clamp to valid range
        const minOffset = -(values.length - 1) * itemHeight;
        const maxOffset = 0;
        currentOffset = Math.max(minOffset, Math.min(maxOffset, currentOffset));

        setOffset(currentOffset);

        if (Math.abs(velocity) > MOMENTUM_MIN_VELOCITY) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          snapToNearest(currentOffset);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [itemHeight, snapToNearest, values.length]
  );

  // Cancel any ongoing animation
  const cancelAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      cancelAnimation();
      const touch = e.touches[0];
      touchStateRef.current = {
        startY: touch.clientY,
        startOffset: offset,
        lastY: touch.clientY,
        lastTime: performance.now(),
        velocity: 0,
      };
    },
    [cancelAnimation, offset]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStateRef.current) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStateRef.current.startY;
      const now = performance.now();
      const deltaTime = now - touchStateRef.current.lastTime;

      // Calculate velocity
      if (deltaTime > 0) {
        const instantVelocity =
          (touch.clientY - touchStateRef.current.lastY) / deltaTime;
        touchStateRef.current.velocity =
          touchStateRef.current.velocity * 0.5 + instantVelocity * 0.5;
      }

      touchStateRef.current.lastY = touch.clientY;
      touchStateRef.current.lastTime = now;

      // Update offset
      let newOffset = touchStateRef.current.startOffset + deltaY;

      // Add resistance at boundaries
      const minOffset = -(values.length - 1) * itemHeight;
      const maxOffset = 0;
      if (newOffset > maxOffset) {
        newOffset = maxOffset + (newOffset - maxOffset) * 0.3;
      } else if (newOffset < minOffset) {
        newOffset = minOffset + (newOffset - minOffset) * 0.3;
      }

      setOffset(newOffset);
    },
    [itemHeight, values.length]
  );

  const handleTouchEnd = useCallback(() => {
    if (!touchStateRef.current) return;

    const velocity = touchStateRef.current.velocity * 10;
    const currentOffset = offset;

    touchStateRef.current = null;

    // Clamp offset to valid range first
    const minOffset = -(values.length - 1) * itemHeight;
    const maxOffset = 0;
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, currentOffset));

    if (Math.abs(velocity) > 2) {
      applyMomentum(velocity, clampedOffset);
    } else {
      snapToNearest(clampedOffset);
    }
  }, [applyMomentum, itemHeight, offset, snapToNearest, values.length]);

  // Mouse wheel handler
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      cancelAnimation();

      const delta = e.deltaY > 0 ? 1 : -1;
      const newIndex = Math.max(
        0,
        Math.min(values.length - 1, selectedIndex + delta)
      );

      if (newIndex !== selectedIndex) {
        const targetOffset = -newIndex * itemHeight;
        setOffset(targetOffset);
        onChange(values[newIndex]);
      }
    },
    [cancelAnimation, itemHeight, onChange, selectedIndex, values]
  );

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let newIndex = selectedIndex;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newIndex = Math.max(0, selectedIndex - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          newIndex = Math.min(values.length - 1, selectedIndex + 1);
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          newIndex = values.length - 1;
          break;
        default:
          return;
      }

      if (newIndex !== selectedIndex) {
        onChange(values[newIndex]);
      }
    },
    [onChange, selectedIndex, values]
  );

  // Click handler for direct selection
  const handleItemClick = useCallback(
    (value: string) => {
      cancelAnimation();
      onChange(value);
    },
    [cancelAnimation, onChange]
  );

  // Calculate container height
  const containerHeight = visibleItems * itemHeight;

  return (
    <div
      ref={containerRef}
      className="wheel-column"
      style={{ height: containerHeight }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label={label}
      aria-activedescendant={`wheel-item-${selectedValue}`}
    >
      {/* Selection highlight */}
      <div
        className="wheel-selection-highlight"
        style={{
          top: centerOffset,
          height: itemHeight,
        }}
      />

      {/* Gradient overlays for fade effect */}
      <div className="wheel-fade-top" style={{ height: centerOffset }} />
      <div className="wheel-fade-bottom" style={{ height: centerOffset }} />

      {/* Items */}
      <div
        ref={itemsRef}
        className="wheel-items"
        style={{
          transform: `translateY(${offset + centerOffset}px)`,
        }}
      >
        {values.map((value, index) => {
          const isSelected = value === selectedValue;
          const distanceFromCenter = Math.abs(
            offset + index * itemHeight
          ) / itemHeight;
          const opacity = Math.max(0.3, 1 - distanceFromCenter * 0.2);
          const scale = Math.max(0.85, 1 - distanceFromCenter * 0.05);

          return (
            <div
              key={value}
              id={`wheel-item-${value}`}
              className={`wheel-item ${isSelected ? "selected" : ""}`}
              style={{
                height: itemHeight,
                opacity,
                transform: `scale(${scale})`,
              }}
              onClick={() => handleItemClick(value)}
              role="option"
              aria-selected={isSelected}
            >
              {value}
            </div>
          );
        })}
      </div>
    </div>
  );
}
