"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Users, Search, Edit, Trash2, Loader2, Shield, User } from "lucide-react";

interface GroupMember {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  is_admin: boolean;
}

interface Group {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  created_by: {
    id: number;
    name: string;
    email: string;
  };
  members: GroupMember[];
  _count: {
    members: number;
    group_access: number;
  };
  isAdmin: boolean;
}

export default function SecureLoginGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/secure-logins/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      } else {
        setError("Failed to load groups");
      }
    } catch (err) {
      console.error("Error loading groups:", err);
      setError("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (groupId: number) => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/secure-logins/groups/${groupId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setGroups(groups.filter((g) => g.id !== groupId));
        setShowDeleteConfirm(null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete group");
      }
    } catch (err) {
      console.error("Error deleting group:", err);
      setError("Failed to delete group");
    } finally {
      setDeleting(false);
    }
  };

  const filteredGroups = groups.filter((group) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "600", color: "#333", margin: 0 }}>
              <Users size={24} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
              Manage Groups
            </h1>
            <p style={{ color: "#666", marginTop: "0.5rem" }}>
              Create and manage groups for sharing secure logins with multiple users
            </p>
          </div>
          <Link
            href="/secure-logins/groups/new"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.25rem",
              backgroundColor: "#2563eb",
              color: "white",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            <Plus size={18} />
            Create Group
          </Link>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ position: "relative", maxWidth: "400px" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#999",
            }}
          />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem 0.5rem 2.5rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          />
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

      {/* Groups List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ color: "#666", marginTop: "1rem" }}>Loading groups...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
          }}
        >
          <Users size={48} style={{ color: "#ccc", marginBottom: "1rem" }} />
          <h3 style={{ color: "#333", marginBottom: "0.5rem" }}>
            {searchQuery ? "No groups found" : "No groups yet"}
          </h3>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            {searchQuery
              ? "Try a different search term"
              : "Create a group to share secure logins with multiple users at once"}
          </p>
          {!searchQuery && (
            <Link
              href="/secure-logins/groups/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.25rem",
                backgroundColor: "#2563eb",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              <Plus size={18} />
              Create Your First Group
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              style={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <Link
                      href={`/secure-logins/groups/${group.id}`}
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: "600",
                        color: "#333",
                        textDecoration: "none",
                      }}
                    >
                      {group.name}
                    </Link>
                    {group.isAdmin && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "0.125rem 0.5rem",
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: "500",
                        }}
                      >
                        <Shield size={10} />
                        Admin
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p style={{ color: "#666", fontSize: "14px", marginTop: "0.25rem", marginBottom: 0 }}>
                      {group.description}
                    </p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1.5rem",
                      marginTop: "0.75rem",
                      fontSize: "13px",
                      color: "#666",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <User size={14} />
                      {group._count.members} {group._count.members === 1 ? "member" : "members"}
                    </span>
                    <span>
                      {group._count.group_access} shared {group._count.group_access === 1 ? "item" : "items"}
                    </span>
                    <span>Created {formatDate(group.created_at)}</span>
                  </div>

                  {/* Member Avatars */}
                  {group.members.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", marginTop: "0.75rem", gap: "0.25rem" }}>
                      {group.members.slice(0, 5).map((member, index) => (
                        <div
                          key={member.id}
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            backgroundColor: ["#dbeafe", "#dcfce7", "#fef3c7", "#fce7f3", "#e0e7ff"][
                              index % 5
                            ],
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: "600",
                            color: ["#1e40af", "#166534", "#92400e", "#9d174d", "#3730a3"][index % 5],
                            border: "2px solid white",
                            marginLeft: index > 0 ? "-8px" : "0",
                          }}
                          title={member.user.name}
                        >
                          {member.user.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {group.members.length > 5 && (
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            backgroundColor: "#f3f4f6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            fontWeight: "600",
                            color: "#666",
                            border: "2px solid white",
                            marginLeft: "-8px",
                          }}
                        >
                          +{group.members.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {group.isAdmin && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Link
                      href={`/secure-logins/groups/${group.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "#f3f4f6",
                        color: "#374151",
                        border: "none",
                        borderRadius: "6px",
                        textDecoration: "none",
                        fontSize: "13px",
                      }}
                    >
                      <Edit size={14} />
                      Manage
                    </Link>
                    <button
                      onClick={() => setShowDeleteConfirm(group.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0.5rem",
                        backgroundColor: "#fef2f2",
                        color: "#dc2626",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                      title="Delete group"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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
          onClick={() => setShowDeleteConfirm(null)}
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
              <Trash2
                size={20}
                style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle", color: "#dc2626" }}
              />
              Delete Group
            </h3>
            <p style={{ color: "#666", marginBottom: "1.5rem" }}>
              Are you sure you want to delete this group? All members will lose access to secure logins shared
              with this group. This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
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
                onClick={() => handleDelete(showDeleteConfirm)}
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
