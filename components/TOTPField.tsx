"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Copy, Check, Key, RefreshCw } from "lucide-react";

interface TOTPFieldProps {
  value: string;
  onChange?: (value: string) => void;
  label: string;
  placeholder?: string;
  readOnly?: boolean;
  helperText?: string;
  showGeneratedCode?: boolean; // When true, shows generated TOTP code instead of secret input
}

// Generate TOTP code from secret using the standard algorithm
function generateTOTP(secret: string): string {
  try {
    // Clean the secret - remove spaces and convert to uppercase
    const cleanSecret = secret.replace(/\s/g, '').toUpperCase();

    if (!cleanSecret) return '';

    // Base32 decode the secret
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const char of cleanSecret) {
      const val = base32Chars.indexOf(char);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }

    // Convert bits to bytes
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }

    if (bytes.length === 0) return '';

    // Get current time counter (30-second intervals)
    const counter = Math.floor(Date.now() / 30000);

    // Convert counter to 8-byte big-endian buffer
    const counterBytes = new Uint8Array(8);
    let tempCounter = counter;
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = tempCounter & 0xff;
      tempCounter = Math.floor(tempCounter / 256);
    }

    // HMAC-SHA1 computation using Web Crypto API alternative
    // For client-side, we'll use a simplified approach with crypto-js style
    const hmacSha1 = computeHmacSha1(new Uint8Array(bytes), counterBytes);

    // Dynamic truncation
    const offset = hmacSha1[19] & 0x0f;
    const code = (
      ((hmacSha1[offset] & 0x7f) << 24) |
      ((hmacSha1[offset + 1] & 0xff) << 16) |
      ((hmacSha1[offset + 2] & 0xff) << 8) |
      (hmacSha1[offset + 3] & 0xff)
    ) % 1000000;

    return code.toString().padStart(6, '0');
  } catch {
    return '';
  }
}

// Simple HMAC-SHA1 implementation for TOTP
function computeHmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  // SHA1 block size is 64 bytes
  const blockSize = 64;

  // If key is longer than block size, hash it
  let keyBytes = key;
  if (keyBytes.length > blockSize) {
    keyBytes = sha1(keyBytes);
  }

  // Pad key to block size
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes);

  // Create inner and outer padding
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }

  // Inner hash: SHA1(ipad || message)
  const innerData = new Uint8Array(ipad.length + message.length);
  innerData.set(ipad);
  innerData.set(message, ipad.length);
  const innerHash = sha1(innerData);

  // Outer hash: SHA1(opad || innerHash)
  const outerData = new Uint8Array(opad.length + innerHash.length);
  outerData.set(opad);
  outerData.set(innerHash, opad.length);

  return sha1(outerData);
}

