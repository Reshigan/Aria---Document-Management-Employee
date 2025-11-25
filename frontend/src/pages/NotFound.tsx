import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        padding: '3rem',
        maxWidth: '500px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{
          fontSize: '6rem',
          fontWeight: 'bold',
          color: '#667eea',
          margin: '0 0 1rem 0'
        }}>404</h1>
        
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '1rem'
        }}>Page Not Found</h2>
        
        <p style={{
          color: '#6b7280',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'white',
              border: '2px solid #667eea',
              borderRadius: '0.5rem',
              color: '#667eea',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'white';
            }}
          >
            <ArrowLeft size={20} />
            Go Back
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#667eea',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#5568d3';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#667eea';
            }}
          >
            <Home size={20} />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
