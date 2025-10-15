import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import ModernLayout from '../components/layout/ModernLayout'

export default function Home() {
  console.log('Home component rendering...')
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isClient, setIsClient] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [loginStatus, setLoginStatus] = useState('Ready')
  console.log('Current user state:', user)
  const [documents, setDocuments] = useState([])
  const [chatMessage, setChatMessage] = useState('')
  const [chatResponse, setChatResponse] = useState('')
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'admin123' })
  const [file, setFile] = useState(null)

  // Helper function to format document dates
  const formatDocumentDate = (dateString) => {
    if (!dateString) return 'No date'

    try {
      // Handle different date formats
      let date

      // If it's already a valid date string with timezone
      if (dateString.includes('T') && (dateString.includes('+') || dateString.includes('Z'))) {
        date = new Date(dateString)
      } else {
        // If it's a simple date string, parse it
        date = new Date(dateString)
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date'
      }

      // Format for South African locale
      return date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Africa/Johannesburg'
      })
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString)
      return 'Invalid Date'
    }
  }

  useEffect(() => {
    console.log('🔍 USEEFFECT START: Setting isClient to true')
    setIsClient(true)
    if (typeof window === 'undefined') {
      console.log('🔍 WINDOW UNDEFINED: Running on server side')
      return
    }
    console.log('🔍 CLIENT SIDE DETECTED: useEffect running on client side')
    console.log('🔍 WINDOW AVAILABLE:', typeof window)
    console.log('🔍 DOCUMENT AVAILABLE:', typeof document)

    // Test setTimeout to verify JavaScript execution
    setTimeout(() => {
      console.log('🔍 TIMEOUT EXECUTED: Client-side JavaScript is working!')
    }, 500)

    const token = localStorage.getItem('token')
    console.log('🔍 TOKEN FROM LOCALSTORAGE:', token ? 'present' : 'not found')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
      fetchDocuments()
    }
  }, [])

  const handleLogin = async () => {
    setLoginStatus('🔄 Starting login...')
    console.log('🚀 LOGIN STARTED with form data:', loginForm)

    try {
      // Send username and password to backend
      const loginData = {
        username: loginForm.username,
        password: loginForm.password
      }
      
      console.log('🔄 Sending login data to backend:', loginData)
      setLoginStatus('🔄 Sending request to /api/auth/login...')

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      })

      console.log('🔄 Got response status:', response.status)
      setLoginStatus(`🔄 Got response (${response.status}), processing...`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Login failed with error:', errorData)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.detail || 'Unknown error'}`)
      }

      const data = await response.json()
      console.log('🔄 Login response data:', data)
      setLoginStatus('🔄 Processing login data...')

      if (data.access_token) {
        console.log('✅ Access token received, storing in localStorage')
        localStorage.setItem('token', data.access_token)
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
        
        // Set user data
        const userData = data.user || { 
          username: loginForm.username, 
        }
        setUser(userData)
        setLoginStatus('✅ Login successful! Redirecting...')
        
        // Fetch user documents
        fetchDocuments()
        
        console.log('✅ Login process completed successfully')
      } else {
        throw new Error('No access token received')
      }
    } catch (error) {
      const errorMsg = error.message || 'Unknown error'
      console.error('❌ Login error:', error)
      setLoginStatus(`❌ Login failed: ${errorMsg}`)
      alert('Login failed: ' + errorMsg)
    }
  }

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me')
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
    }
  }

  const fetchDocuments = async () => {
    console.log('fetchDocuments called')
    try {
      console.log('Fetching documents from /api/documents')
      const response = await axios.get('/api/documents')
      console.log('Documents response:', response.data)
      setDocuments(response.data.documents || [])
      console.log('Documents state updated')
    } catch (error) {
      console.error('Failed to fetch documents:', error)
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
    console.log('handleChat called with message:', chatMessage)
    if (!chatMessage.trim()) {
      console.log('Empty message, returning')
      return
    }

    try {
      console.log('Sending chat request to /api/chat')
      console.log('Authorization header:', axios.defaults.headers.common['Authorization'])
      const response = await axios.post('/api/chat', { message: chatMessage })
      console.log('Chat response received:', response.data)
      setChatResponse(response.data.response)
      setChatMessage('')
    } catch (error) {
      console.error('Chat error:', error)
      console.error('Error response:', error.response?.data)
      alert('Chat failed: ' + (error.response?.data?.detail || 'Unknown error'))
    }
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
    }
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

            <div>
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
              {isClient && (
                <button onClick={handleLogin} className="vx-btn vx-btn-primary vx-w-full vx-m-md">
                  <span>🚀</span>
                  Login to ARIA
                </button>
              )}
              {isClient && (
                <div className="vx-text-center vx-m-md">
                  <strong>Login Status: {loginStatus}</strong>
                </div>
              )}
            </div>

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/');
  };

  // If user is logged in, show the modern layout with document management
  if (user) {
    return (
      <ModernLayout user={user} onLogout={handleLogout}>
        <div className="space-y-6">
          {/* Document Upload Section */}
          <div className="vx-card vx-glass p-8">
            <h2 className="text-2xl font-bold vx-text-gradient mb-6">📄 Document Management</h2>
            
            {/* Upload Form */}
            <div className="mb-8">
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-yellow-400 transition-colors">
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-4xl mb-4">📁</div>
                  <p className="text-lg text-gray-300 mb-2">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-sm text-gray-400">
                    PDF, DOC, DOCX, TXT, JPG, JPEG, PNG up to 10MB
                  </p>
                </label>
              </div>
              
              {file && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={handleFileUpload}
                    className="vx-btn vx-btn-primary"
                  >
                    <span>⬆️</span>
                    <span>Upload Document</span>
                  </button>
                </div>
              )}
            </div>

            {/* Documents List */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Recent Documents</h3>
              {documents.length > 0 ? (
                <div className="grid gap-4">
                  {documents.map((doc, index) => (
                    <div key={index} className="vx-glass p-4 rounded-lg hover:vx-glass-yellow transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">📄</span>
                          <div>
                            <h4 className="font-medium text-white">{doc.filename}</h4>
                            <p className="text-sm text-gray-400">
                              Uploaded: {formatDocumentDate(doc.upload_date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                            Processed
                          </span>
                          <button className="text-yellow-400 hover:text-yellow-300">
                            📥 Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No documents uploaded yet
                </div>
              )}
            </div>
          </div>

          {/* AI Chat Section */}
          <div className="vx-card vx-glass p-8">
            <h2 className="text-2xl font-bold vx-text-gradient mb-6">🤖 AI Assistant</h2>
            
            <div className="space-y-4">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Ask me about your documents..."
                  className="vx-input flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                />
                <button
                  onClick={handleChatSubmit}
                  className="vx-btn vx-btn-primary"
                >
                  Send
                </button>
              </div>
              
              {chatResponse && (
                <div className="vx-glass p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🤖</span>
                    <div className="flex-1">
                      <p className="text-white">{chatResponse}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModernLayout>
    );
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

          {/* Navigation Buttons */}
          <div className="vx-flex vx-gap-sm">
            <button
              onClick={() => router.push("/enterprise-dashboard")}
              className="vx-btn vx-btn-primary"
              style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
            >
              🏢 Enterprise Analytics
            </button>
            <button
              onClick={() => router.push("/document-classification")}
              className="vx-btn vx-btn-secondary"
              style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
            >
              🤖 AI Classification
            </button>
            <button
              onClick={() => router.push("/integrations")}
              className="vx-btn vx-btn-secondary"
              style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
            >
              🔗 Integrations
            </button>
            <button
              onClick={() => router.push("/reports")}
              className="vx-btn vx-btn-secondary"
              style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
            >
              📊 Reports
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="vx-btn vx-btn-secondary"
              style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={handleLogout}
              className="vx-btn vx-btn-danger"
              style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
            >
              🚪 Logout
            </button>
          </div>
          <div className="vx-flex vx-items-center vx-gap-md">
            <div className="vx-status vx-status-online">
              <div className="vx-status-dot"></div>
              <span>AI Online</span>
            </div>
            <span className="vx-text-muted">Welcome, {user.email}!</span>
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
                <div
                  key={doc.id}
                  className="vx-document-item"
                  style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
                  onClick={() => {
                    console.log('Navigating to document:', doc.id);
                    router.push(`/doc/${doc.id}`);
                  }}
                >
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
                      {formatDocumentDate(doc.upload_date)}
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