/**
 * Mock SyntaxInput for testing
 * Renders as a regular input element for easier testing
 */

import React from "react";

interface SyntaxInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  enableVariables?: boolean;
  enablePrompts?: boolean;
  id?: string;
  className?: string;
}

export function SyntaxInput({
  value,
  onChange,
  placeholder,
  id,
  className = "",
}: SyntaxInputProps) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`file-template-syntax-input ${className}`}
    />
  );
}
