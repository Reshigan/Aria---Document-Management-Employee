import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'

export default function DocumentView() {
  const router = useRouter()
  const { id } = router.query
  const [document, setDocument] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (id) {
      fetchDocument()
    }
  }, [id])

  const fetchDocument = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      console.log('Token from localStorage:', token ? 'Token exists' : 'No token found')
      
      if (!token) {
        setError('Authentication required. Please log in.')
        setLoading(false)
        return
      }
      
      const response = await axios.get(`/api/documents/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      setDocument(response.data)
      setError(null)
    } catch (error) {
      console.error('Error fetching document:', error)
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.')
        localStorage.removeItem('token')
      } else if (error.response?.status === 404) {
        setError('Document not found.')
      } else {
        setError('Failed to load document')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#111827', 
        color: 'white', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '3px solid #374151', 
            borderTop: '3px solid #f59e0b', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading document...</p>
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#111827', 
        color: 'white', 
        padding: '24px' 
      }}>
        <div style={{ textAlign: 'center', paddingTop: '48px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Document Not Found</h2>
          <p style={{ color: '#9ca3af', marginBottom: '24px' }}>{error || 'The requested document could not be found.'}</p>
          <button
            onClick={() => router.push('/')}
            style={{
              backgroundColor: '#f59e0b',
              color: 'black',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#111827', 
      color: 'white' 
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '32px' 
        }}>
          <button
            onClick={() => router.push('/')}
            style={{
              backgroundColor: 'transparent',
              color: '#9ca3af',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {document.filename}
          </h1>
        </div>

        {/* Document Info */}
        <div style={{ 
          backgroundColor: '#1f2937', 
          padding: '24px', 
          borderRadius: '12px', 
          marginBottom: '24px' 
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '14px' }}>Document Type</label>
              <p style={{ fontWeight: '500' }}>{document.document_type || 'Unknown'}</p>
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '14px' }}>Upload Date</label>
              <p style={{ fontWeight: '500' }}>{new Date(document.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '14px' }}>Status</label>
              <p style={{ fontWeight: '500' }}>{document.status || 'Active'}</p>
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '14px' }}>File Size</label>
              <p style={{ fontWeight: '500' }}>
                {document.file_size ? `${Math.round(document.file_size / 1024)} KB` : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* OCR Content */}
        <div style={{ 
          backgroundColor: '#1f2937', 
          padding: '24px', 
          borderRadius: '12px', 
          marginBottom: '24px' 
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Document Content
          </h2>
          <div style={{ 
            backgroundColor: '#111827', 
            padding: '16px', 
            borderRadius: '8px', 
            maxHeight: '400px', 
            overflowY: 'auto' 
          }}>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'monospace', 
              fontSize: '14px', 
              lineHeight: '1.5',
              margin: 0
            }}>
              {document.ocr_text || 'No text content available'}
            </pre>
          </div>
        </div>

        {/* Metadata */}
        {document.metadata && Object.keys(document.metadata).length > 0 && (
          <div style={{ 
            backgroundColor: '#1f2937', 
            padding: '24px', 
            borderRadius: '12px' 
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              Extracted Metadata
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              {Object.entries(document.metadata).map(([key, value]) => (
                <div key={key}>
                  <label style={{ color: '#9ca3af', fontSize: '14px', textTransform: 'capitalize' }}>
                    {key.replace(/_/g, ' ')}
                  </label>
                  <p style={{ fontWeight: '500', fontSize: '14px' }}>
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}