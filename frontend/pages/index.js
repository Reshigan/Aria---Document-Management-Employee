export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{ 
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '10px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          🚀 ARIA Document Management
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#6B7280', 
          marginBottom: '30px' 
        }}>
          World-class AI-powered document management system
        </p>
        <div style={{ marginBottom: '20px' }}>
          <a href="/modern-login" style={{ 
            color: 'white', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '15px 30px', 
            borderRadius: '12px', 
            textDecoration: 'none',
            marginRight: '15px',
            display: 'inline-block',
            fontWeight: '600',
            fontSize: '16px',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease'
          }}>
            ✨ Modern Login
          </a>
          <a href="/enhanced-dashboard" style={{ 
            color: '#667eea', 
            backgroundColor: 'transparent', 
            padding: '15px 30px', 
            borderRadius: '12px', 
            textDecoration: 'none',
            border: '2px solid #667eea',
            display: 'inline-block',
            fontWeight: '600',
            fontSize: '16px',
            transition: 'all 0.3s ease'
          }}>
            📊 View Dashboard
          </a>
        </div>
        <div>
          <a href="/login" style={{ 
            color: '#9CA3AF', 
            textDecoration: 'underline', 
            fontSize: '14px' 
          }}>
            Classic Login
          </a>
        </div>
      </div>
    </div>
  )
}
