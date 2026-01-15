"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Lock, Mail, Key, Globe, FileText, Shield, Folder } from "lucide-react";
import PasswordField from "@/components/PasswordField";
import TOTPField from "@/components/TOTPField";
import GoogleAccountSelector from "@/components/GoogleAccountSelector";

type LoginType = "email_password" | "google_oauth";

interface SecureLoginFolder {
  id: number;
  name: string;
  color: string;
  parent_id: number | null;
}

export default function NewSecureLoginPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folders, setFolders] = useState<SecureLoginFolder[]>([]);

  // Form state
  const [itemName, setItemName] = useState("");
  const [loginType, setLoginType] = useState<LoginType>("email_password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [linkedGoogleAccountId, setLinkedGoogleAccountId] = useState<number | null>(null);
  const [folderId, setFolderId] = useState<number | null>(null);

  // Load folders
  useEffect(() => {
    fetch("/api/secure-logins/folders")
      .then((res) => res.json())
      .then((data) => {
        setFolders(data.folders || []);
      })
      .catch((err) => console.error("Error loading folders:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!itemName.trim()) {
      setError("Item name is required");
      return;
    }

    if (loginType === "email_password" && !username.trim()) {
      setError("Username is required for email/password login");
      return;
    }

    if (loginType === "google_oauth" && !linkedGoogleAccountId) {
      setError("Please select a Google account");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/secure-logins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: itemName.trim(),
          login_type: loginType,
          username: loginType === "email_password" ? username.trim() : null,
          password: password || null,
          totp_secret: totpSecret || null,
          website_url: websiteUrl.trim() || null,
          notes: notes.trim() || null,
          linked_google_account_id: loginType === "google_oauth" ? linkedGoogleAccountId : null,
          folder_id: folderId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/secure-logins/${data.secureLogin.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create secure login");
      }
    } catch (err) {
      console.error("Error creating secure login:", err);
      setError("Failed to create secure login");
    } finally {
      setSaving(false);
    }
  };

  // Build folder options with hierarchy indication
  const getFolderOptions = () => {
    const rootFolders = folders.filter(f => f.parent_id === null);
    const options: { id: number; name: string; depth: number }[] = [];

    const addFolder = (folder: SecureLoginFolder, depth: number) => {
      options.push({ id: folder.id, name: folder.name, depth });
      const children = folders.filter(f => f.parent_id === folder.id);
      children.forEach(child => addFolder(child, depth + 1));
    };

    rootFolders.forEach(folder => addFolder(folder, 0));
    return options;
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/secure-logins"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#666",
            textDecoration: "none",
            marginBottom: "1rem",
          }}
        >
          <ArrowLeft size={18} />
          Back to Secure Logins
        </Link>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "600", color: "#333", margin: 0 }}>
          <Lock size={24} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
          Add New Secure Login
        </h1>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>
          Store credentials securely and share with team members
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            color: "#dc2626",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          {/* Item Name */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                fontSize: "14px",
                color: "#333",
              }}
            >
              <FileText size={14} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
              Item Name
              <span style={{ color: "#dc2626", marginLeft: "4px" }}>*</span>
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g., Company Twitter Account"
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </div>

          {/* Folder Selection */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                fontSize: "14px",
                color: "#333",
              }}
            >
              <Folder size={14} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
              Folder (Optional)
            </label>
            <select
              value={folderId || ""}
              onChange={(e) => setFolderId(e.target.value ? parseInt(e.target.value) : null)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              <option value="">No folder (Root level)</option>
              {getFolderOptions().map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {"—".repeat(folder.depth)} {folder.name}
                </option>
              ))}
            </select>
            <p style={{ fontSize: "12px", color: "#888", marginTop: "0.25rem" }}>
              Organize this login into a folder for easier management
            </p>
          </div>

          {/* Login Type */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                fontSize: "14px",
                color: "#333",
              }}
            >
              <Shield size={14} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
              Login Type
              <span style={{ color: "#dc2626", marginLeft: "4px" }}>*</span>
            </label>
            <div style={{ display: "flex", gap: "1rem" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  border: loginType === "email_password" ? "2px solid #2563eb" : "1px solid #ddd",
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor: loginType === "email_password" ? "#eff6ff" : "white",
                  flex: 1,
                }}
              >
                <input
                  type="radio"
                  name="loginType"
                  value="email_password"
                  checked={loginType === "email_password"}
                  onChange={() => setLoginType("email_password")}
                  style={{ display: "none" }}
                />
                <Mail size={18} color={loginType === "email_password" ? "#2563eb" : "#666"} />
                <span style={{ fontWeight: loginType === "email_password" ? "500" : "400" }}>
                  Email / Password
                </span>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  border: loginType === "google_oauth" ? "2px solid #2563eb" : "1px solid #ddd",
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor: loginType === "google_oauth" ? "#eff6ff" : "white",
                  flex: 1,
                }}
              >
                <input
                  type="radio"
                  name="loginType"
                  value="google_oauth"
                  checked={loginType === "google_oauth"}
                  onChange={() => setLoginType("google_oauth")}
                  style={{ display: "none" }}
                />
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill={loginType === "google_oauth" ? "#2563eb" : "#666"}
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill={loginType === "google_oauth" ? "#2563eb" : "#666"}
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill={loginType === "google_oauth" ? "#2563eb" : "#666"}
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill={loginType === "google_oauth" ? "#2563eb" : "#666"}
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span style={{ fontWeight: loginType === "google_oauth" ? "500" : "400" }}>
                  Google OAuth
                </span>
              </label>
            </div>
          </div>

          {/* Conditional Fields based on Login Type */}
          {loginType === "email_password" ? (
            <>
              {/* Username */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "500",
                    fontSize: "14px",
                    color: "#333",
                  }}
                >
                  <Mail size={14} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
                  Username / Email
                  <span style={{ color: "#dc2626", marginLeft: "4px" }}>*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username or email"
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: "1.5rem" }}>
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  label="Password"
                  placeholder="Enter password"
                  helperText="Password will be encrypted before storage"
                />
              </div>
            </>
          ) : (
            <>
              {/* Google Account Selector */}
              <div style={{ marginBottom: "1.5rem" }}>
                <GoogleAccountSelector
                  value={linkedGoogleAccountId}
                  onChange={setLinkedGoogleAccountId}
                  label="Linked Google Account"
                  required
                  helperText="Select an existing Google account from your Email IDs"
                />
              </div>

              {/* Account Password (for Google accounts) */}
              <div style={{ marginBottom: "1.5rem" }}>
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  label="Account Password (Optional)"
                  placeholder="Enter account password if needed"
                  helperText="Store the password for this Google account if required for access"
                />
              </div>
            </>
          )}

          {/* TOTP Secret */}
          <div style={{ marginBottom: "1.5rem" }}>
            <TOTPField
              value={totpSecret}
              onChange={setTotpSecret}
              label="TOTP Secret Key (Optional)"
              placeholder="Enter TOTP secret for 2FA"
              helperText="If this account uses 2FA, enter the secret key for generating codes"
            />
          </div>

          {/* Website URL */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                fontSize: "14px",
                color: "#333",
              }}
            >
              <Globe size={14} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
              Website URL (Optional)
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com/login"
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                fontSize: "14px",
                color: "#333",
              }}
            >
              <FileText size={14} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional information..."
              rows={4}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
                resize: "vertical",
              }}
            />
          </div>

          {/* Info Box */}
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#f0f9ff",
              borderRadius: "8px",
              marginBottom: "1.5rem",
            }}
          >
            <p style={{ fontSize: "13px", color: "#0369a1", margin: 0 }}>
              <Key size={14} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
              <strong>Security Note:</strong> All sensitive information (passwords, TOTP secrets) is encrypted
              before being stored. You can manage who has access to this item after creation.
            </p>
          </div>

          {/* Submit Button */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
            <Link
              href="/secure-logins"
              style={{
                padding: "0.75rem 1.5rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
                color: "#666",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                backgroundColor: saving ? "#93c5fd" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              <Save size={18} />
              {saving ? "Saving..." : "Create Secure Login"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
