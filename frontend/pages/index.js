export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>🚀 ARIA Document Management</h1>
        <p>System is working!</p>
        <a href="/login" style={{ color: 'blue', textDecoration: 'underline' }}>Go to Login</a>
      </div>
    </div>
  )
}
