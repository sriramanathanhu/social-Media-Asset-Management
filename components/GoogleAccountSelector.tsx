"use client";

import { useEffect, useState } from "react";

interface GoogleAccount {
  id: number;
  email_address: string;
  ecosystem_name?: string;
  primary_use?: string;
  notes?: string;
}

interface GoogleAccountSelectorProps {
  value: number | null;
  onChange: (accountId: number | null) => void;
  label?: string;
  required?: boolean;
  helperText?: string;
}

export default function GoogleAccountSelector({
  value,
  onChange,
  label = "Google Account",
  required = false,
  helperText,
}: GoogleAccountSelectorProps) {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/secure-logins/google-accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      } else {
        setError("Failed to load Google accounts");
      }
    } catch (err) {
      console.error("Error loading Google accounts:", err);
      setError("Failed to load Google accounts");
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find((a) => a.id === value);

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

      {loading ? (
        <div
          style={{
            padding: "0.5rem",
            border: "1px solid #ddd",
            borderRadius: "6px",
            backgroundColor: "#f9fafb",
            color: "#666",
            fontSize: "14px",
          }}
        >
          Loading Google accounts...
        </div>
      ) : error ? (
        <div
          style={{
            padding: "0.5rem",
            border: "1px solid #fca5a5",
            borderRadius: "6px",
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      ) : accounts.length === 0 ? (
        <div
          style={{
            padding: "0.75rem",
            border: "1px solid #fcd34d",
            borderRadius: "6px",
            backgroundColor: "#fffbeb",
            color: "#92400e",
            fontSize: "14px",
          }}
        >
          No Google accounts available. Add Google email accounts in the Email IDs section to use them here.
        </div>
      ) : (
        <>
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: "white",
            }}
          >
            <option value="">Select a Google account...</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.email_address}
                {account.ecosystem_name ? ` (${account.ecosystem_name})` : ""}
              </option>
            ))}
          </select>

          {selectedAccount && (
            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                backgroundColor: "#f0f9ff",
                borderRadius: "6px",
                fontSize: "13px",
              }}
            >
              <p style={{ fontWeight: "500", color: "#0369a1" }}>{selectedAccount.email_address}</p>
              {selectedAccount.ecosystem_name && (
                <p style={{ color: "#666", marginTop: "0.25rem" }}>
                  Ecosystem: {selectedAccount.ecosystem_name}
                </p>
              )}
              {selectedAccount.primary_use && (
                <p style={{ color: "#666", marginTop: "0.25rem" }}>
                  Primary use: {selectedAccount.primary_use}
                </p>
              )}
              {selectedAccount.notes && (
                <p style={{ color: "#888", marginTop: "0.25rem", fontStyle: "italic" }}>
                  {selectedAccount.notes}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {helperText && (
        <p style={{ fontSize: "12px", color: "#666", marginTop: "0.25rem", fontStyle: "italic" }}>
          {helperText}
        </p>
      )}
    </div>
  );
}
