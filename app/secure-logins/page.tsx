"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Eye, EyeOff, Copy, Check, Lock, ExternalLink, Users,
  Folder, FolderPlus, Upload, ChevronRight, ChevronDown,
  MoreVertical, Edit2, Trash2, X, UserPlus, FolderInput, Search
} from "lucide-react";

interface SecureLoginFolder {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  parent_id: number | null;
  _count: {
    logins: number;
    children: number;
  };
  children?: SecureLoginFolder[];
}

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
  folder_id: number | null;
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
  folder?: {
    id: number;
    name: string;
    color: string;
    icon: string;
  } | null;
}

export default function SecureLoginsPage() {
  const [secureLogins, setSecureLogins] = useState<SecureLogin[]>([]);
  const [folders, setFolders] = useState<SecureLoginFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [loginTypeFilter, setLoginTypeFilter] = useState("");
  const [accessFilter, setAccessFilter] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
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
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  // Modals
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<SecureLoginFolder | null>(null);
  const [folderMenuOpen, setFolderMenuOpen] = useState<number | null>(null);

  // Bulk selection
  const [selectedLogins, setSelectedLogins] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

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

      if (selectedFolderId !== null) {
        params.append("folder_id", selectedFolderId);
      }

      const res = await fetch(`/api/secure-logins?${params}`);

      if (!res.ok) {
        throw new Error("Failed to fetch secure logins");
      }

      const data = await res.json();
      setSecureLogins(data.list || []);
      setFolders(data.folders || []);
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
  }, [currentPage, searchTerm, loginTypeFilter, accessFilter, selectedFolderId]);

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
  }, [user, currentPage, searchTerm, loginTypeFilter, accessFilter, selectedFolderId, fetchSecureLogins]);

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

  const toggleFolderExpand = (folderId: number) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!confirm("Are you sure you want to delete this folder? Logins in this folder will be moved to root.")) return;

    try {
      const response = await fetch(`/api/secure-logins/folders/${folderId}?move_contents=true`, {
        method: "DELETE",
      });

      if (response.ok) {
        if (selectedFolderId === folderId.toString()) {
          setSelectedFolderId(null);
        }
        fetchSecureLogins();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete folder");
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
    setFolderMenuOpen(null);
  };

  // Bulk selection handlers
  const toggleSelectLogin = (id: number) => {
    setSelectedLogins(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLogins.size === secureLogins.length) {
      setSelectedLogins(new Set());
    } else {
      setSelectedLogins(new Set(secureLogins.map(l => l.id)));
    }
  };

  const clearSelection = () => {
    setSelectedLogins(new Set());
  };

  const handleBulkMoveToFolder = async (folderId: number | null) => {
    if (selectedLogins.size === 0) return;

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedLogins).map(id =>
        fetch(`/api/secure-logins/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder_id: folderId }),
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount > 0) {
        alert(`Successfully moved ${successCount} credential(s) to folder`);
        setSelectedLogins(new Set());
        setShowBulkMoveModal(false);
        fetchSecureLogins();
      } else {
        alert("Failed to move credentials");
      }
    } catch (error) {
      console.error("Error moving credentials:", error);
      alert("Failed to move credentials");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkAssign = async (userId: number, accessLevel: string) => {
    if (selectedLogins.size === 0) return;

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedLogins).map(id =>
        fetch(`/api/secure-logins/${id}/access`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "user", target_id: userId, access_level: accessLevel }),
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount > 0) {
        alert(`Successfully assigned ${successCount} credential(s) to user`);
        setSelectedLogins(new Set());
        setShowBulkAssignModal(false);
        fetchSecureLogins();
      } else {
        alert("Failed to assign credentials");
      }
    } catch (error) {
      console.error("Error assigning credentials:", error);
      alert("Failed to assign credentials");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Build folder tree from flat list
  const buildFolderTree = (flatFolders: SecureLoginFolder[]): SecureLoginFolder[] => {
    const folderMap = new Map<number, SecureLoginFolder>();
    const rootFolders: SecureLoginFolder[] = [];

    flatFolders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [], _count: folder._count || { logins: 0, children: 0 } });
    });

    flatFolders.forEach(folder => {
      const currentFolder = folderMap.get(folder.id)!;
      if (folder.parent_id === null) {
        rootFolders.push(currentFolder);
      } else {
        const parent = folderMap.get(folder.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(currentFolder);
        }
      }
    });

    return rootFolders;
  };

  const renderFolderItem = (folder: SecureLoginFolder, depth: number = 0) => {
    const isSelected = selectedFolderId === folder.id.toString();
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = (folder.children && folder.children.length > 0) || (folder._count?.children > 0);

    return (
      <div key={folder.id}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0.5rem 0.75rem",
            paddingLeft: `${0.75 + depth * 1}rem`,
            backgroundColor: isSelected ? "#eff6ff" : "transparent",
            borderLeft: isSelected ? "3px solid #2563eb" : "3px solid transparent",
            cursor: "pointer",
            position: "relative",
          }}
          onClick={() => setSelectedFolderId(folder.id.toString())}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpand(folder.id);
              }}
              style={{
                background: "none",
                border: "none",
                padding: "0.25rem",
                cursor: "pointer",
                color: "#666",
                marginRight: "0.25rem",
              }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          <Folder
            size={16}
            style={{
              color: folder.color || "#6366f1",
              marginRight: "0.5rem",
              flexShrink: 0,
            }}
          />
          <span style={{
            flex: 1,
            fontSize: "14px",
            color: isSelected ? "#1e40af" : "#333",
            fontWeight: isSelected ? "500" : "400",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {folder.name}
          </span>
          <span style={{
            fontSize: "12px",
            color: "#999",
            marginRight: "0.5rem",
          }}>
            {folder._count?.logins ?? 0}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id);
            }}
            style={{
              background: "none",
              border: "none",
              padding: "0.25rem",
              cursor: "pointer",
              color: "#666",
              opacity: 0.6,
            }}
          >
            <MoreVertical size={14} />
          </button>

          {/* Folder context menu */}
          {folderMenuOpen === folder.id && (
            <div
              style={{
                position: "absolute",
                right: "0.5rem",
                top: "100%",
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 100,
                minWidth: "120px",
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingFolder(folder);
                  setShowFolderModal(true);
                  setFolderMenuOpen(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#333",
                  textAlign: "left",
                }}
              >
                <Edit2 size={14} />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(folder.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#dc2626",
                  textAlign: "left",
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Render children */}
        {isExpanded && folder.children && folder.children.map(child =>
          renderFolderItem(child, depth + 1)
        )}
      </div>
    );
  };

  const folderTree = buildFolderTree(folders);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "16rem" }}>
        <div style={{ color: "#666" }}>Loading secure logins...</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)" }}>
      {/* Folder Sidebar */}
      <div
        style={{
          width: "260px",
          backgroundColor: "white",
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        {/* Sidebar Header */}
        <div style={{
          padding: "1rem",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontWeight: "600", fontSize: "14px", color: "#333" }}>Folders</span>
          <button
            onClick={() => {
              setEditingFolder(null);
              setShowFolderModal(true);
            }}
            style={{
              background: "none",
              border: "none",
              padding: "0.25rem",
              cursor: "pointer",
              color: "#2563eb",
            }}
            title="New Folder"
          >
            <FolderPlus size={18} />
          </button>
        </div>

        {/* Folder List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* All Logins */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0.5rem 0.75rem",
              backgroundColor: selectedFolderId === null ? "#eff6ff" : "transparent",
              borderLeft: selectedFolderId === null ? "3px solid #2563eb" : "3px solid transparent",
              cursor: "pointer",
            }}
            onClick={() => setSelectedFolderId(null)}
          >
            <Lock
              size={16}
              style={{
                color: "#6366f1",
                marginRight: "0.5rem",
              }}
            />
            <span style={{
              flex: 1,
              fontSize: "14px",
              color: selectedFolderId === null ? "#1e40af" : "#333",
              fontWeight: selectedFolderId === null ? "500" : "400",
            }}>
              All Logins
            </span>
          </div>

          {/* Unfiled Logins */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0.5rem 0.75rem",
              backgroundColor: selectedFolderId === "null" ? "#eff6ff" : "transparent",
              borderLeft: selectedFolderId === "null" ? "3px solid #2563eb" : "3px solid transparent",
              cursor: "pointer",
            }}
            onClick={() => setSelectedFolderId("null")}
          >
            <Folder
              size={16}
              style={{
                color: "#9ca3af",
                marginRight: "0.5rem",
              }}
            />
            <span style={{
              flex: 1,
              fontSize: "14px",
              color: selectedFolderId === "null" ? "#1e40af" : "#666",
              fontWeight: selectedFolderId === "null" ? "500" : "400",
            }}>
              Unfiled
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", backgroundColor: "#e5e7eb", margin: "0.5rem 0" }} />

          {/* Folder Tree */}
          {folderTree.map(folder => renderFolderItem(folder))}

          {folders.length === 0 && (
            <div style={{ padding: "1rem", textAlign: "center", color: "#999", fontSize: "13px" }}>
              No folders yet
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "2rem" }}>
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
            <button
              onClick={() => setShowImportModal(true)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontWeight: "500",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <Upload size={16} />
              Import
            </button>
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

        {/* Bulk Actions Toolbar */}
        {selectedLogins.size > 0 && (
          <div
            style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontWeight: "500", color: "#1e40af", fontSize: "14px" }}>
                {selectedLogins.size} credential{selectedLogins.size > 1 ? "s" : ""} selected
              </span>
              <button
                onClick={clearSelection}
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "12px",
                  color: "#666",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Clear selection
              </button>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setShowBulkMoveModal(true)}
                style={{
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                  color: "#374151",
                }}
              >
                <FolderInput size={14} />
                Move to Folder
              </button>
              <button
                onClick={() => setShowBulkAssignModal(true)}
                style={{
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                <UserPlus size={14} />
                Assign to User
              </button>
            </div>
          </div>
        )}

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
                  <th style={{ padding: "0.75rem", textAlign: "center", fontWeight: "600", fontSize: "14px", width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={selectedLogins.size === secureLogins.length && secureLogins.length > 0}
                      onChange={toggleSelectAll}
                      style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    />
                  </th>
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
                    Folder
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
                  <tr
                    key={login.id}
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      backgroundColor: selectedLogins.has(login.id) ? "#f0f9ff" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedLogins.has(login.id)}
                        onChange={() => toggleSelectLogin(login.id)}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                      />
                    </td>
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
                      {login.folder ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            padding: "0.25rem 0.5rem",
                            backgroundColor: `${login.folder.color}15`,
                            color: login.folder.color,
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          <Folder size={12} />
                          {login.folder.name}
                        </span>
                      ) : (
                        <span style={{ color: "#999", fontSize: "13px" }}>—</span>
                      )}
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
                          {(() => {
                            try {
                              return new URL(login.website_url).hostname;
                            } catch {
                              return login.website_url;
                            }
                          })()}
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

      {/* Folder Modal */}
      {showFolderModal && (
        <FolderModal
          folder={editingFolder}
          folders={folders}
          onClose={() => {
            setShowFolderModal(false);
            setEditingFolder(null);
          }}
          onSave={() => {
            setShowFolderModal(false);
            setEditingFolder(null);
            fetchSecureLogins();
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            fetchSecureLogins();
          }}
        />
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <BulkAssignModal
          selectedCount={selectedLogins.size}
          onClose={() => setShowBulkAssignModal(false)}
          onAssign={handleBulkAssign}
          loading={bulkActionLoading}
        />
      )}

      {/* Bulk Move to Folder Modal */}
      {showBulkMoveModal && (
        <BulkMoveModal
          selectedCount={selectedLogins.size}
          folders={folders}
          onClose={() => setShowBulkMoveModal(false)}
          onMove={handleBulkMoveToFolder}
          loading={bulkActionLoading}
        />
      )}

      {/* Click outside to close folder menu */}
      {folderMenuOpen !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
          }}
          onClick={() => setFolderMenuOpen(null)}
        />
      )}
    </div>
  );
}

// Folder Modal Component
function FolderModal({
  folder,
  folders,
  onClose,
  onSave,
}: {
  folder: SecureLoginFolder | null;
  folders: SecureLoginFolder[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(folder?.name || "");
  const [description, setDescription] = useState(folder?.description || "");
  const [color, setColor] = useState(folder?.color || "#6366f1");
  const [parentId, setParentId] = useState<number | null>(folder?.parent_id || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
    "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#06b6d4", "#3b82f6", "#6b7280", "#000000"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Folder name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = folder
        ? `/api/secure-logins/folders/${folder.id}`
        : "/api/secure-logins/folders";

      const res = await fetch(url, {
        method: folder ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          parent_id: parentId,
        }),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save folder");
      }
    } catch (err) {
      console.error("Error saving folder:", err);
      setError("Failed to save folder");
    } finally {
      setSaving(false);
    }
  };

  // Filter out current folder and its children from parent options
  const availableParents = folders.filter(f => {
    if (!folder) return true;
    if (f.id === folder.id) return false;
    // TODO: Also filter out descendants
    return true;
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
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
          width: "100%",
          maxWidth: "450px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: "1.25rem",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>
            {folder ? "Edit Folder" : "New Folder"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#666",
              padding: "0.25rem",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.25rem" }}>
          {error && (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: "6px",
                color: "#dc2626",
                marginBottom: "1rem",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
              Folder Name <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Work, Personal, Social Media"
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
              Color
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    backgroundColor: c,
                    border: color === c ? "3px solid #333" : "2px solid transparent",
                    cursor: "pointer",
                    outline: color === c ? "2px solid white" : "none",
                    outlineOffset: "-4px",
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
              Parent Folder
            </label>
            <select
              value={parentId || ""}
              onChange={(e) => setParentId(e.target.value ? parseInt(e.target.value) : null)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              <option value="">None (Root level)</option>
              {availableParents.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                backgroundColor: "white",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: saving ? "#93c5fd" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              {saving ? "Saving..." : folder ? "Save Changes" : "Create Folder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Import Modal Component
function ImportModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [importMethod, setImportMethod] = useState<"file" | "paste">("file");
  const [format, setFormat] = useState("csv");
  const [file, setFile] = useState<File | null>(null);
  const [pastedData, setPastedData] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-detect format from file extension
      if (selectedFile.name.endsWith(".csv")) {
        setFormat("csv");
      } else if (selectedFile.name.endsWith(".json")) {
        setFormat("json");
      }
    }
  };

  const handleImport = async () => {
    setError(null);
    setResult(null);

    if (importMethod === "file" && !file) {
      setError("Please select a file to import");
      return;
    }

    if (importMethod === "paste" && !pastedData.trim()) {
      setError("Please paste your data");
      return;
    }

    setImporting(true);

    try {
      let res: Response;

      if (importMethod === "file") {
        const formData = new FormData();
        formData.append("file", file!);
        formData.append("format", format);

        res = await fetch("/api/secure-logins/import", {
          method: "POST",
          body: formData,
        });
      } else {
        // For pasted data
        let body: unknown;

        if (format === "csv") {
          // Send CSV as text
          res = await fetch("/api/secure-logins/import", {
            method: "POST",
            headers: { "Content-Type": "text/csv" },
            body: pastedData,
          });
        } else {
          // Parse and send JSON
          try {
            body = JSON.parse(pastedData);
          } catch {
            setError("Invalid JSON format");
            setImporting(false);
            return;
          }

          res = await fetch("/api/secure-logins/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body as object, format }),
          });
        }
      }

      const data = await res.json();

      if (res.ok) {
        setResult(data);
        if (data.success > 0) {
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } else {
        setError(data.error || "Import failed");
      }
    } catch (err) {
      console.error("Import error:", err);
      setError("Import failed. Please check your data format.");
    } finally {
      setImporting(false);
    }
  };

  const csvTemplate = `name,url,username,password,totp,notes,folder
"Example Site","https://example.com","user@email.com","password123","JBSWY3DPEHPK3PXP","Optional notes","Work"`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
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
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: "1.25rem",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Upload size={20} />
            Import Credentials
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#666",
              padding: "0.25rem",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.25rem" }}>
          {/* Success/Error Messages */}
          {error && (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: "6px",
                color: "#dc2626",
                marginBottom: "1rem",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {result && (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: result.success > 0 ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${result.success > 0 ? "#86efac" : "#fca5a5"}`,
                borderRadius: "6px",
                marginBottom: "1rem",
                fontSize: "14px",
              }}
            >
              <p style={{ fontWeight: "500", color: result.success > 0 ? "#166534" : "#dc2626", marginBottom: "0.5rem" }}>
                Import Complete: {result.success} imported, {result.failed} failed
              </p>
              {result.errors.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#666", fontSize: "13px" }}>
                  {result.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>...and {result.errors.length - 5} more errors</li>
                  )}
                </ul>
              )}
            </div>
          )}

          {/* Format Selection */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
              Import Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              <option value="csv">CSV (Generic)</option>
              <option value="json">JSON (Generic)</option>
              <option value="bitwarden">Bitwarden Export</option>
              <option value="lastpass">LastPass Export</option>
              <option value="1password">1Password Export</option>
              <option value="chrome">Chrome Passwords Export</option>
            </select>
          </div>

          {/* Import Method Toggle */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
              Import Method
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setImportMethod("file")}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  border: importMethod === "file" ? "2px solid #2563eb" : "1px solid #ddd",
                  borderRadius: "6px",
                  backgroundColor: importMethod === "file" ? "#eff6ff" : "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: importMethod === "file" ? "500" : "400",
                }}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setImportMethod("paste")}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  border: importMethod === "paste" ? "2px solid #2563eb" : "1px solid #ddd",
                  borderRadius: "6px",
                  backgroundColor: importMethod === "paste" ? "#eff6ff" : "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: importMethod === "paste" ? "500" : "400",
                }}
              >
                Paste Data
              </button>
            </div>
          </div>

          {/* File Upload or Paste Area */}
          {importMethod === "file" ? (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
                Select File
              </label>
              <div
                style={{
                  border: "2px dashed #ddd",
                  borderRadius: "8px",
                  padding: "2rem",
                  textAlign: "center",
                  backgroundColor: "#f9fafb",
                }}
              >
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  id="import-file"
                />
                <label
                  htmlFor="import-file"
                  style={{
                    cursor: "pointer",
                    color: "#2563eb",
                    fontWeight: "500",
                  }}
                >
                  {file ? file.name : "Click to select a file"}
                </label>
                <p style={{ fontSize: "13px", color: "#666", marginTop: "0.5rem" }}>
                  Supports CSV and JSON files
                </p>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
                Paste Your Data
              </label>
              <textarea
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                placeholder={format === "csv" ? csvTemplate : '{\n  "logins": [\n    {\n      "name": "Example",\n      "url": "https://example.com",\n      "username": "user",\n      "password": "pass"\n    }\n  ]\n}'}
                rows={8}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  resize: "vertical",
                }}
              />
            </div>
          )}

          {/* CSV Template Info */}
          {format === "csv" && (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "#f0f9ff",
                borderRadius: "6px",
                marginBottom: "1rem",
                fontSize: "13px",
              }}
            >
              <p style={{ fontWeight: "500", color: "#0369a1", marginBottom: "0.5rem" }}>
                CSV Format
              </p>
              <p style={{ color: "#0369a1", marginBottom: "0.5rem" }}>
                Required columns: <code style={{ backgroundColor: "#e0f2fe", padding: "0.125rem 0.25rem", borderRadius: "3px" }}>name</code>
              </p>
              <p style={{ color: "#0369a1", margin: 0 }}>
                Optional columns: <code style={{ backgroundColor: "#e0f2fe", padding: "0.125rem 0.25rem", borderRadius: "3px" }}>url, username, password, totp, notes, folder</code>
              </p>
            </div>
          )}

          {/* Import Button */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                backgroundColor: "white",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || (importMethod === "file" && !file) || (importMethod === "paste" && !pastedData.trim())}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: importing ? "#93c5fd" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: importing ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Upload size={16} />
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Bulk Assign Modal Component
function BulkAssignModal({
  selectedCount,
  onClose,
  onAssign,
  loading,
}: {
  selectedCount: number;
  onClose: () => void;
  onAssign: (userId: number, accessLevel: string) => void;
  loading: boolean;
}) {
  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [accessLevel, setAccessLevel] = useState("read");
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users?limit=100");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.list || []);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = () => {
    if (selectedUserId) {
      onAssign(selectedUserId, accessLevel);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
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
          width: "100%",
          maxWidth: "450px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: "1.25rem",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UserPlus size={20} />
            Assign to User
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#666",
              padding: "0.25rem",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.25rem" }}>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "1rem" }}>
            Assign <strong>{selectedCount}</strong> credential{selectedCount > 1 ? "s" : ""} to a user
          </p>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
              Select User <span style={{ color: "#dc2626" }}>*</span>
            </label>
            {loadingUsers ? (
              <div style={{ padding: "0.75rem", color: "#666", fontSize: "14px" }}>Loading users...</div>
            ) : (
              <select
                value={selectedUserId || ""}
                onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "white",
                }}
              >
                <option value="">Choose a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
              Access Level
            </label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              <option value="read">Read Only - Can view credentials</option>
              <option value="edit">Edit - Can view and modify credentials</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                backgroundColor: "white",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedUserId}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: loading || !selectedUserId ? "#93c5fd" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading || !selectedUserId ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              {loading ? "Assigning..." : "Assign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Bulk Move to Folder Modal Component
function BulkMoveModal({
  selectedCount,
  folders,
  onClose,
  onMove,
  loading,
}: {
  selectedCount: number;
  folders: SecureLoginFolder[];
  onClose: () => void;
  onMove: (folderId: number | null) => void;
  loading: boolean;
}) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  const handleSubmit = () => {
    onMove(selectedFolderId);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
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
          width: "100%",
          maxWidth: "450px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: "1.25rem",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FolderInput size={20} />
            Move to Folder
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#666",
              padding: "0.25rem",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.25rem" }}>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "1rem" }}>
            Move <strong>{selectedCount}</strong> credential{selectedCount > 1 ? "s" : ""} to a folder
          </p>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}>
              Select Folder
            </label>
            <select
              value={selectedFolderId ?? ""}
              onChange={(e) => setSelectedFolderId(e.target.value ? parseInt(e.target.value) : null)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              <option value="">No Folder (Root)</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                backgroundColor: "white",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: loading ? "#93c5fd" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              {loading ? "Moving..." : "Move"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
