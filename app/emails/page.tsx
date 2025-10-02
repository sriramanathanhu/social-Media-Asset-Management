"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function EmailsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [emailSettings, setEmailSettings] = useState({
    sendgrid_api_key: "",
    from_email: "",
    from_name: "",
  });

  const [testEmail, setTestEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  const checkPermissions = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) {
        router.push("/");
        return;
      }

      const session = await sessionRes.json();
      if (!session.user || session.user.role !== 'admin') {
        router.push("/dashboard");
        return;
      }

      setCheckingAuth(false);

      // Load existing settings
      const settingsRes = await fetch("/api/emails");
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setEmailSettings({
          sendgrid_api_key: data.sendgrid_api_key || "",
          from_email: data.from_email || "",
          from_name: data.from_name || "",
        });
        setHasApiKey(data.has_api_key || false);
      }
    } catch (error) {
      console.error("Permission check failed:", error);
      router.push("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: '#666' }}>Checking permissions...</div>
      </div>
    );
  }

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailSettings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setMessage({ type: 'success', text: 'Email settings saved successfully!' });
      setHasApiKey(data.has_api_key || false);

      // Update the API key field with masked value
      if (data.sendgrid_api_key) {
        setEmailSettings(prev => ({
          ...prev,
          sendgrid_api_key: data.sendgrid_api_key
        }));
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    if (!hasApiKey) {
      setMessage({ type: 'error', text: 'Please save your SendGrid API key first' });
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/emails/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to_email: testEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send test email");
      }

      setMessage({ type: 'success', text: `Test email sent successfully to ${testEmail}!` });
      setTestEmail("");
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send test email' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '0.5rem' }}>Email Settings</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Configure SendGrid email settings for sending notifications
        </p>
      </div>

      {message && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: message.type === 'success' ? '#065f46' : '#991b1b',
          borderRadius: '8px',
          borderLeft: `4px solid ${message.type === 'success' ? '#10b981' : '#dc2626'}`
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {/* SendGrid Configuration */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '1.5rem', fontWeight: '600' }}>
            SendGrid Configuration
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '14px' }}>
                SendGrid API Key *
              </label>
              <input
                type="password"
                placeholder="SG.xxxxxxxxxxxxxxxxxxxxx"
                value={emailSettings.sendgrid_api_key}
                onChange={(e) => setEmailSettings({ ...emailSettings, sendgrid_api_key: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>
                Get your API key from <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc' }}>SendGrid Settings</a>
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '14px' }}>
                From Email *
              </label>
              <input
                type="email"
                placeholder="noreply@yourdomain.com"
                value={emailSettings.from_email}
                onChange={(e) => setEmailSettings({ ...emailSettings, from_email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>
                Must be a verified sender in SendGrid
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '14px' }}>
                From Name *
              </label>
              <input
                type="text"
                placeholder="Social Media Portal"
                value={emailSettings.from_name}
                onChange={(e) => setEmailSettings({ ...emailSettings, from_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              style={{
                padding: '0.75rem',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                fontWeight: '500',
                marginTop: '0.5rem'
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* SendGrid Setup Guide */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '1.5rem', fontWeight: '600' }}>
            📖 Setup Guide
          </h2>

          <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '0.75rem', fontWeight: '600' }}>1. Get SendGrid API Key</h3>
            <ol style={{ marginLeft: '1.25rem', marginBottom: '1.5rem' }}>
              <li>Go to <a href="https://app.sendgrid.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc' }}>SendGrid</a></li>
              <li>Navigate to Settings → API Keys</li>
              <li>Click "Create API Key"</li>
              <li>Name it (e.g., "Social Media Portal")</li>
              <li>Select "Full Access" or "Mail Send"</li>
              <li>Copy the API key (starts with SG.)</li>
            </ol>

            <h3 style={{ fontSize: '16px', marginBottom: '0.75rem', fontWeight: '600' }}>2. Verify Sender Email</h3>
            <ol style={{ marginLeft: '1.25rem', marginBottom: '1.5rem' }}>
              <li>Go to Settings → Sender Authentication</li>
              <li>Click "Verify a Single Sender"</li>
              <li>Add your "From Email" address</li>
              <li>Check your inbox and verify the email</li>
            </ol>

            <h3 style={{ fontSize: '16px', marginBottom: '0.75rem', fontWeight: '600' }}>3. Test Configuration</h3>
            <p>Once saved, use the test email section below to verify everything works.</p>
          </div>
        </div>
      </div>

      {/* Test Email Section */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginTop: '2rem'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '1.5rem', fontWeight: '600' }}>
          Test Email Configuration
        </h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
          Send a test email to verify your SendGrid settings are working correctly
        </p>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '14px' }}>
              Test Email Address
            </label>
            <input
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <button
            onClick={handleSendTest}
            disabled={sending || !hasApiKey}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: !hasApiKey ? '#ccc' : '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!hasApiKey || sending) ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: sending ? 0.6 : 1
            }}
          >
            <span>📧</span>
            {sending ? 'Sending...' : 'Send Test Email'}
          </button>
        </div>

        {!hasApiKey && (
          <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '0.5rem' }}>
            ⚠️ Please save your SendGrid API key first before sending test emails
          </p>
        )}
      </div>
    </div>
  );
}
