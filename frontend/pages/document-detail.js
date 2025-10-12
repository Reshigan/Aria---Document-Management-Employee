import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import {
  DocumentIcon,
  CalendarIcon,
  TagIcon,
  UserIcon,
  CurrencyDollarIcon,
  ArrowLeftIcon,
  DownloadIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function DocumentDetail() {
  const router = useRouter()
  const { id } = router.query
  const [document, setDocument] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    console.log('Document detail page - token:', !!token, 'userData:', !!userData, 'id:', id)
    
    if (!token || !userData) {
      console.log('No token or userData, redirecting to /')
      router.push('/')
      return
    }
    
    try {
      const user = JSON.parse(userData)
      setUser(user)

      if (id) {
        fetchDocumentDetails(id, token)
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/')
    }
  }, [id, router])

  const fetchDocumentDetails = async (documentId, token) => {
    try {
      setLoading(true)
      console.log('Fetching document details for ID:', documentId)
      
      const response = await axios.get(`/api/proxy/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Document details response:', response.data)
      setDocument(response.data)
      setError(null)
    } catch (error) {
      console.error('Error fetching document details:', error)
      setError(error.response?.data?.detail || 'Failed to load document details')
    } finally {
      setLoading(false)
    }
  }

  const downloadDocument = async () => {
    if (!document || !user) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/proxy/documents/${document.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', document.filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Failed to download document')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="text-center py-12">
          <DocumentIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Document Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'The requested document could not be found.'}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-amber-400 hover:bg-amber-500 text-black font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
          <button
            onClick={downloadDocument}
            className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-black font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <DownloadIcon className="h-5 w-5" />
            <span>Download</span>
          </button>
        </div>

        {/* Document Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-amber-400/20 rounded-lg">
                <DocumentIcon className="h-8 w-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">{document.filename}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <TagIcon className="h-4 w-4" />
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                      {document.document_type || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>{new Date(document.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <EyeIcon className="h-4 w-4" />
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                      {document.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* OCR Text Content */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <DocumentIcon className="h-5 w-5 text-amber-400" />
                <span>Document Content</span>
              </h2>
              <div className="bg-gray-900/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {document.ocr_text || 'No text content available'}
                </pre>
              </div>
            </div>

            {/* AI Analysis */}
            {document.ai_analysis && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                  <span className="text-purple-400">🤖</span>
                  <span>AI Analysis</span>
                </h2>
                <div className="space-y-4">
                  {document.ai_analysis.classification && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Classification</h3>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
                          {document.ai_analysis.classification.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round(document.ai_analysis.classification.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {document.ai_analysis.summary && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Summary</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {document.ai_analysis.summary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Document Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Document Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">File Size</label>
                  <p className="text-white">{document.file_size ? `${Math.round(document.file_size / 1024)} KB` : 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Upload Date</label>
                  <p className="text-white">{new Date(document.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Status</label>
                  <p className="text-white">{document.status || 'Active'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Processing Status</label>
                  <p className="text-white">{document.processing_status || 'Completed'}</p>
                </div>
              </div>
            </div>

            {/* Extracted Metadata */}
            {document.metadata && Object.keys(document.metadata).length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <TagIcon className="h-5 w-5 text-amber-400" />
                  <span>Extracted Data</span>
                </h2>
                <div className="space-y-3">
                  {Object.entries(document.metadata).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-sm font-medium text-gray-400 capitalize">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <p className="text-white text-sm">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OCR Confidence */}
            {document.ocr_confidence && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">OCR Quality</h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Confidence</span>
                    <span className="text-white font-medium">
                      {Math.round(document.ocr_confidence * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-amber-400 to-green-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${document.ocr_confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}