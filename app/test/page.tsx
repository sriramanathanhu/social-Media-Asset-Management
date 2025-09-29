export default function TestPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'green' }}>✅ APPLICATION IS WORKING!</h1>
      <p><strong>If you can see this page, the Next.js application is running correctly.</strong></p>
      <p>Timestamp: {new Date().toISOString()}</p>
      <hr />
      <h2>Debug Information:</h2>
      <ul>
        <li>✅ Next.js application started</li>
        <li>✅ Database connected (based on logs)</li>
        <li>✅ Middleware disabled for testing</li>
        <li>✅ No application-level redirects</li>
      </ul>
      <hr />
      <h2>Next Steps:</h2>
      <ol>
        <li>Try visiting <a href="/">/</a> (home page)</li>
        <li>Try visiting <a href="/api/health">/api/health</a> (health check)</li>
        <li>If those work, the redirect issue is resolved</li>
      </ol>
    </div>
  );
}