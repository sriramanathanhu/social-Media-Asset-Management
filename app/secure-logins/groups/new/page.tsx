"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Users, FileText } from "lucide-react";

export default function NewGroupPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/secure-logins/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/secure-logins/groups/${data.group.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create group");
      }
    } catch (err) {
      console.error("Error creating group:", err);
      setError("Failed to create group");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
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
          Create New Group
        </h1>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>
          Create a group to share secure logins with multiple users at once
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
              <Users size={14} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
              Group Name
              <span style={{ color: "#dc2626", marginLeft: "4px" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Team, Social Media Managers"
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
              placeholder="Describe the purpose of this group..."
              rows={3}
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
              <Users size={14} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
              <strong>Note:</strong> After creating the group, you can add members and manage their permissions.
              You will automatically be added as an admin of this group.
            </p>
          </div>

          {/* Submit Button */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
            <Link
              href="/secure-logins/groups"
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
              {saving ? "Creating..." : "Create Group"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
