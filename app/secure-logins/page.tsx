"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Eye, EyeOff, Copy, Check, Lock, ExternalLink, Users } from "lucide-react";

interface SecureLogin {
  id: number;
  item_name: string;
  username: string;
  password: string;
  totp_secret: string;
  website_url: string | null;
  notes: string | null;
  login_type: string;
  google_account_id: number | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
  accessLevel: "owner" | "edit" | "read";
  owner: {
    id: number;
    name: string;
    email: string;
  };
  googleAccount?: {
    id: number;
    email_address: string;
  } | null;
}

export default function SecureLoginsPage() {
  const [secureLogins, setSecureLogins] = useState<SecureLogin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [loginTypeFilter, setLoginTypeFilter] = useState("");
  const [accessFilter, setAccessFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [user, setUser] = useState<{ id: number; name: string; role: string } | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchSecureLogins = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      if (loginTypeFilter) {
        params.append("loginType", loginTypeFilter);
      }

      if (accessFilter) {
        params.append("access", accessFilter);
      }

      const res = await fetch(`/api/secure-logins?${params}`);

      if (!res.ok) {
        throw new Error("Failed to fetch secure logins");
      }

      const data = await res.json();
      setSecureLogins(data.list || []);
      setPagination(
        data.pagination || {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        }
      );
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, loginTypeFilter, accessFilter]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then(async (session) => {
        if (session.user) {
          setUser(session.user);
          fetchSecureLogins();
        }
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        setLoading(false);
      });
  }, [fetchSecureLogins]);

  useEffect(() => {
    if (user) {
      fetchSecureLogins();
    }
  }, [user, currentPage, searchTerm, loginTypeFilter, accessFilter, fetchSecureLogins]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this secure login?")) return;

    try {
      const response = await fetch(`/api/secure-logins/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchSecureLogins();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const getAccessBadgeStyle = (level: string) => {
    switch (level) {
      case "owner":
        return { backgroundColor: "#dbeafe", color: "#1e40af" };
      case "edit":
        return { backgroundColor: "#dcfce7", color: "#166534" };
      case "read":
        return { backgroundColor: "#f3f4f6", color: "#4b5563" };
      default:
        return { backgroundColor: "#f3f4f6", color: "#4b5563" };
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "16rem" }}>
        <div style={{ color: "#666" }}>Loading secure logins...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "400", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Lock size={28} />
            Secure Logins
          </h1>
          <p style={{ fontSize: "14px", color: "#666" }}>
            Securely store and manage your login credentials
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link
            href="/secure-logins/groups"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: "500",
              fontSize: "14px",
              border: "1px solid #e5e7eb",
            }}
          >
            <Users size={16} />
            Manage Groups
          </Link>
          <Link
            href="/secure-logins/new"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#0066cc",
              color: "white",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: "500",
              fontSize: "14px",
            }}
          >
            <span style={{ fontSize: "16px" }}>+</span>
            New Login
          </Link>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div
        style={{
          backgroundColor: "white",
          padding: "1rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div style={{ flex: 1, position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#999",
              fontSize: "18px",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by name or website..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: "100%",
              paddingLeft: "2.5rem",
              paddingRight: "0.75rem",
              paddingTop: "0.5rem",
              paddingBottom: "0.5rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>
        <select
          value={loginTypeFilter}
          onChange={(e) => {
            setLoginTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "14px",
            backgroundColor: "#f9fafb",
            minWidth: "150px",
          }}
        >
          <option value="">All Login Types</option>
          <option value="email_password">Email/Password</option>
          <option value="google_oauth">Google Account</option>
        </select>

        <select
          value={accessFilter}
          onChange={(e) => {
            setAccessFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "14px",
            backgroundColor: "#f9fafb",
            minWidth: "120px",
          }}
        >
          <option value="">All Access</option>
          <option value="owned">My Logins</option>
          <option value="shared">Shared with Me</option>
        </select>

        <div
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#f3f4f6",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#6b7280",
          }}
        >
          {pagination.total} logins found
        </div>
      </div>

      {/* Secure Logins Table */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", fontSize: "14px" }}>
                  Name
                </th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", fontSize: "14px" }}>
                  Username / Account
                </th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", fontSize: "14px" }}>
                  Password
                </th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", fontSize: "14px" }}>
                  Login Type
                </th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", fontSize: "14px" }}>
                  Website
                </th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", fontSize: "14px" }}>
                  Access
                </th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", fontSize: "14px", width: "8rem" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {secureLogins.map((login) => (
                <tr key={login.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "0.75rem" }}>
                    <div>
                      <p style={{ fontWeight: "500", color: "#333", marginBottom: "0.25rem" }}>
                        {login.item_name}
                      </p>
                      {login.accessLevel !== "owner" && (
                        <p style={{ fontSize: "12px", color: "#888" }}>
                          by {login.owner.name}
                        </p>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    {login.login_type === "google_oauth" && login.googleAccount ? (
                      <span style={{ color: "#4285f4", fontSize: "14px" }}>
                        {login.googleAccount.email_address}
                      </span>
                    ) : (
                      <span style={{ color: "#555", fontSize: "14px" }}>
                        {login.username || "-"}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "14px", color: "#555" }}>
                        {visiblePasswords.has(login.id) ? login.password : "••••••••"}
                      </span>
                      {login.password && (
                        <>
                          <button
                            onClick={() => togglePasswordVisibility(login.id)}
                            style={{
                              padding: "0.25rem",
                              border: "none",
                              background: "none",
                              cursor: "pointer",
                              color: "#666",
                            }}
                            title={visiblePasswords.has(login.id) ? "Hide" : "Show"}
                          >
                            {visiblePasswords.has(login.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(login.password, login.id)}
                            style={{
                              padding: "0.25rem",
                              border: "none",
                              background: "none",
                              cursor: "pointer",
                              color: copiedId === login.id ? "#22c55e" : "#666",
                            }}
                            title="Copy"
                          >
                            {copiedId === login.id ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: login.login_type === "google_oauth" ? "#fef3c7" : "#e0f2fe",
                        color: login.login_type === "google_oauth" ? "#92400e" : "#0369a1",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                      }}
                    >
                      {login.login_type === "google_oauth" ? "Google" : "Email/Pass"}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    {login.website_url ? (
                      <a
                        href={login.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#0066cc",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "14px",
                        }}
                      >
                        {new URL(login.website_url).hostname}
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ color: "#999", fontSize: "14px" }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        ...getAccessBadgeStyle(login.accessLevel),
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                      }}
                    >
                      {login.accessLevel === "owner" ? "Owner" : login.accessLevel === "edit" ? "Can Edit" : "Read Only"}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Link
                        href={`/secure-logins/${login.id}`}
                        style={{
                          padding: "0.5rem",
                          backgroundColor: "#f8f9fa",
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textDecoration: "none",
                          color: "#666",
                        }}
                        title="View"
                      >
                        👁️
                      </Link>
                      {(login.accessLevel === "owner" || login.accessLevel === "edit") && (
                        <Link
                          href={`/secure-logins/${login.id}/edit`}
                          style={{
                            padding: "0.5rem",
                            backgroundColor: "#f8f9fa",
                            border: "1px solid #e5e7eb",
                            borderRadius: "4px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textDecoration: "none",
                            color: "#666",
                          }}
                          title="Edit"
                        >
                          ✏️
                        </Link>
                      )}
                      {login.accessLevel === "owner" && (
                        <button
                          onClick={() => handleDelete(login.id)}
                          style={{
                            padding: "0.5rem",
                            backgroundColor: "#fee",
                            border: "1px solid #fcc",
                            borderRadius: "4px",
                            cursor: "pointer",
                            color: "#c00",
                          }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {secureLogins.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <Lock size={48} style={{ color: "#ccc", marginBottom: "1rem" }} />
              <p style={{ color: "#666", marginBottom: "0.5rem" }}>No secure logins found.</p>
              <p style={{ color: "#999", fontSize: "14px" }}>
                Create your first secure login to get started.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 1.5rem",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <p style={{ fontSize: "14px", color: "#666" }}>
              Showing {(currentPage - 1) * pagination.limit + 1} to{" "}
              {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} results
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  color: currentPage === 1 ? "#999" : "#333",
                }}
              >
                Previous
              </button>

              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      backgroundColor: currentPage === pageNum ? "#0066cc" : "#f8f9fa",
                      color: currentPage === pageNum ? "white" : "#333",
                      border: currentPage === pageNum ? "none" : "1px solid #e5e7eb",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: currentPage === pageNum ? "500" : "400",
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                style={{
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  cursor: currentPage === pagination.totalPages ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  color: currentPage === pagination.totalPages ? "#999" : "#333",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
