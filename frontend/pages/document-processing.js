import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const DocumentProcessing = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('upload');
  const [processingJobs, setProcessingJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [ocrEngine, setOcrEngine] = useState('ensemble');
  const [autoProcess, setAutoProcess] = useState(true);
  const [analysisTypes, setAnalysisTypes] = useState({
    classification: true,
    sentiment: true,
    summarization: true,
    entity_extraction: true,
    key_phrases: false,
    topic_modeling: false
  });

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadProcessingJobs();
  }, []);

  const loadProcessingJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents/processing/jobs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const jobs = await response.json();
        setProcessingJobs(jobs);
      }
    } catch (error) {
      console.error('Failed to load processing jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0
    }));
    setUploadFiles(prev => [...prev, ...newFiles]);
  };

  const uploadFile = async (uploadFile) => {
    try {
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        )
      );

      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('auto_process', autoProcess.toString());
      formData.append('ocr_engine', ocrEngine);
      formData.append('analysis_types', Object.entries(analysisTypes)
        .filter(([_, enabled]) => enabled)
        .map(([type, _]) => type)
        .join(',')
      );

      const response = await fetch('/api/documents/processing/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      setUploadFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: autoProcess ? 'processing' : 'completed',
                progress: autoProcess ? 50 : 100,
                result
              }
            : f
        )
      );

      // Refresh jobs list
      loadProcessingJobs();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: errorMessage }
            : f
        )
      );
    }
  };

  const loadJobResults = async (jobId) => {
    try {
      const response = await fetch(`/api/documents/processing/job/${jobId}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const jobDetails = await response.json();
        setSelectedJob(jobDetails);
        setActiveTab('results');
      }
    } catch (error) {
      console.error('Failed to load job results:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'processing':
      case 'in_progress':
        return '🔄';
      default:
        return '⏳';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Head>
        <title>Document Processing - Aria</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Document Processing</h1>
            <p className="text-gray-600 mt-2">
              Upload and analyze documents with advanced OCR and AI capabilities
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upload'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📤 Upload
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 History
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'results'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🧠 Results
              </button>
            </nav>
          </div>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* Configuration */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Processing Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OCR Engine
                    </label>
                    <select
                      value={ocrEngine}
                      onChange={(e) => setOcrEngine(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ensemble">Ensemble (Best Quality)</option>
                      <option value="tesseract">Tesseract</option>
                      <option value="easyocr">EasyOCR</option>
                      <option value="paddleocr">PaddleOCR</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="auto-process"
                      checked={autoProcess}
                      onChange={(e) => setAutoProcess(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="auto-process" className="text-sm font-medium text-gray-700">
                      Auto-process after upload
                    </label>
                  </div>
                </div>

                {autoProcess && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Analysis Types
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(analysisTypes).map(([type, enabled]) => (
                        <div key={type} className="flex items-center">
                          <input
                            type="checkbox"
                            id={type}
                            checked={enabled}
                            onChange={(e) =>
                              setAnalysisTypes(prev => ({ ...prev, [type]: e.target.checked }))
                            }
                            className="mr-2"
                          />
                          <label htmlFor={type} className="text-sm capitalize">
                            {type.replace('_', ' ')}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Area */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-gray-600 mb-4">
                    Drag & drop files here, or click to select files
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-blue-500 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-blue-600"
                  >
                    Select Files
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports PDF, images, Word documents, and text files (Max: 50MB)
                  </p>
                </div>
              </div>

              {/* File List */}
              {uploadFiles.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Files ({uploadFiles.length})</h3>
                    <button
                      onClick={() => uploadFiles.filter(f => f.status === 'pending').forEach(uploadFile)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                      disabled={!uploadFiles.some(f => f.status === 'pending')}
                    >
                      Upload All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {uploadFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">📄</span>
                          <div>
                            <p className="font-medium">{file.file.name}</p>
                            <p className="text-sm text-gray-500">
                              {(file.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            {file.status === 'uploading' || file.status === 'processing' ? (
                              <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${file.progress}%` }}
                                ></div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(file.status)}`}>
                            {file.status}
                          </span>
                          {file.status === 'pending' && (
                            <button
                              onClick={() => uploadFile(file)}
                              className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                            >
                              Upload
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Processing History</h2>
                <button
                  onClick={loadProcessingJobs}
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? '🔄' : '🔄'} Refresh
                </button>
              </div>
              
              {processingJobs.length > 0 ? (
                <div className="space-y-3">
                  {processingJobs.map((job) => (
                    <div
                      key={job.job_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => loadJobResults(job.job_id)}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{getStatusIcon(job.status)}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">Job #{job.job_id}</p>
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(job.status)}`}>
                              {job.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {job.processing_type} • {formatDate(job.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-gray-500">No processing jobs found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Upload a document to get started
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="bg-white rounded-lg shadow p-6">
              {selectedJob ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-4">
                      Job #{selectedJob.job_id} Results
                    </h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Status:</p>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedJob.status)}`}>
                          {selectedJob.status}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">Processing Type:</p>
                        <p className="text-gray-600">{selectedJob.processing_type}</p>
                      </div>
                      <div>
                        <p className="font-medium">Started:</p>
                        <p className="text-gray-600">{formatDate(selectedJob.created_at)}</p>
                      </div>
                      {selectedJob.completed_at && (
                        <div>
                          <p className="font-medium">Completed:</p>
                          <p className="text-gray-600">{formatDate(selectedJob.completed_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedJob.results && (
                    <div className="space-y-4">
                      {/* OCR Results */}
                      {selectedJob.results.text && (
                        <div>
                          <h3 className="font-semibold mb-2">Extracted Text</h3>
                          <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-sm">
                              {selectedJob.results.text}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* AI Analysis Results */}
                      {selectedJob.results.document_type && (
                        <div>
                          <h3 className="font-semibold mb-2">AI Analysis</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium">Document Type:</p>
                              <p className="text-sm text-gray-600">{selectedJob.results.document_type}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Confidence:</p>
                              <p className="text-sm text-gray-600">
                                {(selectedJob.results.confidence * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          
                          {selectedJob.results.summary && (
                            <div className="mt-4">
                              <p className="text-sm font-medium">Summary:</p>
                              <p className="text-sm text-gray-600 mt-1">{selectedJob.results.summary}</p>
                            </div>
                          )}

                          {selectedJob.results.entities && selectedJob.results.entities.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium">Entities:</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {selectedJob.results.entities.slice(0, 10).map((entity, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                  >
                                    {entity.value} ({entity.type})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedJob.error_message && (
                    <div className="bg-red-50 border border-red-200 rounded p-4">
                      <p className="text-red-800 text-sm">{selectedJob.error_message}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🧠</div>
                  <p className="text-gray-500">No results selected</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Select a job from the history to view results
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DocumentProcessing;