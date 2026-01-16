"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Lock,
  Mail,
  Key,
  Globe,
  FileText,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Users,
  Clock,
  ExternalLink,
  UserPlus,
} from "lucide-react";
import SecureLoginAccessManager from "@/components/SecureLoginAccessManager";
import TOTPField from "@/components/TOTPField";

type LoginType = "email_password" | "google_oauth";
type AccessLevel = "owner" | "edit" | "read";

interface GoogleAccount {
  id: number;
  email_address: string;
  ecosystem_name?: string;
}

interface Creator {
  id: number;
  name: string;
  email: string;
}

interface SecureLogin {
  id: number;
  item_name: string;
  login_type: LoginType;
  username: string | null;
  password: string | null;
  totp_secret: string | null;
  website_url: string | null;
  notes: string | null;
  linked_google_account_id: number | null;
  linked_google_account: GoogleAccount | null;
  created_at: string;
  updated_at: string;
  creator: Creator;
}

interface HistoryEntry {
  id: number;
  action: string;
  changes: string | null;
  performed_by: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
}

interface UserAccess {
  id: number;
  access_level: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  grantedByUser: {
    id: number;
    name: string;
  } | null;
  created_at: string;
}

interface GroupAccess {
  id: number;
  access_level: string;
  group: {
    id: number;
    name: string;
  };
  grantedByUser: {
    id: number;
    name: string;
  } | null;
  created_at: string;
}

