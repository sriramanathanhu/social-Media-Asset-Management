"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    // Check session status
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push("/");
          return;
        }
        if (data.user?.role !== "pending") {
          // User is approved, redirect to dashboard
          router.push("/dashboard");
          return;
        }
        setUser(data.user);
      })
      .catch(() => {
        router.push("/");
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/");
  };

  const handleCheckStatus = () => {
    window.location.reload();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '3rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '28rem',
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{
          margin: '0 auto',
          height: '5rem',
          width: '5rem',
          backgroundColor: '#fef3c7',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          <span style={{ fontSize: '2.5rem' }}>⏳</span>
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.75rem'
        }}>
          Pending Approval
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '1.5rem',
          lineHeight: '1.6'
        }}>
          Your account has been created successfully. An administrator needs to approve your account and assign you a role before you can access the portal.
        </p>

        {user && (
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '0.25rem' }}>
              <strong>Name:</strong> {user.name || 'N/A'}
            </p>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>
              <strong>Email:</strong> {user.email || 'N/A'}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={handleCheckStatus}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Check Approval Status
          </button>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>

        <p style={{
          fontSize: '12px',
          color: '#9ca3af',
          marginTop: '1.5rem'
        }}>
          Please contact your administrator if you need immediate access.
        </p>
      </div>
    </div>
  );
}
