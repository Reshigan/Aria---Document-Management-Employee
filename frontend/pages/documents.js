import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { motion, AnimatePresence } from "framer-motion"
import axios from "axios"
import AppLayout from "../components/layout/AppLayout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card"
import Button from "../components/ui/Button"

const Documents = () => {
  const router = useRouter()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [dragActive, setDragActive] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize] = useState(12) // Show 12 documents per page
  const [sortField, setSortField] = useState("created_at")
  const [sortDirection, setSortDirection] = useState("desc")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetchDocuments()
  }, [router, mounted, currentPage, searchTerm, selectedCategory, sortField, sortDirection])

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      
      setLoading(true);
      // Add pagination and search parameters (Zero-Slop Laws #12 and #11)
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        sortBy: sortField,
        sortOrder: sortDirection
      };
      
      const response = await axios.get("/api/documents/", {
        headers: { Authorization: `Bearer ${token}` },
        params: params
      });
      
      // Ensure we always have an array or handle pagination response
      let docs = [];
      let totalCount = 0;
      
      if (Array.isArray(response.data)) {
        // Simple array response
        docs = response.data;
        totalCount = docs.length;
      } else if (response.data && response.data.data) {
        // Paginated response with metadata
        docs = response.data.data;
        totalCount = response.data.total || docs.length;
      } else {
        // Unexpected response format
        docs = [];
        totalCount = 0;
      }
      
      setDocuments(docs);
      setTotalPages(Math.ceil(totalCount / pageSize));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setDocuments([]); // Ensure we set an empty array on error
      
      // Show error to user (Zero-Slop Law #3 - No Silent State Failures)
      alert(`Failed to load documents: ${error.response?.data?.detail || error.message || 'Unknown error'}. Please try refreshing.`);
      setLoading(false);
    }
  }

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const token = localStorage.getItem("token");

    try {
      // Validate files first (Zero-Slop Law #43 - Form Validation)
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
          setUploading(false);
          return;
        }
        
        const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.xls', '.xlsx'];
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!validExtensions.includes(ext)) {
          alert(`File "${file.name}" has invalid type. Supported types: PDF, JPG, PNG, XLS, XLSX.`);
          setUploading(false);
          return;
        }
      }

      // Upload each file (Zero-Slop Law #10 - No Forms that Submit to Nowhere) 
      const uploadResults = [];
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await axios.post("/api/documents/upload", formData, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "multipart/form-data"
            }
          });
          
          uploadResults.push({ fileName: file.name, success: true, data: response.data });
        } catch (uploadError) {
          uploadResults.push({ 
            fileName: file.name, 
            success: false, 
            error: uploadError.response?.data?.detail || uploadError.message || 'Upload failed' 
          });
        }
      }
      
      // Show upload results to user (part of Zero-Slop Law #10 and #43)
      const failures = uploadResults.filter(r => !r.success);
      if (failures.length > 0) {
        const failureList = failures.map(f => `${f.fileName}: ${f.error}`).join('\n');
        alert(`Some uploads failed:\n${failureList}\n\nSuccessfully uploaded: ${uploadResults.length - failures.length} files.`);
      } else if (uploadResults.length > 0) {
        alert(`Successfully uploaded ${uploadResults.length} file(s)!`);
      }
      
      // Refresh documents list
      await fetchDocuments();
      setUploading(false);
    } catch (error) {
      console.error("Error uploading files:", error);
      
      // Show error to user (Zero-Slop Law #1 - No Empty Catch Blocks)
      alert(`Upload process failed: ${error.message || 'Unknown error'}. Please try again.`);
      setUploading(false);
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(Array.from(e.dataTransfer.files))
    }
  }

  // Ensure documents is always an array before filtering
  const safeDocuments = Array.isArray(documents) ? documents : []
  const filteredDocuments = safeDocuments.filter(doc => {
    const matchesSearch = doc.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.content?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-slate-800 mb-2">Document Management</h1>
                <p className="text-slate-600">Upload, organize, and manage your documents with AI-powered insights</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => document.getElementById("file-upload").click()}
                  disabled={uploading}
                  className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : "Upload Documents"}
                </Button>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div
                style={{ borderStyle: 'solid !important' }}
                className={`border-2 border-purple-300 rounded-lg p-8 text-center transition-colors ${
                  dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Upload Documents</h3>
                    <p className="text-slate-600 mb-4">Drag and drop files here, or click to select</p>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      id="file-upload"
                      onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                    />
                    <Button
                      onClick={() => document.getElementById("file-upload").click()}
                      disabled={uploading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {uploading ? "Uploading..." : "Select Files"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Sorting Controls */}
            <div className="flex gap-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                Sort by:
              </label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Created Date</option>
                <option value="filename">Filename</option>
                <option value="file_size">Size</option>
                <option value="category">Category</option>
              </select>
              
              <button
                onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                className="px-2 py-1 ml-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                title={sortDirection === "asc" ? "Ascending" : "Descending"}
              >
                {sortDirection === "asc" ? "↑" : "↓"}
              </button>
            </div>
            
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ borderStyle: 'solid !important' }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ borderStyle: 'solid !important' }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="contract">Contracts</option>
              <option value="invoice">Invoices</option>
              <option value="report">Reports</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Documents Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading documents...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredDocuments.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg font-semibold text-slate-800 truncate">
                            {doc.filename || "Untitled Document"}
                          </CardTitle>
                          {doc.status && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              doc.status === 'processed' ? 'bg-green-100 text-green-800' :
                              doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              doc.status === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                            </span>
                          )}
                        </div>
                        <CardDescription>
                          {doc.category && (
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2">
                              {doc.category}
                            </span>
                          )}
                          {doc.doc_type && (
                            <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                              {doc.doc_type.replace('_', ' ').toUpperCase()}
                            </span>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                          {doc.content || "No content available"}
                        </p>
                        <div className="flex justify-between items-center text-xs text-slate-500 mb-3">
                          <span>
                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Unknown date"}
                          </span>
                          <span>{doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : "Unknown size"}</span>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button 
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            onClick={() => {
                              // View document action - can be implemented later with proper routing
                              alert(`View details for document: ${doc.filename || doc.id}`);
                            }}
                          >
                            View
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                            onClick={() => {
                              // Download document action
                              alert(`Download document: ${doc.filename || doc.id} (implementation coming soon)`);
                            }}
                          >
                            Download
                          </button>
                          <button 
                            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                            onClick={() => {
                              // Process with AI action
                              alert(`Process document with ARIA AI: ${doc.filename || doc.id} (requires API integration)`);
                            }}
                          >
                            Process AI
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!loading && filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No documents found</h3>
              <p className="text-slate-600 mb-4">Upload your first document to get started with ARIA's AI processing</p>
              <Button
                onClick={() => document.getElementById("file-upload").click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Upload Your First Document
              </Button>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  )
}

export default Documents
