"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Users,
  FileText,
  Loader2,
  UserPlus,
  Trash2,
  Shield,
  ShieldOff,
  Search,
  X,
} from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
}

interface GroupMember {
  id: number;
  user: User;
  is_admin: boolean;
  added_at: string;
}

interface Group {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  created_by: User;
  members: GroupMember[];
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Edit state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    loadGroup();
  }, [resolvedParams.id]);

  const loadGroup = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/secure-logins/groups/${resolvedParams.id}`);

      if (res.status === 404) {
        setNotFound(true);
        return;
      }

      if (res.status === 403) {
        setError("You do not have permission to manage this group");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setGroup(data.group);
        setIsAdmin(data.isAdmin);
        setName(data.group.name);
        setDescription(data.group.description || "");
      } else {
        setError("Failed to load group");
      }
    } catch (err) {
      console.error("Error loading group:", err);
      setError("Failed to load group");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/secure-logins/groups/${resolvedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGroup(data.group);
        setSuccess("Group updated successfully");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update group");
      }
    } catch (err) {
      console.error("Error updating group:", err);
      setError("Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out users who are already members
        const memberIds = group?.members.map((m) => m.user.id) || [];
        setSearchResults(data.users.filter((u: User) => !memberIds.includes(u.id)));
      }
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, group?.members]);

  const handleAddMember = async (userId: number, makeAdmin: boolean = false) => {
    setAddingMember(true);
    setError(null);

    try {
      const res = await fetch(`/api/secure-logins/groups/${resolvedParams.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          is_admin: makeAdmin,
        }),
      });

      if (res.ok) {
        await loadGroup();
        setSearchQuery("");
        setSearchResults([]);
        setSuccess("Member added successfully");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add member");
      }
    } catch (err) {
      console.error("Error adding member:", err);
      setError("Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    setError(null);

    try {
      const res = await fetch(`/api/secure-logins/groups/${resolvedParams.id}/members?member_id=${memberId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadGroup();
        setSuccess("Member removed successfully");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to remove member");
      }
    } catch (err) {
      console.error("Error removing member:", err);
      setError("Failed to remove member");
    }
  };

  const handleToggleAdmin = async (memberId: number, currentIsAdmin: boolean) => {
    setError(null);

    try {
      const res = await fetch(`/api/secure-logins/groups/${resolvedParams.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: memberId,
          is_admin: !currentIsAdmin,
        }),
      });

      if (res.ok) {
        await loadGroup();
        setSuccess(`Admin status ${!currentIsAdmin ? "granted" : "revoked"} successfully`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update member");
      }
    } catch (err) {
      console.error("Error updating member:", err);
      setError("Failed to update member");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

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
        <Users size={48} style={{ color: "#ccc", marginBottom: "1rem" }} />
        <h2 style={{ color: "#333" }}>Group Not Found</h2>
        <p style={{ color: "#666" }}>This group does not exist or you don&apos;t have access to it.</p>
        <Link
          href="/secure-logins/groups"
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
          Back to Groups
        </Link>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/secure-logins/groups"
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
          Back to Groups
        </Link>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "600", color: "#333", margin: 0 }}>
          <Users size={24} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
          {group.name}
        </h1>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>
          Created by {group.created_by.name} on {formatDate(group.created_at)}
        </p>
      </div>

      {/* Messages */}
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

      {success && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#dcfce7",
            border: "1px solid #86efac",
            borderRadius: "8px",
            color: "#166534",
            marginBottom: "1.5rem",
          }}
        >
          {success}
        </div>
      )}

      {/* Group Details Form */}
      {isAdmin && (
        <form onSubmit={handleSave}>
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
              Group Details
            </h2>

            {/* Group Name */}
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
                Group Name
                <span style={{ color: "#dc2626", marginLeft: "4px" }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Description */}
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
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
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

            {/* Save Button */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: saving ? "#93c5fd" : "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Members Section */}
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "600", color: "#333", margin: 0 }}>
            <Users size={18} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
            Members ({group.members.length})
          </h2>
          {isAdmin && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: showAddMember ? "#f3f4f6" : "#2563eb",
                color: showAddMember ? "#374151" : "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {showAddMember ? <X size={16} /> : <UserPlus size={16} />}
              {showAddMember ? "Cancel" : "Add Member"}
            </button>
          )}
        </div>

        {/* Add Member Search */}
        {showAddMember && isAdmin && (
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
            }}
          >
            <div style={{ position: "relative" }}>
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
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem 0.5rem 2.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Search Results */}
            {searchQuery && (
              <div style={{ marginTop: "0.75rem" }}>
                {searching ? (
                  <div style={{ textAlign: "center", padding: "1rem" }}>
                    <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p style={{ color: "#666", fontSize: "14px", textAlign: "center", padding: "1rem" }}>
                    No users found
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.75rem",
                          backgroundColor: "white",
                          borderRadius: "6px",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "500", fontSize: "14px" }}>{user.name}</div>
                          <div style={{ fontSize: "12px", color: "#666" }}>{user.email}</div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => handleAddMember(user.id, false)}
                            disabled={addingMember}
                            style={{
                              padding: "0.25rem 0.75rem",
                              backgroundColor: "#dbeafe",
                              color: "#1e40af",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "12px",
                              cursor: addingMember ? "not-allowed" : "pointer",
                            }}
                          >
                            Add as Member
                          </button>
                          <button
                            onClick={() => handleAddMember(user.id, true)}
                            disabled={addingMember}
                            style={{
                              padding: "0.25rem 0.75rem",
                              backgroundColor: "#dcfce7",
                              color: "#166534",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "12px",
                              cursor: addingMember ? "not-allowed" : "pointer",
                            }}
                          >
                            Add as Admin
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Members List */}
        {group.members.length === 0 ? (
          <p style={{ color: "#666", fontSize: "14px", textAlign: "center", padding: "2rem" }}>
            No members yet. Add members to share secure logins with this group.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {group.members.map((member) => (
              <div
                key={member.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: member.is_admin ? "#dcfce7" : "#dbeafe",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: member.is_admin ? "#166534" : "#1e40af",
                    }}
                  >
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: "500", fontSize: "14px" }}>{member.user.name}</span>
                      {member.is_admin && (
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
                    <div style={{ fontSize: "12px", color: "#666" }}>{member.user.email}</div>
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleToggleAdmin(member.id, member.is_admin)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.25rem 0.5rem",
                        backgroundColor: member.is_admin ? "#fef3c7" : "#dcfce7",
                        color: member.is_admin ? "#92400e" : "#166534",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                      title={member.is_admin ? "Remove admin" : "Make admin"}
                    >
                      {member.is_admin ? <ShieldOff size={14} /> : <Shield size={14} />}
                      {member.is_admin ? "Remove Admin" : "Make Admin"}
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0.25rem 0.5rem",
                        backgroundColor: "#fef2f2",
                        color: "#dc2626",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      title="Remove member"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
