"use client";

import { useEffect, useState } from "react";
import { getAccessLevelsForPlatform, platformSupportsAccessLevels, getAccessLevelDescription } from "@/lib/platformAccessLevels";

interface PlatformAccessProps {
  platformId: number;
  platformType: string;
  userRole: string;
}

interface AccessItem {
  id: number;
  access_level: string;
  granted_at: string;
  notes?: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  grantedByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

interface User {
  id: number;
  name: string;
  email: string;
}

export default function PlatformAccessManager({ platformId, platformType, userRole }: PlatformAccessProps) {
  const [accessList, setAccessList] = useState<AccessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedAccessLevel, setSelectedAccessLevel] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canManage = ["write", "manager", "admin"].includes(userRole);
  const supportsAccess = platformSupportsAccessLevels(platformType);

  useEffect(() => {
    if (supportsAccess) {
      loadAccessList();
    }
  }, [platformId, supportsAccess]);

  const loadAccessList = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/platforms/${platformId}/access`);
      if (res.ok) {
        const data = await res.json();
        setAccessList(data.list || []);
      }
    } catch (error) {
      console.error("Error loading access list:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.list || []);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleAddAccess = async () => {
    if (!selectedUserId || !selectedAccessLevel) {
      alert("Please select a user and access level");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/platforms/${platformId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          accessLevel: selectedAccessLevel,
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setSelectedUserId(null);
        setSelectedAccessLevel("");
        setNotes("");
        loadAccessList();
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

  const handleRemoveAccess = async (accessId: number) => {
    if (!confirm("Are you sure you want to remove this access?")) return;

    try {
      const res = await fetch(`/api/platforms/${platformId}/access?accessId=${accessId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadAccessList();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to remove access");
      }
    } catch (error) {
      console.error("Error removing access:", error);
      alert("Failed to remove access");
    }
  };

  const handleOpenAddModal = () => {
    loadUsers();
    setShowAddModal(true);
  };

  if (!supportsAccess) {
    return null;
  }

  const availableAccessLevels = getAccessLevelsForPlatform(platformType);

  // Get list of users who already have access
  const usersWithAccess = new Set(accessList.map(a => a.user.id));
  const availableUsers = allUsers.filter(u => !usersWithAccess.has(u.id));

  return (
    <div style={{
      backgroundColor: "white",
      padding: "1.5rem",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      marginTop: "1.5rem"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "0.25rem" }}>
            Platform Access Management
          </h3>
          <p style={{ fontSize: "13px", color: "#666" }}>
            Manage who has access to this {platformType} account
          </p>
        </div>
        {canManage && (
          <button
            onClick={handleOpenAddModal}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#0066cc",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            + Add Access
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
          Loading access list...
        </div>
      ) : accessList.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#999" }}>
          No access assignments yet
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {accessList.map((access) => (
            <div
              key={access.id}
              style={{
                padding: "1rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <div>
                    <p style={{ fontWeight: "500", color: "#333" }}>{access.user.name}</p>
                    <p style={{ fontSize: "13px", color: "#666" }}>{access.user.email}</p>
                  </div>
                  <span style={{
                    padding: "0.25rem 0.75rem",
                    backgroundColor: "#e3f2fd",
                    color: "#1565c0",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500"
                  }}>
                    {access.access_level}
                  </span>
                </div>
                {access.notes && (
                  <p style={{ fontSize: "12px", color: "#888", marginTop: "0.5rem" }}>
                    📝 {access.notes}
                  </p>
                )}
                <p style={{ fontSize: "11px", color: "#999", marginTop: "0.25rem" }}>
                  Granted {new Date(access.granted_at).toLocaleDateString()}
                  {access.grantedByUser && ` by ${access.grantedByUser.name}`}
                </p>
              </div>
              {canManage && (
                <button
                  onClick={() => handleRemoveAccess(access.id)}
                  style={{
                    padding: "0.5rem",
                    backgroundColor: "#fee",
                    border: "1px solid #fcc",
                    borderRadius: "4px",
                    cursor: "pointer",
                    color: "#c00",
                    fontSize: "14px"
                  }}
                  title="Remove access"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Access Modal */}
      {showAddModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "1.5rem",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "1rem" }}>
              Add Platform Access
            </h3>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
                Select User
              </label>
              <select
                value={selectedUserId || ""}
                onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              >
                <option value="">Choose a user...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
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
                  fontSize: "14px"
                }}
              >
                <option value="">Choose access level...</option>
                {availableAccessLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              {selectedAccessLevel && (
                <p style={{ fontSize: "12px", color: "#666", marginTop: "0.5rem" }}>
                  {getAccessLevelDescription(platformType, selectedAccessLevel)}
                </p>
              )}
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  minHeight: "80px",
                  fontFamily: "inherit"
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedUserId(null);
                  setSelectedAccessLevel("");
                  setNotes("");
                }}
                disabled={submitting}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  backgroundColor: "white"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddAccess}
                disabled={submitting || !selectedUserId || !selectedAccessLevel}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: submitting || !selectedUserId || !selectedAccessLevel ? "#ccc" : "#0066cc",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: submitting || !selectedUserId || !selectedAccessLevel ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                {submitting ? "Adding..." : "Add Access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
