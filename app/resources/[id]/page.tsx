"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function ResourceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ id: number; name: string; role: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user session
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (sessionData.user) {
          setUser(sessionData.user);
        }

        // Fetch resource
        const response = await fetch(`/api/resources/${params.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch resource");
        }
        const data = await response.json();
        setResource(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load resource");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      const response = await fetch(`/api/resources/${params.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/resources");
      } else {
        throw new Error("Failed to delete resource");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete resource");
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
        <div style={{ color: '#666' }}>Loading resource...</div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          color: '#c00',
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '1.5rem'
        }}>
          {error || "Resource not found"}
        </div>
        <Link
          href="/resources"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0066cc',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          Back to Resources
        </Link>
      </div>
    );
  }

  const canEdit = resource.author_id === user?.id || user?.role === 'admin';

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: '400', marginBottom: '0.5rem', color: '#333' }}>
              {resource.title}
            </h1>
            <div style={{ fontSize: '14px', color: '#666' }}>
              <span>By {resource.author.name}</span>
              <span style={{ margin: '0 0.5rem' }}>•</span>
              <span>Updated {new Date(resource.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link
              href="/resources"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f8f9fa',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                textDecoration: 'none',
                color: '#666',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Back
            </Link>
            {canEdit && (
              <>
                <Link
                  href={`/resources/${resource.id}/edit`}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#0066cc',
                    color: 'white',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '2rem'
      }}>
        <div style={{
          fontSize: '15px',
          lineHeight: '1.8',
          color: '#333',
          whiteSpace: 'pre-wrap',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          {resource.content}
        </div>
      </div>

      {/* Metadata */}
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#666'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <strong style={{ color: '#333' }}>Author:</strong> {resource.author.name}
          </div>
          <div>
            <strong style={{ color: '#333' }}>Email:</strong> {resource.author.email}
          </div>
          <div>
            <strong style={{ color: '#333' }}>Created:</strong> {new Date(resource.created_at).toLocaleString()}
          </div>
          <div>
            <strong style={{ color: '#333' }}>Last Updated:</strong> {new Date(resource.updated_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
