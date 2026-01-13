"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, Trash2, Shield, ShieldCheck, X } from "lucide-react";

interface SecureLoginAccessManagerProps {
  secureLoginId: number;
  secureLoginName?: string;
  onClose?: () => void;
}

interface UserAccess {
  id: number;
  access_level: string;
  granted_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  grantedByUser?: {
    id: number;
    name: string;
  };
}

interface GroupAccess {
  id: number;
  access_level: string;
  granted_at: string;
  group: {
    id: number;
    name: string;
    description?: string;
    _count?: { members: number };
  };
  grantedByUser?: {
    id: number;
    name: string;
  };
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Group {
  id: number;
  name: string;
  description?: string;
  memberCount?: number;
}

export default function SecureLoginAccessManager({
  secureLoginId,
  secureLoginName,
  onClose,
}: SecureLoginAccessManagerProps) {
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [groupAccess, setGroupAccess] = useState<GroupAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [accessType, setAccessType] = useState<"user" | "group">("user");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<string>("read");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAccess();
    loadUsersAndGroups();
  }, [secureLoginId]);

  const loadAccess = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/secure-logins/${secureLoginId}/access`);
      if (res.ok) {
        const data = await res.json();
        setUserAccess(data.userAccess || []);
        setGroupAccess(data.groupAccess || []);
      }
    } catch (error) {
      console.error("Error loading access:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsersAndGroups = async () => {
    try {
      // Load users - use search endpoint which allows any authenticated user
      const usersRes = await fetch("/api/users/search?limit=100");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAllUsers(usersData.users || []);
      }

      // Load groups
      const groupsRes = await fetch("/api/secure-logins/groups");
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setAllGroups(groupsData.list || []);
      }
    } catch (error) {
      console.error("Error loading users/groups:", error);
    }
  };

  const handleAddAccess = async () => {
    if (!selectedTargetId) {
      alert("Please select a user or group");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/secure-logins/${secureLoginId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: accessType,
          target_id: selectedTargetId,
          access_level: selectedAccessLevel,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setSelectedTargetId(null);
        setSelectedAccessLevel("read");
        loadAccess();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to add access");
      }
    } catch (error) {
      console.error("Error adding access:", error);
      alert("Failed to add access");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAccess = async (type: "user" | "group", targetId: number) => {
    if (!confirm(`Are you sure you want to remove this ${type}'s access?`)) return;

    try {
      const res = await fetch(
        `/api/secure-logins/${secureLoginId}/access?type=${type}&targetId=${targetId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        loadAccess();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to remove access");
      }
    } catch (error) {
      console.error("Error removing access:", error);
      alert("Failed to remove access");
    }
  };

  // Filter out users/groups that already have access
  const usersWithAccess = new Set(userAccess.map((a) => a.user.id));
  const groupsWithAccess = new Set(groupAccess.map((a) => a.group.id));
  const availableUsers = allUsers.filter((u) => !usersWithAccess.has(u.id));
  const availableGroups = allGroups.filter((g) => !groupsWithAccess.has(g.id));

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "1.5rem",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#333", margin: 0 }}>
              <Shield size={20} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
              Manage Access
            </h2>
            {secureLoginName && (
              <p style={{ fontSize: "14px", color: "#666", margin: "0.25rem 0 0 0" }}>
                {secureLoginName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.25rem",
              color: "#666",
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Share Access Button */}
        <div style={{ marginBottom: "1.5rem" }}>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <UserPlus size={16} />
            Share Access
          </button>
        </div>

        {/* Access List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
            Loading access list...
          </div>
        ) : userAccess.length === 0 && groupAccess.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#999" }}>
            <Users size={32} style={{ marginBottom: "0.5rem", opacity: 0.5 }} />
            <p>No one else has access to this item yet</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {/* User Access */}
            {userAccess.length > 0 && (
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "0.5rem", color: "#555" }}>
                  Individual Users ({userAccess.length})
                </h4>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {userAccess.map((access) => (
                    <div
                      key={access.id}
                      style={{
                        padding: "0.75rem 1rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: "500", color: "#333", margin: 0 }}>{access.user.name}</p>
                        <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>{access.user.email}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            backgroundColor: access.access_level === "edit" ? "#dcfce7" : "#e0f2fe",
                            color: access.access_level === "edit" ? "#166534" : "#0369a1",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          {access.access_level === "edit" ? (
                            <>
                              <ShieldCheck size={12} style={{ display: "inline", marginRight: "4px" }} />
                              Can Edit
                            </>
                          ) : (
                            "Read Only"
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAccess("user", access.user.id)}
                          style={{
                            padding: "0.25rem",
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "#dc2626",
                          }}
                          title="Remove access"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Group Access */}
            {groupAccess.length > 0 && (
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "0.5rem", color: "#555" }}>
                  Groups ({groupAccess.length})
                </h4>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {groupAccess.map((access) => (
                    <div
                      key={access.id}
                      style={{
                        padding: "0.75rem 1rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: "500", color: "#333", margin: 0 }}>
                          <Users size={14} style={{ display: "inline", marginRight: "0.5rem" }} />
                          {access.group.name}
                        </p>
                        {access.group.description && (
                          <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>{access.group.description}</p>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            backgroundColor: access.access_level === "edit" ? "#dcfce7" : "#e0f2fe",
                            color: access.access_level === "edit" ? "#166534" : "#0369a1",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          {access.access_level === "edit" ? "Can Edit" : "Read Only"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAccess("group", access.group.id)}
                          style={{
                            padding: "0.25rem",
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "#dc2626",
                          }}
                          title="Remove access"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Access Sub-Modal */}
        {showAddModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1001,
            }}
            onClick={() => setShowAddModal(false)}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "1.5rem",
                maxWidth: "450px",
                width: "90%",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "1rem" }}>
                Share Access
              </h3>

              {/* Access Type Toggle */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
                  Share with
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAccessType("user");
                      setSelectedTargetId(null);
                    }}
                    style={{
                      flex: 1,
                      padding: "0.5rem 1rem",
                      border: `2px solid ${accessType === "user" ? "#2563eb" : "#ddd"}`,
                      borderRadius: "6px",
                      backgroundColor: accessType === "user" ? "#eff6ff" : "white",
                      color: accessType === "user" ? "#2563eb" : "#666",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    Individual User
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccessType("group");
                      setSelectedTargetId(null);
                    }}
                    style={{
                      flex: 1,
                      padding: "0.5rem 1rem",
                      border: `2px solid ${accessType === "group" ? "#2563eb" : "#ddd"}`,
                      borderRadius: "6px",
                      backgroundColor: accessType === "group" ? "#eff6ff" : "white",
                      color: accessType === "group" ? "#2563eb" : "#666",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    Group
                  </button>
                </div>
              </div>

              {/* User/Group Selection */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
                  Select {accessType === "user" ? "User" : "Group"}
                </label>
                <select
                  value={selectedTargetId || ""}
                  onChange={(e) => setSelectedTargetId(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">Choose {accessType === "user" ? "a user" : "a group"}...</option>
                  {accessType === "user"
                    ? availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))
                    : availableGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                          {group.memberCount !== undefined && ` (${group.memberCount} members)`}
                        </option>
                      ))}
                </select>
                {accessType === "user" && availableUsers.length === 0 && (
                  <p style={{ fontSize: "12px", color: "#888", marginTop: "0.5rem" }}>
                    All users already have access
                  </p>
                )}
                {accessType === "group" && availableGroups.length === 0 && (
                  <p style={{ fontSize: "12px", color: "#888", marginTop: "0.5rem" }}>
                    No groups available. Create a group first in the Groups section.
                  </p>
                )}
              </div>

              {/* Access Level */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
                  Access Level
                </label>
                <select
                  value={selectedAccessLevel}
                  onChange={(e) => setSelectedAccessLevel(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                >
                  <option value="read">Read Only - Can view all fields</option>
                  <option value="edit">Can Edit - Can view and modify all fields</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedTargetId(null);
                    setSelectedAccessLevel("read");
                  }}
                  disabled={submitting}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    backgroundColor: "white",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddAccess}
                  disabled={submitting || !selectedTargetId}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: submitting || !selectedTargetId ? "#ccc" : "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: submitting || !selectedTargetId ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  {submitting ? "Sharing..." : "Share Access"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
