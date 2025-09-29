export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '6rem',
          fontWeight: '300',
          color: '#1a73e8',
          margin: '0 0 1rem 0',
          lineHeight: '1'
        }}>
          404
        </h1>
        
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '400',
          color: '#202124',
          margin: '0 0 1rem 0'
        }}>
          Page Not Found
        </h2>
        
        <p style={{
          fontSize: '1rem',
          color: '#5f6368',
          margin: '0 0 2rem 0',
          lineHeight: '1.5'
        }}>
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1a73e8',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
        >
          Go Back Home
        </a>
      </div>
    </div>
  );
}