export default function SecureLoginDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [secureLogin, setSecureLogin] = useState<SecureLogin | null>(null);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("read");
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [showAccessManager, setShowAccessManager] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Access data
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [groupAccess, setGroupAccess] = useState<GroupAccess[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [showAccessSection, setShowAccessSection] = useState(true);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSecureLogin();
  }, [resolvedParams.id]);

  const loadSecureLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/secure-logins/${resolvedParams.id}`);

      if (res.status === 404) {
        setNotFound(true);
        return;
      }

      if (res.status === 403) {
        setError("You do not have permission to view this item");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setSecureLogin(data.secureLogin);
        setAccessLevel(data.accessLevel);
      } else {
        setError("Failed to load secure login");
      }
    } catch (err) {
      console.error("Error loading secure login:", err);
      setError("Failed to load secure login");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/secure-logins/${resolvedParams.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadAccessData = async () => {
    try {
      setLoadingAccess(true);
      const res = await fetch(`/api/secure-logins/${resolvedParams.id}/access`);
      if (res.ok) {
        const data = await res.json();
        setUserAccess(data.userAccess || []);
        setGroupAccess(data.groupAccess || []);
      }
    } catch (err) {
      console.error("Error loading access data:", err);
    } finally {
      setLoadingAccess(false);
    }
  };

  // Load access data on mount
  useEffect(() => {
    if (secureLogin) {
      loadAccessData();
    }
  }, [secureLogin?.id]);

  const handleShowHistory = () => {
    if (!showHistory) {
      loadHistory();
    }
    setShowHistory(!showHistory);
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/secure-logins/${resolvedParams.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/secure-logins");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete");
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error("Error deleting:", err);
      setError("Failed to delete");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const canEdit = accessLevel === "owner" || accessLevel === "edit";
  const isOwner = accessLevel === "owner";

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "#666", marginTop: "1rem" }}>Loading...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <Lock size={48} style={{ color: "#ccc", marginBottom: "1rem" }} />
        <h2 style={{ color: "#333" }}>Not Found</h2>
        <p style={{ color: "#666" }}>This secure login item does not exist or you don&apos;t have access to it.</p>
        <Link
          href="/secure-logins"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "1rem",
            color: "#2563eb",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={18} />
          Back to Secure Logins
        </Link>
      </div>
    );
  }

  if (error && !secureLogin) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <Shield size={48} style={{ color: "#dc2626", marginBottom: "1rem" }} />
        <h2 style={{ color: "#333" }}>Access Denied</h2>
        <p style={{ color: "#666" }}>{error}</p>
        <Link
          href="/secure-logins"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "1rem",
            color: "#2563eb",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={18} />
          Back to Secure Logins
        </Link>
      </div>
    );
  }

  if (!secureLogin) return null;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "600", color: "#333", margin: 0 }}>
              <Lock size={24} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
              {secureLogin.item_name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.25rem 0.75rem",
                  backgroundColor: secureLogin.login_type === "google_oauth" ? "#fef3c7" : "#dbeafe",
                  color: secureLogin.login_type === "google_oauth" ? "#92400e" : "#1e40af",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: "500",
                }}
              >
                {secureLogin.login_type === "google_oauth" ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    </svg>
                    Google OAuth
                  </>
                ) : (
                  <>
                    <Mail size={12} />
                    Email/Password
                  </>
                )}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.25rem 0.75rem",
                  backgroundColor: isOwner ? "#dcfce7" : canEdit ? "#dbeafe" : "#f3f4f6",
                  color: isOwner ? "#166534" : canEdit ? "#1e40af" : "#4b5563",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: "500",
                }}
              >
                <Shield size={12} />
                {isOwner ? "Owner" : canEdit ? "Can Edit" : "Read Only"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {isOwner && (
              <button
                onClick={() => setShowAccessManager(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                <UserPlus size={16} />
                Manage Access
              </button>
            )}
            {canEdit && (
              <Link
                href={`/secure-logins/${secureLogin.id}/edit`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                <Edit size={16} />
                Edit
              </Link>
            )}
            {isOwner && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "#fef2f2",
                  color: "#dc2626",
                  border: "1px solid #fca5a5",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
          </div>
        </div>
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

      {/* Credentials Section */}
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginBottom: "1rem" }}>
          <Key size={18} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
          Credentials
        </h2>

        <div style={{ display: "grid", gap: "1rem" }}>
          {/* Username / Google Account */}
          {secureLogin.login_type === "email_password" ? (
            <div>
              <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "0.25rem" }}>
                Username / Email
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "14px", fontWeight: "500" }}>{secureLogin.username || "—"}</span>
                {secureLogin.username && (
                  <button
                    onClick={() => handleCopy(secureLogin.username!, "username")}
                    style={{
                      padding: "0.25rem",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: copiedField === "username" ? "#22c55e" : "#666",
                    }}
                    title="Copy"
                  >
                    {copiedField === "username" ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "0.25rem" }}>
                Linked Google Account
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span style={{ fontSize: "14px", fontWeight: "500" }}>
                  {secureLogin.linked_google_account?.email_address || "—"}
                </span>
                {secureLogin.linked_google_account?.ecosystem_name && (
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    ({secureLogin.linked_google_account.ecosystem_name})
                  </span>
                )}
                {secureLogin.linked_google_account?.email_address && (
                  <button
                    onClick={() => handleCopy(secureLogin.linked_google_account!.email_address, "google")}
                    style={{
                      padding: "0.25rem",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: copiedField === "google" ? "#22c55e" : "#666",
                    }}
                    title="Copy"
                  >
                    {copiedField === "google" ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "0.25rem" }}>
              Password
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {secureLogin.password ? (
                <>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      fontFamily: showPassword ? "inherit" : "monospace",
                    }}
                  >
                    {showPassword ? secureLogin.password : "••••••••••••"}
                  </span>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      padding: "0.25rem",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: "#666",
                    }}
                    title={showPassword ? "Hide" : "Show"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => handleCopy(secureLogin.password!, "password")}
                    style={{
                      padding: "0.25rem",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: copiedField === "password" ? "#22c55e" : "#666",
                    }}
                    title="Copy"
                  >
                    {copiedField === "password" ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </>
              ) : (
                <span style={{ fontSize: "14px", color: "#999" }}>Not set</span>
              )}
            </div>
          </div>

          {/* TOTP Secret with Generated Code */}
          <div>
            {secureLogin.totp_secret ? (
              <TOTPField
                value={secureLogin.totp_secret}
                label="TOTP / 2FA Code"
                readOnly
                showGeneratedCode={true}
                helperText="Copy the 6-digit code above to use for 2FA login"
              />
            ) : (
              <div>
                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "0.25rem" }}>
                  TOTP / 2FA
                </label>
                <span style={{ fontSize: "14px", color: "#999" }}>Not configured</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Info Section */}
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginBottom: "1rem" }}>
          <FileText size={18} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
          Additional Information
        </h2>

        <div style={{ display: "grid", gap: "1rem" }}>
          {/* Website URL */}
          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "0.25rem" }}>
              <Globe size={12} style={{ display: "inline", marginRight: "0.25rem", verticalAlign: "middle" }} />
              Website URL
            </label>
            {secureLogin.website_url ? (
              <a
                href={secureLogin.website_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "#2563eb",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                {secureLogin.website_url}
                <ExternalLink size={14} />
              </a>
            ) : (
              <span style={{ fontSize: "14px", color: "#999" }}>Not set</span>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "0.25rem" }}>
              Notes
            </label>
            {secureLogin.notes ? (
              <p
                style={{
                  fontSize: "14px",
                  color: "#333",
                  whiteSpace: "pre-wrap",
                  margin: 0,
                  padding: "0.75rem",
                  backgroundColor: "#f9fafb",
                  borderRadius: "6px",
                }}
              >
                {secureLogin.notes}
              </p>
            ) : (
              <span style={{ fontSize: "14px", color: "#999" }}>No notes</span>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "600", color: "#333", margin: 0 }}>
            <Clock size={18} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
            Metadata
          </h2>
          <button
            onClick={handleShowHistory}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              backgroundColor: showHistory ? "#dbeafe" : "#f3f4f6",
              color: showHistory ? "#1e40af" : "#374151",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            <Clock size={14} />
            {showHistory ? "Hide History" : "View History"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "0.25rem" }}>
              Created By
            </label>
            <span style={{ fontSize: "14px" }}>
              {secureLogin.creator.name} ({secureLogin.creator.email})
            </span>
          </div>
          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "0.25rem" }}>
              Created At
            </label>
            <span style={{ fontSize: "14px" }}>{formatDate(secureLogin.created_at)}</span>
          </div>
          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "0.25rem" }}>
              Last Updated
            </label>
            <span style={{ fontSize: "14px" }}>{formatDate(secureLogin.updated_at)}</span>
          </div>
        </div>

        {/* History */}
        {showHistory && (
          <div style={{ marginTop: "1.5rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "1rem" }}>
              Change History
            </h3>
            {loadingHistory ? (
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : history.length === 0 ? (
              <p style={{ color: "#666", fontSize: "14px" }}>No history available</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#f9fafb",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span style={{ fontWeight: "500" }}>{entry.action}</span>
                      <span style={{ color: "#666" }}>{formatDate(entry.created_at)}</span>
                    </div>
                    <div style={{ color: "#666" }}>
                      by {entry.performed_by.name}
                    </div>
                    {entry.changes && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          padding: "0.5rem",
                          backgroundColor: "#e5e7eb",
                          borderRadius: "4px",
                          fontFamily: "monospace",
                          fontSize: "12px",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {entry.changes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Access Section */}
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "600", color: "#333", margin: 0 }}>
            <Users size={18} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
            Access ({userAccess.length + groupAccess.length + 1})
          </h2>
          <button
            onClick={() => setShowAccessSection(!showAccessSection)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              backgroundColor: showAccessSection ? "#dbeafe" : "#f3f4f6",
              color: showAccessSection ? "#1e40af" : "#374151",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {showAccessSection ? "Hide" : "Show"} Access List
          </button>
        </div>

        {showAccessSection && (
          <div>
            {loadingAccess ? (
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {/* Owner */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem",
                    backgroundColor: "#f0fdf4",
                    borderRadius: "8px",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        backgroundColor: "#22c55e",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                    >
                      {secureLogin.creator.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: "500", fontSize: "14px" }}>
                        {secureLogin.creator.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {secureLogin.creator.email}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "0.25rem 0.75rem",
                      backgroundColor: "#dcfce7",
                      color: "#166534",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "500",
                    }}
                  >
                    Owner
                  </span>
                </div>

                {/* User Access */}
                {userAccess.map((access) => (
                  <div
                    key={`user-${access.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: access.access_level === "edit" ? "#3b82f6" : "#6b7280",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "14px",
                          fontWeight: "600",
                        }}
                      >
                        {access.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: "500", fontSize: "14px" }}>
                          {access.user.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          {access.user.email}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: access.access_level === "edit" ? "#dbeafe" : "#f3f4f6",
                          color: access.access_level === "edit" ? "#1e40af" : "#4b5563",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        {access.access_level === "edit" ? "Can Edit" : "Read Only"}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Group Access */}
                {groupAccess.map((access) => (
                  <div
                    key={`group-${access.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem",
                      backgroundColor: "#fefce8",
                      borderRadius: "8px",
                      border: "1px solid #fef08a",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          backgroundColor: "#eab308",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "14px",
                          fontWeight: "600",
                        }}
                      >
                        <Users size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: "500", fontSize: "14px" }}>
                          {access.group.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          Group
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: access.access_level === "edit" ? "#dbeafe" : "#f3f4f6",
                          color: access.access_level === "edit" ? "#1e40af" : "#4b5563",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        {access.access_level === "edit" ? "Can Edit" : "Read Only"}
                      </span>
                    </div>
                  </div>
                ))}

                {userAccess.length === 0 && groupAccess.length === 0 && (
                  <p style={{ color: "#666", fontSize: "14px", textAlign: "center", padding: "1rem" }}>
                    Only the owner has access to this credential.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Access Manager Modal */}
      {showAccessManager && (
        <SecureLoginAccessManager
          secureLoginId={secureLogin.id}
          secureLoginName={secureLogin.item_name}
          onClose={() => {
            setShowAccessManager(false);
            loadAccessData(); // Refresh access data when modal closes
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              maxWidth: "400px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, marginBottom: "1rem", color: "#333" }}>
              <Trash2 size={20} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle", color: "#dc2626" }} />
              Delete Secure Login
            </h3>
            <p style={{ color: "#666", marginBottom: "1.5rem" }}>
              Are you sure you want to delete &quot;{secureLogin.item_name}&quot;? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  backgroundColor: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "0.5rem 1rem",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: deleting ? "#fca5a5" : "#dc2626",
                  color: "white",
                  cursor: deleting ? "not-allowed" : "pointer",
                }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
