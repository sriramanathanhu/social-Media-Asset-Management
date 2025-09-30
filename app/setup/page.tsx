"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "user"
  });
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      
      if (data.authenticated && data.user?.role === 'admin') {
        setIsAuthenticated(true);
        setUserRole(data.user.role);
        fetchUsers();
      } else if (data.authenticated && data.user?.role !== 'admin') {
        setMessage("❌ Access denied. Admin role required.");
        setCheckingAuth(false);
        return;
      } else {
        router.push('/login');
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
      return;
    }
    setCheckingAuth(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/add-user');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch('/api/admin/add-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`✅ User created successfully: ${data.user.email}`);
        setFormData({ email: "", name: "", role: "user" });
        fetchUsers(); // Refresh the list
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createAdminUser = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/add-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: "admin@example.com",
          name: "System Administrator",
          role: "admin"
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Admin user created! Email: admin@example.com`);
        fetchUsers();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5', 
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '1rem' }}>🔐 Checking authentication...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5', 
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#dc3545', marginBottom: '1rem' }}>🚫 Access Denied</h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            {message || "Admin authentication required to access user management."}
          </p>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5', 
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '1rem',
          color: '#333'
        }}>
          🛠️ Database Setup & User Management
        </h1>
        
        <p style={{ 
          color: '#666', 
          marginBottom: '2rem',
          lineHeight: '1.5'
        }}>
          Add users to the database so they can access the application after SSO authentication.
        </p>

        {/* Quick Admin Setup */}
        <div style={{
          backgroundColor: '#e7f3ff',
          border: '1px solid #b6e4ff',
          borderRadius: '6px',
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            marginBottom: '0.5rem',
            color: '#0066cc'
          }}>
            Quick Setup
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: '#666', 
            marginBottom: '1rem' 
          }}>
            Create a default admin user to get started:
          </p>
          <button
            onClick={createAdminUser}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Creating...' : 'Create Admin User'}
          </button>
        </div>

        {/* Add User Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '1rem',
            color: '#333'
          }}>
            Add New User
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr auto auto', 
            gap: '1rem', 
            alignItems: 'end',
            marginBottom: '1rem'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '0.25rem',
                color: '#333'
              }}>
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="user@example.com"
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '0.25rem',
                color: '#333'
              }}>
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '0.25rem',
                color: '#333'
              }}>
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>

        {/* Message Display */}
        {message && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: '4px',
            backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
            border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
            color: message.includes('✅') ? '#155724' : '#721c24',
            fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        {/* Users List */}
        <div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '1rem',
            color: '#333'
          }}>
            Current Users ({users.length})
          </h3>
          
          {users.length === 0 ? (
            <p style={{ 
              color: '#666', 
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '2rem'
            }}>
              No users found. Add some users above to get started.
            </p>
          ) : (
            <div style={{ 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ 
                      padding: '0.75rem', 
                      textAlign: 'left', 
                      borderBottom: '1px solid #ddd',
                      fontWeight: '600'
                    }}>
                      Email
                    </th>
                    <th style={{ 
                      padding: '0.75rem', 
                      textAlign: 'left', 
                      borderBottom: '1px solid #ddd',
                      fontWeight: '600'
                    }}>
                      Name
                    </th>
                    <th style={{ 
                      padding: '0.75rem', 
                      textAlign: 'center', 
                      borderBottom: '1px solid #ddd',
                      fontWeight: '600'
                    }}>
                      Role
                    </th>
                    <th style={{ 
                      padding: '0.75rem', 
                      textAlign: 'center', 
                      borderBottom: '1px solid #ddd',
                      fontWeight: '600'
                    }}>
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any, index: number) => (
                    <tr key={user.id} style={{ 
                      borderBottom: index < users.length - 1 ? '1px solid #eee' : 'none'
                    }}>
                      <td style={{ padding: '0.75rem' }}>
                        {user.email}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {user.name}
                      </td>
                      <td style={{ 
                        padding: '0.75rem', 
                        textAlign: 'center'
                      }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: user.role === 'admin' ? '#f8d7da' : '#d1ecf1',
                          color: user.role === 'admin' ? '#721c24' : '#0c5460'
                        }}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ 
                        padding: '0.75rem', 
                        textAlign: 'center',
                        color: '#666'
                      }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#856404'
        }}>
          <strong>💡 How it works:</strong>
          <br />
          1. Users authenticate through Nandi SSO
          <br />
          2. System checks if their email exists in the database
          <br />
          3. If found, they get access based on their role (user/admin)
          <br />
          4. If not found, they see "Contact administrator" message
        </div>
      </div>
    </div>
  );
}