"use client";

import { useState } from "react";

export default function SSOTestPage() {
  const [testUrl, setTestUrl] = useState("https://auth.kailasa.ai");
  const [endpoint, setEndpoint] = useState("/auth/authorize");
  const [result, setResult] = useState("");

  const testEndpoint = async () => {
    const fullUrl = `${testUrl}${endpoint}`;
    setResult("Testing...");
    
    try {
      const response = await fetch(fullUrl, { method: 'HEAD', mode: 'no-cors' });
      setResult(`✅ URL accessible: ${fullUrl}`);
    } catch (error) {
      try {
        // Try a simple fetch to see if we get any response
        const testResponse = await fetch(fullUrl);
        setResult(`✅ URL accessible: ${fullUrl} (Status: ${testResponse.status})`);
      } catch (fetchError) {
        setResult(`❌ URL not accessible: ${fullUrl}\nError: ${fetchError.message}\n\nPlease verify the correct Nandi SSO URL with your team.`);
      }
    }
  };

  const commonEndpoints = [
    "/auth/authorize",
    "/auth/sign-in", 
    "/authorize",
    "/login",
    "/oauth/authorize",
    "/sso/authorize",
    "/.well-known/openid-configuration"
  ];

  const testAllEndpoints = async () => {
    setResult("Testing all common endpoints...\n");
    
    for (const ep of commonEndpoints) {
      const fullUrl = `${testUrl}${ep}`;
      try {
        const response = await fetch(fullUrl, { method: 'HEAD', mode: 'no-cors' });
        setResult(prev => prev + `✅ ${ep}: Accessible\n`);
      } catch (error) {
        setResult(prev => prev + `❌ ${ep}: Not accessible\n`);
      }
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔧 Nandi SSO URL Testing Tool</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#fef3cd', borderRadius: '8px' }}>
        <h3>⚠️ Issue Identified</h3>
        <p>The Nandi SSO URL <code>https://auth.kailasa.ai</code> is returning 404 errors.</p>
        <p>Use this tool to find the correct URL and endpoint.</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          <strong>Base SSO URL:</strong>
        </label>
        <input
          type="text"
          value={testUrl}
          onChange={(e) => setTestUrl(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}
          placeholder="https://your-sso-domain.com"
        />

        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          <strong>Endpoint Path:</strong>
        </label>
        <select
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}
        >
          {commonEndpoints.map(ep => (
            <option key={ep} value={ep}>{ep}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button
            onClick={testEndpoint}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test Single Endpoint
          </button>
          
          <button
            onClick={testAllEndpoints}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test All Common Endpoints
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <strong>Test Result:</strong>
        <pre style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          minHeight: '100px',
          border: '1px solid #dee2e6'
        }}>
          {result || 'Click a button to test the URL...'}
        </pre>
      </div>

      <div style={{ padding: '1rem', backgroundColor: '#d1ecf1', borderRadius: '8px' }}>
        <h3>💡 Next Steps</h3>
        <ol>
          <li>Ask your team for the correct Nandi SSO base URL</li>
          <li>Test different URLs using this tool</li>
          <li>Once you find a working URL, update your Coolify environment variables:
            <ul>
              <li><code>NANDI_SSO_URL</code> = working base URL</li>
              <li><code>NEXT_PUBLIC_NANDI_SSO_URL</code> = same URL</li>
            </ul>
          </li>
          <li>Common alternative URLs to try:
            <ul>
              <li><code>https://sso.kailasa.ai</code></li>
              <li><code>https://login.kailasa.ai</code></li>
              <li><code>https://nandi.kailasa.ai</code></li>
              <li>Or whatever domain your team provides</li>
            </ul>
          </li>
        </ol>
      </div>
      
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <a 
          href="/"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          ← Back to Login Page
        </a>
      </div>
    </div>
  );
}