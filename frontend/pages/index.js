import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Home() {
  const [user, setUser] = useState(null)
  const [documents, setDocuments] = useState([])
  const [chatMessage, setChatMessage] = useState('')
  const [chatResponse, setChatResponse] = useState('')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [file, setFile] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
      fetchDocuments()
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me')
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      localStorage.removeItem('token')
    }
  }

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/api/documents')
      setDocuments(response.data.documents || [])
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const response = await axios.post('/api/auth/login', loginForm)
      const { access_token, user } = response.data
      localStorage.setItem('token', access_token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      setUser(user)
      fetchDocuments()
    } catch (error) {
      alert('Login failed: ' + (error.response?.data?.detail || 'Unknown error'))
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      await axios.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert('File uploaded successfully!')
      setFile(null)
      fetchDocuments()
    } catch (error) {
      alert('Upload failed: ' + (error.response?.data?.detail || 'Unknown error'))
    }
  }

  const handleChat = async (e) => {
    e.preventDefault()
    if (!chatMessage.trim()) return

    try {
      const response = await axios.post('/api/chat', { message: chatMessage })
      setChatResponse(response.data.response)
      setChatMessage('')
    } catch (error) {
      alert('Chat failed: ' + (error.response?.data?.detail || 'Unknown error'))
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    setDocuments([])
  }

  if (!user) {
    return (
      <>
        {/* Floating Orbs */}
        <div className="vx-floating-orb" style={{ top: '20%', left: '10%', animationDelay: '0s' }}></div>
        <div className="vx-floating-orb" style={{ top: '60%', right: '15%', animationDelay: '2s' }}></div>
        <div className="vx-floating-orb" style={{ bottom: '20%', left: '20%', animationDelay: '4s' }}></div>

        <div className="vx-flex vx-items-center vx-justify-center" style={{ minHeight: '100vh', padding: '20px' }}>
          <div className="vx-card vx-glass vx-animate-fade-in" style={{ maxWidth: '400px', width: '100%' }}>
            {/* VantaX Header */}
            <div className="vx-flex vx-items-center vx-gap-md vx-m-lg vx-text-center vx-justify-center">
              <div className="vx-logo">VX</div>
              <div>
                <h1 className="vx-title vx-text-gradient">ARIA</h1>
                <p className="vx-text-muted" style={{ fontSize: '0.9rem', marginTop: '-0.5rem' }}>
                  Document Management AI
                </p>
              </div>
            </div>

            <div className="vx-card-header vx-text-center">
              <p className="vx-card-description">
                Powered by VantaX's multidisciplinary AI technology
              </p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="vx-m-md">
                <input
                  type="text"
                  placeholder="Username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="vx-input"
                />
              </div>
              <div className="vx-m-md">
                <input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="vx-input"
                />
              </div>
              <button type="submit" className="vx-btn vx-btn-primary vx-w-full vx-m-md">
                <span>🚀</span>
                Login to ARIA
              </button>
            </form>

            <div className="vx-text-center vx-m-lg">
              <p className="vx-text-muted" style={{ fontSize: '0.875rem' }}>
                Default credentials: <span className="vx-text-gradient">admin / admin123</span>
              </p>
            </div>

            {/* System Status */}
            <div className="vx-flex vx-justify-center vx-gap-sm vx-m-lg">
              <div className="vx-status vx-status-online">
                <div className="vx-status-dot"></div>
                <span>AI Online</span>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Floating Orbs */}
      <div className="vx-floating-orb" style={{ top: '20%', left: '10%', animationDelay: '0s' }}></div>
      <div className="vx-floating-orb" style={{ top: '60%', right: '15%', animationDelay: '2s' }}></div>
      <div className="vx-floating-orb" style={{ bottom: '20%', left: '20%', animationDelay: '4s' }}></div>

      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* VantaX Header */}
        <header className="vx-glass vx-animate-fade-in" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px', 
          padding: '20px 30px',
          borderBottom: '1px solid rgba(255, 215, 0, 0.2)' 
        }}>
          <div className="vx-flex vx-items-center vx-gap-md">
            <div className="vx-logo">VX</div>
            <div>
              <h1 className="vx-title vx-text-gradient" style={{ margin: 0 }}>ARIA</h1>
              <p className="vx-text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>
                Document Management AI
              </p>
            </div>
          </div>
          <div className="vx-flex vx-items-center vx-gap-md">
            <div className="vx-status vx-status-online">
              <div className="vx-status-dot"></div>
              <span>AI Online</span>
            </div>
            <span className="vx-text-muted">Welcome, {user.username}!</span>
            <button onClick={handleLogout} className="vx-btn vx-btn-ghost">
              Logout
            </button>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
          {/* Document Upload */}
          <div className="vx-card vx-glass vx-animate-slide-up">
            <div className="vx-card-header">
              <h2 className="vx-card-title vx-text-gradient">
                <span style={{ marginRight: '10px' }}>📤</span>
                Upload Document
              </h2>
              <p className="vx-card-description">
                Process documents with VantaX AI technology
              </p>
            </div>
            <form onSubmit={handleFileUpload}>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="vx-input"
                style={{ marginBottom: '15px' }}
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.xlsx,.xls"
              />
              <button 
                type="submit" 
                disabled={!file} 
                className="vx-btn vx-btn-primary vx-w-full"
              >
                <span>🚀</span>
                Process with AI
              </button>
            </form>
          </div>

          {/* AI Chat */}
          <div className="vx-card vx-glass-yellow vx-animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="vx-card-header">
              <h2 className="vx-card-title vx-text-gradient">
                <span style={{ marginRight: '10px' }}>🤖</span>
                ARIA Assistant
              </h2>
              <p className="vx-card-description">
                Ask about document processing, OCR, and business data
              </p>
            </div>
            <form onSubmit={handleChat}>
              <input
                type="text"
                placeholder="Ask ARIA about your documents..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="vx-input"
                style={{ marginBottom: '15px' }}
              />
              <button type="submit" className="vx-btn vx-btn-primary vx-w-full">
                <span>💬</span>
                Send Message
              </button>
            </form>
            {chatResponse && (
              <div className="vx-glass" style={{ 
                marginTop: '15px', 
                padding: '15px',
                border: '1px solid rgba(255, 215, 0, 0.3)'
              }}>
                <div className="vx-flex vx-items-center vx-gap-sm vx-m-sm">
                  <div className="vx-logo" style={{ width: '20px', height: '20px', fontSize: '0.8rem' }}>VX</div>
                  <strong className="vx-text-gradient">ARIA Response:</strong>
                </div>
                <p className="vx-text-muted" style={{ margin: '10px 0 0 0', lineHeight: '1.5' }}>
                  {chatResponse}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div className="vx-card vx-glass vx-animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="vx-card-header">
            <h2 className="vx-card-title vx-text-gradient">
              <span style={{ marginRight: '10px' }}>📋</span>
              Your Documents ({documents.length})
            </h2>
            <p className="vx-card-description">
              Processed documents with AI classification and business data extraction
            </p>
          </div>
          
          {documents.length === 0 ? (
            <div className="vx-text-center vx-p-xl">
              <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>📄</div>
              <p className="vx-text-muted" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                No documents uploaded yet
              </p>
              <p className="vx-text-muted" style={{ fontSize: '0.9rem' }}>
                Upload your first document to experience VantaX AI processing
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {documents.map((doc) => (
                <div key={doc.id} className="vx-document-item">
                  <div className="vx-document-icon">
                    {doc.document_category === 'invoice' ? '📄' : 
                     doc.document_category === 'remittance' ? '💰' :
                     doc.document_category === 'pod' ? '📦' : 
                     doc.document_category === 'contract' ? '📋' : '📄'}
                  </div>
                  <div className="vx-flex vx-flex-col" style={{ flex: 1 }}>
                    <div className="vx-font-semibold" style={{ marginBottom: '4px' }}>
                      {doc.filename}
                    </div>
                    <div className="vx-text-muted" style={{ fontSize: '0.875rem' }}>
                      {doc.document_category ? `${doc.document_category.charAt(0).toUpperCase() + doc.document_category.slice(1)}` : 'Processing...'}
                      {doc.extracted_text && (
                        <span style={{ marginLeft: '10px' }}>
                          • OCR: {doc.extracted_text.length > 50 ? 'Complete' : 'Partial'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="vx-flex vx-items-center vx-gap-sm">
                    <div className="vx-status vx-status-processed">
                      <div className="vx-status-dot"></div>
                      <span>{doc.status || 'Processed'}</span>
                    </div>
                    <small className="vx-text-muted">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}