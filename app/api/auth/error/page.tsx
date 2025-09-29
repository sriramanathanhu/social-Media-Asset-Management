"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration.";
      case "AccessDenied":
        return "Access denied. You do not have permission to sign in.";
      case "Verification":
        return "The verification token has expired or has already been used.";
      case "Default":
      default:
        return "An error occurred during authentication.";
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: '#fee2e2',
          borderRadius: '50%',
          width: '3rem',
          height: '3rem',
          margin: '0 auto 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
        </div>
        
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.5rem'
        }}>
          Authentication Error
        </h1>
        
        <p style={{
          color: '#6b7280',
          marginBottom: '1.5rem'
        }}>
          {getErrorMessage(error)}
        </p>
        
        <button
          onClick={() => window.location.href = '/'}
          style={{
            backgroundColor: '#0066cc',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            border: 'none',
            fontSize: '1rem',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Back to Home
        </button>
        
        {error && (
          <p style={{
            fontSize: '0.875rem',
            color: '#9ca3af',
            marginTop: '1rem'
          }}>
            Error code: {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}