// SHA1 implementation
function sha1(message: Uint8Array): Uint8Array {
  const H = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];

  // Pre-processing: adding padding bits
  const msgLen = message.length;
  const bitLen = msgLen * 8;

  // Message + 1 byte (0x80) + padding + 8 bytes length
  const paddedLen = Math.ceil((msgLen + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(message);
  padded[msgLen] = 0x80;

  // Append original length in bits as 64-bit big-endian
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, bitLen, false);

  // Process each 64-byte chunk
  for (let i = 0; i < paddedLen; i += 64) {
    const W = new Uint32Array(80);

    // Break chunk into sixteen 32-bit big-endian words
    for (let j = 0; j < 16; j++) {
      W[j] = view.getUint32(i + j * 4, false);
    }

    // Extend the sixteen 32-bit words into eighty 32-bit words
    for (let j = 16; j < 80; j++) {
      const temp = W[j - 3] ^ W[j - 8] ^ W[j - 14] ^ W[j - 16];
      W[j] = (temp << 1) | (temp >>> 31);
    }

    let [a, b, c, d, e] = H;

    for (let j = 0; j < 80; j++) {
      let f: number, k: number;
      if (j < 20) {
        f = (b & c) | ((~b) & d);
        k = 0x5A827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ED9EBA1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8F1BBCDC;
      } else {
        f = b ^ c ^ d;
        k = 0xCA62C1D6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + W[j]) >>> 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = temp;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
  }

  // Produce the final hash value (big-endian)
  const result = new Uint8Array(20);
  const resultView = new DataView(result.buffer);
  for (let i = 0; i < 5; i++) {
    resultView.setUint32(i * 4, H[i], false);
  }

  return result;
}

// Get seconds remaining until next TOTP refresh
function getSecondsRemaining(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

export default function TOTPField({
  value,
  onChange,
  label,
  placeholder = "Enter TOTP secret key",
  readOnly = false,
  helperText,
  showGeneratedCode = false,
}: TOTPFieldProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  // Generate TOTP code when secret changes or on timer
  const regenerateCode = useCallback(() => {
    if (value && showGeneratedCode) {
      const code = generateTOTP(value);
      setTotpCode(code);
    }
  }, [value, showGeneratedCode]);

  useEffect(() => {
    if (!showGeneratedCode || !value) return;

    // Generate initial code
    regenerateCode();
    setSecondsRemaining(getSecondsRemaining());

    // Update every second
    const interval = setInterval(() => {
      const remaining = getSecondsRemaining();
      setSecondsRemaining(remaining);

      // Regenerate code when timer resets
      if (remaining === 30) {
        regenerateCode();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [value, showGeneratedCode, regenerateCode]);

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

  const handleCopyCode = async () => {
    if (!totpCode) return;
    try {
      await navigator.clipboard.writeText(totpCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  // Calculate progress for circular timer
  const progress = (secondsRemaining / 30) * 100;
  const isLowTime = secondsRemaining <= 5;

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
        <Key size={14} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
        {label}
      </label>

      {/* Secret input field */}
      <div style={{ position: "relative" }}>
        <input
          type={showSecret ? "text" : "password"}
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
            fontFamily: "monospace",
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
            onClick={() => setShowSecret(!showSecret)}
            style={{
              padding: "0.25rem",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#666",
              display: "flex",
              alignItems: "center",
            }}
            title={showSecret ? "Hide secret" : "Show secret"}
          >
            {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          {value && !showGeneratedCode && (
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
              title="Copy secret to clipboard"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Generated TOTP Code Display */}
      {showGeneratedCode && value && totpCode && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "1rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {/* Circular countdown timer */}
              <div
                style={{
                  position: "relative",
                  width: "40px",
                  height: "40px",
                }}
              >
                <svg width="40" height="40" style={{ transform: "rotate(-90deg)" }}>
                  {/* Background circle */}
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="4"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke={isLowTime ? "#ef4444" : "#22c55e"}
                    strokeWidth="4"
                    strokeDasharray={`${progress} 100`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 0.3s ease" }}
                  />
                </svg>
                <span
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: isLowTime ? "#ef4444" : "#166534",
                  }}
                >
                  {secondsRemaining}
                </span>
              </div>

              {/* TOTP Code display */}
              <div>
                <p style={{ fontSize: "11px", color: "#166534", margin: "0 0 0.25rem 0", fontWeight: "500" }}>
                  Current Code
                </p>
                <p
                  style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    fontFamily: "monospace",
                    letterSpacing: "0.15em",
                    color: "#166534",
                    margin: 0,
                  }}
                >
                  {totpCode.substring(0, 3)} {totpCode.substring(3)}
                </p>
              </div>
            </div>

            {/* Copy code button */}
            <button
              type="button"
              onClick={handleCopyCode}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: copiedCode ? "#22c55e" : "#166534",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              {copiedCode ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy Code
                </>
              )}
            </button>
          </div>

          {isLowTime && (
            <p style={{ fontSize: "11px", color: "#ef4444", margin: "0.5rem 0 0 0", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <RefreshCw size={12} />
              Code expiring soon...
            </p>
          )}
        </div>
      )}

      {helperText && (
        <p style={{ fontSize: "12px", color: "#666", marginTop: "0.25rem", fontStyle: "italic" }}>
          {helperText}
        </p>
      )}
      {value && !showGeneratedCode && (
        <p style={{ fontSize: "11px", color: "#888", marginTop: "0.5rem" }}>
          Use this secret key with an authenticator app (Google Authenticator, Authy, etc.)
        </p>
      )}
    </div>
  );
}
