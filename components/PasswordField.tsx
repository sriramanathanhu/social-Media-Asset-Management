"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";

interface PasswordFieldProps {
  value: string;
  onChange?: (value: string) => void;
  label: string;
  placeholder?: string;
  readOnly?: boolean;
  helperText?: string;
  required?: boolean;
}

export default function PasswordField({
  value,
  onChange,
  label,
  placeholder = "Enter password",
  readOnly = false,
  helperText,
  required = false,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "0.5rem",
          fontWeight: "500",
          fontSize: "14px",
          color: "#333",
        }}
      >
        {label}
        {required && <span style={{ color: "#dc2626", marginLeft: "4px" }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          style={{
            width: "100%",
            padding: "0.5rem 5rem 0.5rem 0.75rem",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            backgroundColor: readOnly ? "#f9fafb" : "white",
            fontFamily: showPassword ? "inherit" : "monospace",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "0.5rem",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            gap: "0.25rem",
          }}
        >
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              padding: "0.25rem",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#666",
              display: "flex",
              alignItems: "center",
            }}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          {value && (
            <button
              type="button"
              onClick={handleCopy}
              style={{
                padding: "0.25rem",
                border: "none",
                background: "none",
                cursor: "pointer",
                color: copied ? "#22c55e" : "#666",
                display: "flex",
                alignItems: "center",
              }}
              title="Copy to clipboard"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          )}
        </div>
      </div>
      {helperText && (
        <p style={{ fontSize: "12px", color: "#666", marginTop: "0.25rem", fontStyle: "italic" }}>
          {helperText}
        </p>
      )}
    </div>
  );
}
