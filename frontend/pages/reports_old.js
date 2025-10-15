import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('document-status');
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab]);

  const fetchReport = async (reportType) => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`/api/reports/${reportType}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReports(prev => ({
          ...prev,
          [reportType]: data.report
        }));
      } else {
        setError(`Failed to load ${reportType} report`);
      }
    } catch (err) {
      setError(`Error loading ${reportType} report`);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'document-status', name: 'Document Status', icon: '📊' },
    { id: 'sap-posting', name: 'SAP Posting', icon: '🔄' },
    { id: 'processing-stats', name: 'Processing Stats', icon: '📈' }
  ];

  const renderDocumentStatusReport = () => {
    const report = reports['document-status'];
    if (!report) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{report.summary.total_documents}</div>
            <div className="text-sm text-blue-800">Total Documents</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{report.summary.processed}</div>
            <div className="text-sm text-green-800">Processed</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{report.summary.pending}</div>
            <div className="text-sm text-yellow-800">Pending</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{report.summary.errors}</div>
            <div className="text-sm text-red-800">Errors</div>
          </div>
        </div>

        {/* Confidence Threshold Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Confidence Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-lg font-semibold text-gray-700">{report.summary.confidence_threshold}%</div>
              <div className="text-sm text-gray-600">Confidence Threshold</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">{report.summary.low_confidence_count}</div>
              <div className="text-sm text-gray-600">Below Threshold</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">{report.summary.high_confidence_count}</div>
              <div className="text-sm text-gray-600">Above Threshold</div>
            </div>
          </div>
        </div>

        {/* Low Confidence Documents */}
        {report.low_confidence_documents.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Documents Requiring Review</h3>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {report.low_confidence_documents.map((doc) => (
                  <li key={doc.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-medium">!</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{doc.filename}</div>
                          <div className="text-sm text-gray-500">
                            {doc.classification} • {doc.confidence.toFixed(1)}% confidence
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(doc.upload_date).toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSapPostingReport = () => {
    const report = reports['sap-posting'];
    if (!report) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{report.summary.total_sap_attempts}</div>
            <div className="text-sm text-blue-800">Total Attempts</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{report.summary.successful_postings}</div>
            <div className="text-sm text-green-800">Successful</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{report.summary.failed_postings}</div>
            <div className="text-sm text-red-800">Failed</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{report.summary.success_rate.toFixed(1)}%</div>
            <div className="text-sm text-purple-800">Success Rate</div>
          </div>
        </div>

        {/* Successful Postings */}
        {report.successful_postings.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Successful SAP Postings</h3>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {report.successful_postings.map((doc) => (
                  <li key={doc.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-medium">✓</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{doc.filename}</div>
                          <div className="text-sm text-gray-500">
                            {doc.document_type} • {doc.transaction} • Doc: {doc.sap_document_number}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(doc.posting_date).toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Failed Postings */}
        {report.failed_postings.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Failed SAP Postings</h3>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {report.failed_postings.map((doc) => (
                  <li key={doc.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-medium">✗</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{doc.filename}</div>
                          <div className="text-sm text-gray-500">
                            {doc.document_type} • {doc.transaction}
                          </div>
                          {doc.error_message && (
                            <div className="text-sm text-red-600 mt-1">{doc.error_message}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProcessingStatsReport = () => {
    const report = reports['processing-stats'];
    if (!report) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{report.summary.total_documents}</div>
            <div className="text-sm text-blue-800">Total Documents</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{report.summary.avg_processing_time}s</div>
            <div className="text-sm text-green-800">Avg Processing Time</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{report.summary.recent_activity_count}</div>
            <div className="text-sm text-purple-800">Recent Activity (7 days)</div>
          </div>
        </div>

        {/* Document Type Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Document Type Distribution</h3>
          <div className="space-y-3">
            {Object.entries(report.document_type_distribution).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{type}</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(count / report.summary.total_documents) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Confidence Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(report.confidence_distribution).map(([range, count]) => (
              <div key={range} className="text-center">
                <div className="text-2xl font-bold text-gray-700">{count}</div>
                <div className="text-sm text-gray-500">{range}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        {report.recent_activity.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {report.recent_activity.map((doc) => (
                  <li key={doc.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">📄</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{doc.filename}</div>
                          <div className="text-sm text-gray-500">
                            {doc.type} • {doc.confidence.toFixed(1)}% confidence
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(doc.upload_date).toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <button
                onClick={() => router.push('/')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading report...</p>
              </div>
            ) : (
              <div>
                {activeTab === 'document-status' && renderDocumentStatusReport()}
                {activeTab === 'sap-posting' && renderSapPostingReport()}
                {activeTab === 'processing-stats' && renderProcessingStatsReport()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
