"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Platform {
  id: number;
  platform_name: string;
  platform_type: string;
  login_method: string;
  account_status: string;
  profile_url?: string;
  created_at: string;
  ecosystem: {
    id: number;
    name: string;
    theme: string;
  };
  users: Array<{
    id: number;
    name: string;
    email: string;
  }>;
}

interface Filters {
  platform: string;
  ecosystem: string;
  user: string;
}

export default function PlatformsListPage() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [filteredPlatforms, setFilteredPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [filters, setFilters] = useState<Filters>({
    platform: "",
    ecosystem: "",
    user: ""
  });

  // Get unique values for filter dropdowns
  const [ecosystemOptions, setEcosystemOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [platformTypeOptions, setPlatformTypeOptions] = useState<string[]>([]);
  const [userOptions, setUserOptions] = useState<Array<{ id: number; name: string; email: string }>>([]);

  const checkPermissions = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) {
        router.push("/");
        return;
      }

      const session = await sessionRes.json();
      if (!session.user) {
        router.push("/");
        return;
      }

      setCurrentUser(session.user);
      setCheckingAuth(false);
    } catch (error) {
      console.error("Permission check failed:", error);
      router.push("/");
    }
  }, [router]);

  const loadPlatforms = useCallback(async () => {
    try {
      const res = await fetch("/api/platforms/all");
      if (!res.ok) {
        throw new Error("Failed to fetch platforms");
      }

      const data = await res.json();
      setPlatforms(data.platforms || []);
      setFilteredPlatforms(data.platforms || []);

      // Extract unique options for filters
      const uniqueEcosystems = Array.from(
        new Map(data.platforms.map((p: Platform) => [p.ecosystem.id, p.ecosystem])).values()
      ) as Array<{ id: number; name: string }>;
      setEcosystemOptions(uniqueEcosystems);

      const uniquePlatformTypes = Array.from(
        new Set(data.platforms.map((p: Platform) => p.platform_type))
      ).sort();
      setPlatformTypeOptions(uniquePlatformTypes);

      // Get all unique users
      const usersMap = new Map();
      data.platforms.forEach((p: Platform) => {
        p.users.forEach(u => {
          if (!usersMap.has(u.id)) {
            usersMap.set(u.id, u);
          }
        });
      });
      setUserOptions(Array.from(usersMap.values()));

      setLoading(false);
    } catch (error) {
      console.error("Error loading platforms:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  useEffect(() => {
    if (!checkingAuth) {
      loadPlatforms();
    }
  }, [checkingAuth, loadPlatforms]);

  // Apply filters
  useEffect(() => {
    let filtered = [...platforms];

    if (filters.platform) {
      filtered = filtered.filter(p => p.platform_type === filters.platform);
    }

    if (filters.ecosystem) {
      filtered = filtered.filter(p => p.ecosystem.id === parseInt(filters.ecosystem));
    }

    if (filters.user) {
      filtered = filtered.filter(p =>
        p.users.some(u => u.id === parseInt(filters.user))
      );
    }

    setFilteredPlatforms(filtered);
  }, [filters, platforms]);

  const resetFilters = () => {
    setFilters({ platform: "", ecosystem: "", user: "" });
  };

  if (checkingAuth || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: '#666' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '400', marginBottom: '0.5rem' }}>
          All Platforms
        </h1>
        <p style={{ fontSize: '14px', color: '#666' }}>
          View and manage all social media platforms across ecosystems
        </p>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Filters</h2>
          {(filters.platform || filters.ecosystem || filters.user) && (
            <button
              onClick={resetFilters}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '12px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '13px', fontWeight: '500' }}>
              Platform Type
            </label>
            <select
              value={filters.platform}
              onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">All Platform Types</option>
              {platformTypeOptions.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '13px', fontWeight: '500' }}>
              Ecosystem
            </label>
            <select
              value={filters.ecosystem}
              onChange={(e) => setFilters({ ...filters, ecosystem: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">All Ecosystems</option>
              {ecosystemOptions.map(eco => (
                <option key={eco.id} value={eco.id}>{eco.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '13px', fontWeight: '500' }}>
              Assigned User
            </label>
            <select
              value={filters.user}
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">All Users</option>
              {userOptions.map(user => (
                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '13px', color: '#666' }}>
          Showing {filteredPlatforms.length} of {platforms.length} platforms
        </div>
      </div>

      {/* Platforms Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {filteredPlatforms.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
            No platforms found matching your filters
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Platform Name
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Type
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Login Method
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Ecosystem
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Assigned Users
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Status
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPlatforms.map((platform) => (
                  <tr
                    key={platform.id}
                    style={{ borderBottom: '1px solid #e5e7eb' }}
                  >
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '0.25rem' }}>
                          {platform.platform_name}
                        </div>
                        {platform.profile_url && (
                          <a
                            href={platform.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '12px', color: '#0066cc', textDecoration: 'none' }}
                          >
                            View Profile →
                          </a>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {platform.platform_type}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '13px', color: '#666' }}>
                      {platform.login_method === 'email_password' ? 'Email & Password' :
                       platform.login_method === 'google_oauth' ? 'Google OAuth' :
                       platform.login_method === 'facebook_oauth' ? 'Facebook OAuth' :
                       platform.login_method === 'apple_id' ? 'Apple ID' : platform.login_method}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Link
                        href={`/ecosystems/${platform.ecosystem.id}`}
                        style={{
                          fontSize: '14px',
                          color: '#0066cc',
                          textDecoration: 'none',
                          fontWeight: '500'
                        }}
                      >
                        {platform.ecosystem.name}
                      </Link>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>
                        {platform.ecosystem.theme}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {platform.users.length === 0 ? (
                        <span style={{ fontSize: '13px', color: '#999' }}>No users assigned</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {platform.users.map(user => (
                            <div key={user.id} style={{ fontSize: '13px' }}>
                              {user.name}
                              <span style={{ color: '#999', marginLeft: '0.25rem' }}>
                                ({user.email})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: platform.account_status === 'active' ? '#d1fae5' : '#fee2e2',
                        color: platform.account_status === 'active' ? '#065f46' : '#991b1b'
                      }}>
                        {platform.account_status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Link
                        href={`/platforms/${platform.id}/edit`}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          color: '#333',
                          fontSize: '13px',
                          display: 'inline-block'
                        }}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
