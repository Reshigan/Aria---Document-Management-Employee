import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DocumentClassification() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [classificationResult, setClassificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchDocuments();
  }, [filter, sortBy]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const params = new URLSearchParams({
        filter,
        sort_by: sortBy,
        search: searchTerm
      });

      const response = await fetch(`/api/proxy/documents?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        setError('Failed to load documents');
      }
    } catch (err) {
      setError('Error loading documents');
    } finally {
      setLoading(false);
    }
  };

  const classifyDocument = async (documentId) => {
    setClassifying(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/proxy/documents/${documentId}/classify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setClassificationResult(result);
        
        // Update the document in the list
        setDocuments(prev => prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, classification_result: result }
            : doc
        ));
      } else {
        setError('Failed to classify document');
      }
    } catch (err) {
      setError('Error classifying document');
    } finally {
      setClassifying(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-400 bg-green-400/10 border-green-400/30';
    if (confidence >= 0.6) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    return 'text-red-400 bg-red-400/10 border-red-400/30';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'high': return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getDocumentTypeIcon = (docType) => {
    const icons = {
      'invoice': '🧾',
      'contract': '📋',
      'receipt': '🧾',
      'purchase_order': '📦',
      'bank_statement': '🏦',
      'expense_report': '💰',
      'legal_notice': '⚖️',
      'compliance_document': '🛡️',
      'employee_record': '👤',
      'payroll': '💵',
      'performance_review': '📊',
      'specification': '📐',
      'manual': '📖',
      'report': '📄',
      'email': '📧',
      'memo': '📝',
      'letter': '✉️',
      'unknown': '❓'
    };
    return icons[docType] || icons['unknown'];
  };

  const renderClassificationDetails = (result) => {
    if (!result) return null;

    return (
      <div className="space-y-6">
        {/* Final Classification */}
        <div className="vx-card vx-glass-yellow p-6">
          <h4 className="text-lg font-bold text-white mb-4">🎯 Final Classification</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-300 mb-1">Document Type</div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getDocumentTypeIcon(result.final_classification?.document_type)}</span>
                <span className="text-lg font-medium text-white capitalize">
                  {result.final_classification?.document_type?.replace('_', ' ') || 'Unknown'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-1">Category</div>
              <div className="text-lg font-medium text-white capitalize">
                {result.final_classification?.category || 'Unknown'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-1">Confidence</div>
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${
                getConfidenceColor(result.final_classification?.confidence || 0)
              }`}>
                {((result.final_classification?.confidence || 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-1">Priority</div>
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border capitalize ${
                getPriorityColor(result.final_classification?.priority)
              }`}>
                {result.final_classification?.priority || 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        {/* Classification Methods */}
        <div className="vx-card vx-glass p-6">
          <h4 className="text-lg font-bold text-white mb-4">🔍 Classification Methods</h4>
          <div className="space-y-4">
            {result.classifications && Object.entries(result.classifications).map(([method, data]) => (
              <div key={method} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white capitalize">{method.replace('_', ' ')}</span>
                  {data.confidence && (
                    <span className={`px-2 py-1 rounded text-xs ${
                      getConfidenceColor(data.confidence)
                    }`}>
                      {(data.confidence * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                {data.document_type && (
                  <div className="text-sm text-gray-300">
                    Type: <span className="text-white capitalize">{data.document_type.replace('_', ' ')}</span>
                  </div>
                )}
                {data.category && (
                  <div className="text-sm text-gray-300">
                    Category: <span className="text-white capitalize">{data.category}</span>
                  </div>
                )}
                {data.matched_keywords && data.matched_keywords.length > 0 && (
                  <div className="text-sm text-gray-300 mt-2">
                    Keywords: {data.matched_keywords.slice(0, 5).map((keyword, idx) => (
                      <span key={idx} className="inline-block bg-blue-400/20 text-blue-300 px-2 py-1 rounded text-xs mr-1 mb-1">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Extracted Metadata */}
        {result.extracted_metadata && (
          <div className="vx-card vx-glass p-6">
            <h4 className="text-lg font-bold text-white mb-4">📊 Extracted Metadata</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.extracted_metadata.extracted_dates && result.extracted_metadata.extracted_dates.length > 0 && (
                <div>
                  <div className="text-sm text-gray-300 mb-2">📅 Dates</div>
                  <div className="space-y-1">
                    {result.extracted_metadata.extracted_dates.slice(0, 3).map((date, idx) => (
                      <div key={idx} className="text-sm text-white bg-white/5 px-2 py-1 rounded">
                        {date}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.extracted_metadata.extracted_amounts && result.extracted_metadata.extracted_amounts.length > 0 && (
                <div>
                  <div className="text-sm text-gray-300 mb-2">💰 Amounts</div>
                  <div className="space-y-1">
                    {result.extracted_metadata.extracted_amounts.slice(0, 3).map((amount, idx) => (
                      <div key={idx} className="text-sm text-white bg-white/5 px-2 py-1 rounded">
                        {amount}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.extracted_metadata.extracted_emails && result.extracted_metadata.extracted_emails.length > 0 && (
                <div>
                  <div className="text-sm text-gray-300 mb-2">📧 Emails</div>
                  <div className="space-y-1">
                    {result.extracted_metadata.extracted_emails.slice(0, 3).map((email, idx) => (
                      <div key={idx} className="text-sm text-white bg-white/5 px-2 py-1 rounded">
                        {email}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.extracted_metadata.entities && (
                <div>
                  <div className="text-sm text-gray-300 mb-2">🏷️ Entities</div>
                  <div className="space-y-2">
                    {Object.entries(result.extracted_metadata.entities).map(([entityType, entities]) => (
                      entities.length > 0 && (
                        <div key={entityType}>
                          <div className="text-xs text-gray-400 capitalize">{entityType}:</div>
                          <div className="flex flex-wrap gap-1">
                            {entities.slice(0, 3).map((entity, idx) => (
                              <span key={idx} className="text-xs bg-purple-400/20 text-purple-300 px-2 py-1 rounded">
                                {entity}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Processing Stats */}
        <div className="vx-card vx-glass p-6">
          <h4 className="text-lg font-bold text-white mb-4">⚡ Processing Statistics</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-300 mb-1">Processing Time</div>
              <div className="text-lg font-medium text-white">
                {result.processing_time?.toFixed(2) || 0}s
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-1">Content Length</div>
              <div className="text-lg font-medium text-white">
                {result.content_length?.toLocaleString() || 0} chars
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-1">Sources Used</div>
              <div className="text-lg font-medium text-white">
                {result.final_classification?.sources?.length || 0} methods
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{
      background: "linear-gradient(135deg, #000000 0%, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%, #000000 100%)",
      backgroundSize: "400% 400%",
      animation: "gradientShift 15s ease infinite"
    }}>
      {/* Header */}
      <div className="vx-glass border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="vx-logo">
                  <span className="text-black font-black text-xl">VX</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold vx-text-gradient">🤖 Smart Document Classification</h1>
                  <p className="text-sm vx-text-muted">AI-powered document identification and analysis</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/enterprise-dashboard')}
                className="vx-btn vx-btn-secondary"
              >
                <span>📊</span>
                <span>Analytics</span>
              </button>
              <button
                onClick={() => router.push('/test')}
                className="vx-btn vx-btn-secondary"
              >
                <span>←</span>
                <span>Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="mb-8 vx-glass rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="vx-input"
              >
                <option value="all">All Documents</option>
                <option value="classified">Classified</option>
                <option value="unclassified">Unclassified</option>
                <option value="high_confidence">High Confidence</option>
                <option value="low_confidence">Low Confidence</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="vx-input"
              >
                <option value="created_at">Date Created</option>
                <option value="filename">Filename</option>
                <option value="confidence">Confidence</option>
                <option value="document_type">Document Type</option>
              </select>
            </div>

            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="vx-input"
              />
              <button
                onClick={fetchDocuments}
                className="vx-btn vx-btn-primary"
              >
                🔍 Search
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Documents List */}
          <div className="vx-glass rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">📄 Documents</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                <p className="text-gray-300">Loading documents...</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedDocument?.id === doc.id
                        ? 'border-yellow-400/50 bg-yellow-400/10'
                        : 'border-gray-700/50 bg-white/5 hover:bg-white/10'
                    }`}
                    onClick={() => setSelectedDocument(doc)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">
                            {getDocumentTypeIcon(doc.classification_result?.final_classification?.document_type)}
                          </span>
                          <span className="font-medium text-white truncate">
                            {doc.filename}
                          </span>
                        </div>
                        
                        {doc.classification_result ? (
                          <div className="space-y-1">
                            <div className="text-sm text-gray-300">
                              Type: <span className="text-white capitalize">
                                {doc.classification_result.final_classification?.document_type?.replace('_', ' ') || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                getConfidenceColor(doc.classification_result.final_classification?.confidence || 0)
                              }`}>
                                {((doc.classification_result.final_classification?.confidence || 0) * 100).toFixed(1)}%
                              </span>
                              <span className={`px-2 py-1 rounded text-xs capitalize ${
                                getPriorityColor(doc.classification_result.final_classification?.priority)
                              }`}>
                                {doc.classification_result.final_classification?.priority}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">Not classified</div>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          classifyDocument(doc.id);
                        }}
                        disabled={classifying}
                        className="vx-btn vx-btn-primary text-xs px-3 py-1"
                      >
                        {classifying ? '🔄' : '🤖'} Classify
                      </button>
                    </div>
                  </div>
                ))}
                
                {documents.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No documents found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Classification Results */}
          <div className="vx-glass rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">🎯 Classification Results</h3>
            
            {classifying ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                <p className="text-gray-300">Analyzing document...</p>
                <p className="text-sm text-gray-400 mt-2">Using multiple AI models for classification</p>
              </div>
            ) : selectedDocument ? (
              <div className="space-y-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="font-medium text-white mb-2">Selected Document</div>
                  <div className="text-sm text-gray-300">{selectedDocument.filename}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Created: {new Date(selectedDocument.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                {selectedDocument.classification_result ? (
                  renderClassificationDetails(selectedDocument.classification_result)
                ) : classificationResult ? (
                  renderClassificationDetails(classificationResult)
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    Click "Classify" to analyze this document
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Select a document to view classification results
              </div>
            )}
          </div>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="mt-6 vx-glass border border-red-400/30 text-red-100 px-6 py-4 rounded-xl">
            <div className="flex items-center space-x-2">
              <span className="text-red-400">❌</span>
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}