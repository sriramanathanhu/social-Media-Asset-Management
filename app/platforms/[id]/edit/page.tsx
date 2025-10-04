"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PlatformAccessManager from "@/components/PlatformAccessManager";
import { getAuthMethodsForPlatform, getAuthMethodLabel, type AuthMethod } from "@/lib/platformAuthMethods";

export default function PlatformEditPage() {
  const params = useParams();
  const router = useRouter();
  interface PlatformData {
    id: number;
    platform_name: string;
    platform_type: string;
    login_method?: string;
    profile_id?: string;
    username?: string;
    password?: string;
    profile_url?: string;
    totp_enabled?: boolean;
    ecosystem_id?: number;
    live_stream?: string;
    language?: string;
    status?: string;
    recovery_phone_number?: string;
    recovery_email_id?: string;
    added_phone_number?: string;
    phone_number_owner?: string;
    branding?: string;
    connection_tool?: string;
  }
  const [platform, setPlatform] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ dbId: number; email: string; role: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [formData, setFormData] = useState({
    platform_name: "",
    platform_type: "",
    login_method: "email_password",
    profile_id: "",
    username: "",
    password: "",
    profile_url: "",
    live_stream: "",
    language: "",
    status: "",
    recovery_phone_number: "",
    recovery_email_id: "",
    added_phone_number: "",
    phone_number_owner: "",
    branding: "",
    connection_tool: "",
  });
  
  // TOTP states
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);
  const [totpSecretInput, setTOTPSecretInput] = useState("");
  const [currentTOTPCode, setCurrentTOTPCode] = useState("");
  const [totpTimeLeft, setTOTPTimeLeft] = useState(30);

  const loadPlatformData = useCallback(async (userData: { dbId: number; role: string }) => {
    try {
      console.log("Loading platform with ID:", params.id);
      const res = await fetch(`/api/platforms/${params.id}`);
      console.log("Platform API response status:", res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to load platform:", errorText);
        router.push("/ecosystems");
        return;
      }
      const platformData = await res.json();
      console.log("Platform data loaded:", platformData);
      
      if (!platformData) {
        console.log("No platform data returned");
        router.push("/ecosystems");
        return;
      }
      
      console.log("User role:", userData.role);
      console.log("User is admin?", userData.role === 'admin');
      
      // Check if user has access to this platform
      if (userData.role !== 'admin') {
        // For regular users, check if they have access to this ecosystem
        const ecosystemRes = await fetch(`/api/ecosystems?userId=${userData.dbId}`);
        const ecosystemData = await ecosystemRes.json();
        const userEcosystems = ecosystemData.list || [];
        
        const hasEcosystemAccess = userEcosystems.some(
          (ue: { id: number }) => ue.id === platformData.ecosystem_id
        );
        
        if (!hasEcosystemAccess) {
          console.log("User doesn't have access to ecosystem", platformData.ecosystem_id);
          router.push("/ecosystems");
          return;
        }
      }
      
      setHasAccess(true);
      setPlatform(platformData);
      setFormData({
        platform_name: platformData.platform_name || "",
        platform_type: platformData.platform_type || "",
        login_method: platformData.login_method || "email_password",
        profile_id: platformData.profile_id || "",
        username: platformData.username || "",
        password: platformData.password || "",
        profile_url: platformData.profile_url || "",
        live_stream: platformData.live_stream || "",
        language: platformData.language || "",
        status: platformData.status || "",
        recovery_phone_number: platformData.recovery_phone_number || "",
        recovery_email_id: platformData.recovery_email_id || "",
        added_phone_number: platformData.added_phone_number || "",
        phone_number_owner: platformData.phone_number_owner || "",
        branding: platformData.branding || "",
        connection_tool: platformData.connection_tool || "",
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading platform:", error);
      setLoading(false);
      router.push("/ecosystems");
    }
  }, [params.id, router]);

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
      
      // Load platform data and check access
      await loadPlatformData(session.user);
    } catch (error) {
      console.error("Permission check failed:", error);
      router.push("/");
    }
  }, [router, loadPlatformData]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/platforms/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          changed_by: currentUser?.dbId,
        }),
      });

      if (res.ok) {
        router.push(`/ecosystems/${platform?.ecosystem_id}`);
      } else {
        alert("Failed to save changes");
      }
    } catch (error) {
      console.error("Error saving platform:", error);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const saveTOTPSecret = async () => {
    if (!totpSecretInput.trim()) {
      alert("Please enter a TOTP secret");
      return;
    }

    try {
      const res = await fetch(`/api/platforms/${params.id}/totp/save`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: totpSecretInput }),
      });

      if (res.ok) {
        alert("TOTP secret saved successfully!");
        setShowTOTPSetup(false);
        setTOTPSecretInput("");
        if (currentUser) {
          loadPlatformData(currentUser);
        }
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save TOTP secret");
      }
    } catch (error) {
      console.error("Error saving TOTP:", error);
      alert("Failed to save TOTP secret");
    }
  };

  const generateCurrentTOTP = async () => {
    try {
      const res = await fetch(`/api/platforms/${params.id}/totp/generate`);
      if (res.ok) {
        const data = await res.json();
        setCurrentTOTPCode(data.token);
        setTOTPTimeLeft(data.timeRemaining);
      }
    } catch (error) {
      console.error("Error generating TOTP:", error);
    }
  };

  const disableTOTP = async () => {
    if (!confirm("Are you sure you want to disable TOTP for this platform?")) {
      return;
    }

    try {
      const res = await fetch(`/api/platforms/${params.id}/totp/disable`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("TOTP disabled successfully!");
        setCurrentTOTPCode("");
        if (currentUser) {
          loadPlatformData(currentUser);
        }
      } else {
        alert("Failed to disable TOTP");
      }
    } catch (error) {
      console.error("Error disabling TOTP:", error);
      alert("Failed to disable TOTP");
    }
  };

  const copyTOTPCode = () => {
    navigator.clipboard.writeText(currentTOTPCode);
    alert("TOTP code copied to clipboard!");
  };

  // Auto-refresh TOTP code and countdown
  useEffect(() => {
    if (platform?.totp_enabled) {
      generateCurrentTOTP();

      const interval = setInterval(() => {
        setTOTPTimeLeft((prev) => {
          if (prev <= 1) {
            generateCurrentTOTP();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [platform?.totp_enabled, params.id]);

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: '#666' }}>Checking permissions...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div>Loading platform details...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: '#666' }}>You do not have access to edit this platform.</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <Link 
        href={`/ecosystems/${platform?.ecosystem_id}`} 
        style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}
      >
        ← Back to ecosystem
      </Link>
      
      <h1 style={{ fontSize: '24px', marginBottom: '2rem' }}>
        Edit Platform: {platform?.platform_name}
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '2rem', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '1.5rem', fontWeight: '600' }}>Platform Details</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Platform Name
              </label>
              <input
                type="text"
                value={formData.platform_name}
                readOnly
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#f5f5f5',
                  cursor: 'not-allowed'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Platform Type
              </label>
              <input
                type="text"
                value={formData.platform_type}
                readOnly
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#f5f5f5',
                  cursor: 'not-allowed'
                }}
              />
            </div>

            {/* Login Method Selection */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Login Method <span style={{ color: 'red' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {getAuthMethodsForPlatform(formData.platform_type).map((authMethod) => (
                  <label
                    key={authMethod}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.75rem',
                      border: `2px solid ${formData.login_method === authMethod ? '#0066cc' : '#ddd'}`,
                      borderRadius: '6px',
                      backgroundColor: formData.login_method === authMethod ? '#f0f7ff' : 'white',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="radio"
                      name="login_method"
                      value={authMethod}
                      checked={formData.login_method === authMethod}
                      onChange={(e) => setFormData({ ...formData, login_method: e.target.value })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: formData.login_method === authMethod ? '600' : '400' }}>
                      {getAuthMethodLabel(authMethod as AuthMethod)}
                    </span>
                  </label>
                ))}
              </div>
              {formData.login_method && !['email_password', 'phone_password'].includes(formData.login_method) && (
                <p style={{ fontSize: '12px', color: '#666', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  ℹ️ For OAuth/SSO logins, username and password fields are optional. Use the notes field to document which account is used.
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Profile ID
              </label>
              <input
                type="text"
                value={formData.profile_id}
                onChange={(e) => setFormData({ ...formData, profile_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Profile URL
              </label>
              <input
                type="url"
                value={formData.profile_url}
                onChange={(e) => setFormData({ ...formData, profile_url: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Additional Platform Information */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '1.5rem', fontWeight: '600' }}>Additional Information</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Live Stream
              </label>
              <select
                value={formData.live_stream}
                onChange={(e) => setFormData({ ...formData, live_stream: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select...</option>
                <option value="Enabled">Enabled</option>
                <option value="Not Enabled">Not Enabled</option>
                <option value="Not Applicable">Not Applicable</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Language
              </label>
              <input
                type="text"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select...</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Terminated">Terminated</option>
                <option value="Able to access">Able to access</option>
                <option value="Incorrect Password">Incorrect Password</option>
                <option value="Missing Password">Missing Password</option>
                <option value="Requires Phone no">Requires Phone no</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Recovery Phone Number
              </label>
              <input
                type="text"
                value={formData.recovery_phone_number}
                onChange={(e) => setFormData({ ...formData, recovery_phone_number: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Recovery Email ID
              </label>
              <input
                type="email"
                value={formData.recovery_email_id}
                onChange={(e) => setFormData({ ...formData, recovery_email_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Added Phone Number
              </label>
              <input
                type="text"
                value={formData.added_phone_number}
                onChange={(e) => setFormData({ ...formData, added_phone_number: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Phone Number Owner
              </label>
              <input
                type="text"
                value={formData.phone_number_owner}
                onChange={(e) => setFormData({ ...formData, phone_number_owner: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Branding
              </label>
              <select
                value={formData.branding}
                onChange={(e) => setFormData({ ...formData, branding: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select...</option>
                <option value="Completed">Completed</option>
                <option value="Partial">Partial</option>
                <option value="Nothing">Nothing</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Connection Tool
              </label>
              <select
                value={formData.connection_tool}
                onChange={(e) => setFormData({ ...formData, connection_tool: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select...</option>
                <option value="Sprinklr">Sprinklr</option>
                <option value="Getlate">Getlate</option>
                <option value="None">None</option>
              </select>
            </div>
          </div>
        </div>

        {/* TOTP Section */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '2rem', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '1.5rem', fontWeight: '600' }}>
            Two-Factor Authentication (TOTP)
          </h2>
          
          {platform?.totp_enabled ? (
            <div>
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '14px' }}>
                    Current TOTP Code
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: 'bold',
                      letterSpacing: '0.3em',
                      fontFamily: 'monospace',
                      color: '#0066cc',
                      padding: '1rem',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '2px solid #0066cc',
                      flex: 1,
                      textAlign: 'center'
                    }}>
                      {currentTOTPCode || "------"}
                    </div>
                    <button
                      type="button"
                      onClick={copyTOTPCode}
                      disabled={!currentTOTPCode}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: currentTOTPCode ? '#0066cc' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: currentTOTPCode ? 'pointer' : 'not-allowed',
                        fontWeight: '500'
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  <span>Refreshes in:</span>
                  <span style={{
                    fontWeight: 'bold',
                    color: totpTimeLeft <= 5 ? '#dc3545' : '#28a745',
                    fontSize: '16px'
                  }}>
                    {totpTimeLeft}s
                  </span>
                  <div style={{
                    flex: 1,
                    height: '4px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(totpTimeLeft / 30) * 100}%`,
                      height: '100%',
                      backgroundColor: totpTimeLeft <= 5 ? '#dc3545' : '#28a745',
                      transition: 'width 1s linear'
                    }} />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={disableTOTP}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Disable TOTP
              </button>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '1rem', color: '#666' }}>
                Enter the TOTP secret from the social media platform to generate authentication codes.
              </p>
              <button
                type="button"
                onClick={() => setShowTOTPSetup(true)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Add TOTP Secret
              </button>
            </div>
          )}
        </div>

        {/* TOTP Setup Modal */}
        {showTOTPSetup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%'
            }}>
              <h3 style={{ fontSize: '18px', marginBottom: '1rem', fontWeight: '600' }}>Add TOTP Secret</h3>

              <p style={{ fontSize: '14px', marginBottom: '1rem', color: '#666' }}>
                Enter the TOTP secret key provided by the social media platform. This will allow you to generate authentication codes.
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  TOTP Secret Key
                </label>
                <input
                  type="text"
                  value={totpSecretInput}
                  onChange={(e) => setTOTPSecretInput(e.target.value.replace(/\s/g, ''))}
                  placeholder="Enter secret key (e.g., JBSWY3DPEHPK3PXP)"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '0.5rem' }}>
                  Remove spaces and special characters from the secret key
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowTOTPSetup(false);
                    setTOTPSecretInput("");
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveTOTPSecret}
                  disabled={!totpSecretInput.trim()}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: totpSecretInput.trim() ? '#28a745' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: totpSecretInput.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Save & Enable TOTP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Platform Access Management */}
        {platform && currentUser && (
          <PlatformAccessManager
            platformId={platform.id}
            platformType={platform.platform_type}
            userRole={currentUser.role}
          />
        )}

        {/* Form Actions */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <Link
            href={`/ecosystems/${platform?.ecosystem_id}`}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              textDecoration: 'none',
              color: '#333'
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}