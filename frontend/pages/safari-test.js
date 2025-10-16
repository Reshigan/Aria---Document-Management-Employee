import { useState, useEffect } from 'react'

export default function SafariTest() {
  const [diagnostics, setDiagnostics] = useState({
    userAgent: '',
    viewport: '',
    cssSupport: false,
    jsWorking: false,
    timestamp: ''
  })

  useEffect(() => {
    setDiagnostics({
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      cssSupport: window.getComputedStyle ? true : false,
      jsWorking: true,
      timestamp: new Date().toISOString()
    })
  }, [])

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>🔍 Safari Diagnostic Page</h1>
      
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#666', marginBottom: '15px' }}>Browser Information</h2>
        <p><strong>User Agent:</strong> {diagnostics.userAgent}</p>
        <p><strong>Viewport:</strong> {diagnostics.viewport}</p>
        <p><strong>CSS Support:</strong> {diagnostics.cssSupport ? '✅ Yes' : '❌ No'}</p>
        <p><strong>JavaScript Working:</strong> {diagnostics.jsWorking ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Timestamp:</strong> {diagnostics.timestamp}</p>
      </div>

      <div style={{
        backgroundColor: '#e8f5e8',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '2px solid #4caf50'
      }}>
        <h2 style={{ color: '#2e7d32', marginBottom: '15px' }}>✅ If you can see this, React is working!</h2>
        <p>This page is rendered by Next.js and React. If you can see this content, the basic framework is functioning.</p>
      </div>

      <div style={{
        backgroundColor: '#fff3cd',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '2px solid #ffc107'
      }}>
        <h2 style={{ color: '#856404', marginBottom: '15px' }}>🔧 Troubleshooting Steps</h2>
        <ol>
          <li>Clear Safari cache: Safari → Develop → Empty Caches</li>
          <li>Disable Safari extensions temporarily</li>
          <li>Try private browsing mode</li>
          <li>Check Safari console for errors (Develop → Show Web Inspector)</li>
        </ol>
      </div>

      <div style={{
        backgroundColor: '#f8d7da',
        padding: '20px',
        borderRadius: '8px',
        border: '2px solid #dc3545'
      }}>
        <h2 style={{ color: '#721c24', marginBottom: '15px' }}>🚨 If you see a blank page instead</h2>
        <p>The issue is likely one of:</p>
        <ul>
          <li>JavaScript execution blocked</li>
          <li>CSS loading failure</li>
          <li>Network connectivity issues</li>
          <li>Safari-specific compatibility problems</li>
        </ul>
      </div>
    </div>
  )
}
