import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
// import Layout from '../../components/Layout'
import {
  DocumentIcon,
  CalendarIcon,
  TagIcon,
  EyeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline'

export default function DocumentDetail() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [document, setDocument] = useState(null)
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
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      if (id) {
        fetchDocumentDetails()
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/')
    }
  }, [id, router])

  const fetchDocumentDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch document details
      const docResponse = await axios.get(`/api/proxy/documents/${id}`)
      setDocument(docResponse.data)
      
    } catch (error) {
      console.error('Failed to fetch document details:', error)
      setError('Failed to load document details')
      if (error.response?.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
        }
        router.push('/')
      }
    } finally {
      setLoading(false)
    }
  }

  const downloadDocument = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/proxy/documents/${id}/download`, {
        responseType: 'blob'
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', document.filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
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
            <CloudArrowDownIcon className="h-5 w-5" />
            <span>Download</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <DocumentIcon className="h-12 w-12 text-amber-400 mt-1" />
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-2">{document.filename}</h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Uploaded: {new Date(document.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-400">
                      <DocumentTextIcon className="h-4 w-4" />
                      <span>Size: {document.file_size ? `${(document.file_size / 1024).toFixed(1)} KB` : 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Classification */}
            {document.classification && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <TagIcon className="h-6 w-6 text-amber-400" />
                  <h2 className="text-xl font-semibold text-white">AI Classification</h2>
                </div>
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-4">
                  <span className="inline-block px-3 py-1 bg-amber-400/20 text-amber-400 rounded-full text-sm font-medium">
                    {document.classification}
                  </span>
                  {document.confidence_score && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-400">Confidence Score</span>
                        <span className="text-amber-400">{(document.confidence_score * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-amber-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${document.confidence_score * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Extracted Text */}
            {document.extracted_text && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <DocumentTextIcon className="h-6 w-6 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">Extracted Text (OCR)</h2>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                    {document.extracted_text}
                  </pre>
                </div>
              </div>
            )}

            {/* AI Analysis */}
            {document.ai_analysis && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <ChartBarIcon className="h-6 w-6 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">AI Analysis</h2>
                </div>
                <div className="bg-purple-400/10 border border-purple-400/20 rounded-lg p-4">
                  <p className="text-gray-300 leading-relaxed">{document.ai_analysis}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Document Stats */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Document Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">File Type</span>
                  <span className="text-white">{document.filename?.split('.').pop()?.toUpperCase() || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Processing Status</span>
                  <span className="text-green-400">Completed</span>
                </div>
                {document.extracted_text && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Text Length</span>
                    <span className="text-white">{document.extracted_text.length} chars</span>
                  </div>
                )}
                {document.word_count && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Word Count</span>
                    <span className="text-white">{document.word_count}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Processing History */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Processing History</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <div>
                    <p className="text-sm text-white">Document uploaded</p>
                    <p className="text-xs text-gray-400">{new Date(document.created_at).toLocaleString()}</p>
                  </div>
                </div>
                {document.extracted_text && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <div>
                      <p className="text-sm text-white">OCR processing completed</p>
                      <p className="text-xs text-gray-400">Text extracted successfully</p>
                    </div>
                  </div>
                )}
                {document.classification && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                    <div>
                      <p className="text-sm text-white">AI classification completed</p>
                      <p className="text-xs text-gray-400">Classified as {document.classification}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/search?q=${encodeURIComponent(document.filename)}`)}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Find Similar Documents
                </button>
                <button
                  onClick={downloadDocument}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-black font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Download Original
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this document?')) {
                        // TODO: Implement delete functionality
                        alert('Delete functionality not implemented yet')
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Delete Document
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}