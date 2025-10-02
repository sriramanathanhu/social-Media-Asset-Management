"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Resource {
  id: number;
  title: string;
  content: string;
  category: string;
  published: boolean;
  author_id: number;
  created_at: string;
  updated_at: string;
  author: {
    id: number;
    name: string;
    email: string;
  };
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1
  });
  const [user, setUser] = useState<{ id: number; name: string; role: string } | null>(null);

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (categoryFilter) {
        params.append('category', categoryFilter);
      }

      if (publishedFilter !== '') {
        params.append('published', publishedFilter);
      }

      const resourcesRes = await fetch(`/api/resources?${params}`);

      if (!resourcesRes.ok) {
        throw new Error("Failed to fetch resources");
      }

      const resourcesData = await resourcesRes.json();
      setResources(resourcesData.list || []);
      setPagination(resourcesData.pagination || {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1
      });
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, categoryFilter, publishedFilter]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then(async (session) => {
        if (session.user) {
          setUser(session.user);
          fetchResources();
        }
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        setLoading(false);
      });
  }, [fetchResources]);

  useEffect(() => {
    if (user) {
      fetchResources();
    }
  }, [user, currentPage, searchTerm, categoryFilter, publishedFilter, fetchResources]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      const response = await fetch(`/api/resources/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        if (user) {
          fetchResources();
        }
      }
    } catch (error) {
      console.error("Error deleting resource:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
        <div style={{ color: '#666' }}>Loading resources...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '400', marginBottom: '0.5rem' }}>Resources</h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Create and manage SOPs, guides, and documentation
          </p>
        </div>
        <Link
          href="/resources/new"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0066cc',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: '500',
            fontSize: '14px'
          }}
        >
          <span style={{ fontSize: '16px' }}>+</span>
          New Resource
        </Link>
      </div>

      {/* Search and Filter Bar */}
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#999',
            fontSize: '18px',
            pointerEvents: 'none'
          }}>🔍</span>
          <input
            type="text"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              paddingLeft: '2.5rem',
              paddingRight: '0.75rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: '#f9fafb',
            minWidth: '150px'
          }}
        >
          <option value="">All Categories</option>
          <option value="sop">SOP</option>
          <option value="guide">Guide</option>
          <option value="documentation">Documentation</option>
        </select>

        <select
          value={publishedFilter}
          onChange={(e) => {
            setPublishedFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: '#f9fafb',
            minWidth: '120px'
          }}
        >
          <option value="">All Status</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </select>

        <div style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          {pagination.total} resources found
        </div>
      </div>

      {/* Resources Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Title</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Category</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Author</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Updated</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '14px', width: '8rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div>
                      <p style={{ fontWeight: '500', color: '#333', marginBottom: '0.25rem' }}>{resource.title}</p>
                      <p style={{ fontSize: '13px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>
                        {resource.content.substring(0, 100)}...
                      </p>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#e8f0fe',
                      color: '#0066cc',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                      textTransform: 'uppercase'
                    }}>
                      {resource.category}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ fontSize: '13px', color: '#555' }}>{resource.author.name}</span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: resource.published ? '#d4edda' : '#fff3cd',
                      color: resource.published ? '#155724' : '#856404',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {resource.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ fontSize: '13px', color: '#666' }}>
                      {new Date(resource.updated_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Link
                        href={`/resources/${resource.id}`}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                          color: '#666'
                        }}
                        title="View"
                      >
                        👁️
                      </Link>
                      {(resource.author_id === user?.id || user?.role === 'admin') && (
                        <>
                          <Link
                            href={`/resources/${resource.id}/edit`}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: '#f8f9fa',
                              border: '1px solid #e5e7eb',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textDecoration: 'none',
                              color: '#666'
                            }}
                            title="Edit"
                          >
                            ✏️
                          </Link>
                          <button
                            onClick={() => handleDelete(resource.id)}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: '#fee',
                              border: '1px solid #fcc',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: '#c00'
                            }}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {resources.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: '#666' }}>No resources found.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} results
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  color: currentPage === 1 ? '#999' : '#333'
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
                      padding: '0.5rem 0.75rem',
                      backgroundColor: currentPage === pageNum ? '#0066cc' : '#f8f9fa',
                      color: currentPage === pageNum ? 'white' : '#333',
                      border: currentPage === pageNum ? 'none' : '1px solid #e5e7eb',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: currentPage === pageNum ? '500' : '400'
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
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  color: currentPage === pagination.totalPages ? '#999' : '#333'
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
