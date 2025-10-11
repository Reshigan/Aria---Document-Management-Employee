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
      <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
        <h1>ARIA Document Management</h1>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
            />
          </div>
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
            Login
          </button>
        </form>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          Default credentials: admin / admin123
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        <h1>ARIA Document Management</h1>
        <div>
          <span style={{ marginRight: '20px' }}>Welcome, {user.username}!</span>
          <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>
            Logout
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Document Upload */}
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
          <h2>Upload Document</h2>
          <form onSubmit={handleFileUpload}>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              style={{ marginBottom: '10px', width: '100%' }}
            />
            <button type="submit" disabled={!file} style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
              Upload File
            </button>
          </form>
        </div>

        {/* AI Chat */}
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
          <h2>AI Assistant</h2>
          <form onSubmit={handleChat}>
            <input
              type="text"
              placeholder="Ask me about your documents..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
            <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}>
              Send Message
            </button>
          </form>
          {chatResponse && (
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #e9ecef' }}>
              <strong>AI Response:</strong>
              <p style={{ margin: '5px 0 0 0' }}>{chatResponse}</p>
            </div>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div style={{ marginTop: '30px', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
        <h2>Your Documents ({documents.length})</h2>
        {documents.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No documents uploaded yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {documents.map((doc) => (
              <div key={doc.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{doc.filename}</strong>
                    <span style={{ marginLeft: '10px', padding: '2px 8px', backgroundColor: '#28a745', color: 'white', borderRadius: '12px', fontSize: '12px' }}>
                      {doc.status}
                    </span>
                  </div>
                  <small style={{ color: '#666' }}>{new Date(doc.created_at).toLocaleDateString()}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}