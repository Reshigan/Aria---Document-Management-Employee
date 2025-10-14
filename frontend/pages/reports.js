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
    { id: 'sap-posting', name: 'SAP Posting', icon: '💼' },
    { id: 'processing-stats', name: 'Processing Stats', icon: '⚡' }
  ];

  const renderDocumentStatusReport = () => {
    const report = reports['document-status'];
    if (!report) return null;

    return (
      <div className="vx-flex vx-flex-col vx-gap-lg">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="vx-card vx-glass-yellow vx-p-md">
            <div className="text-2xl font-bold vx-text-gradient">{report.summary.total_documents}</div>
            <div className="text-sm text-gray-300">Total Documents</div>
          </div>
          <div className="vx-card vx-glass vx-p-md">
            <div className="text-2xl font-bold text-green-400">{report.summary.processed}</div>
            <div className="text-sm text-gray-300">Processed</div>
          </div>
          <div className="vx-card vx-glass vx-p-md">
            <div className="text-2xl font-bold text-yellow-400">{report.summary.pending}</div>
            <div className="text-sm text-gray-300">Pending</div>
          </div>
          <div className="vx-card vx-glass vx-p-md">
            <div className="text-2xl font-bold text-red-400">{report.summary.errors}</div>
            <div className="text-sm text-gray-300">Errors</div>
          </div>
        </div>

        {/* Confidence Threshold Info */}
        <div className="vx-card vx-glass vx-p-lg">
          <h3 className="vx-font-medium text-white vx-m-md">Confidence Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="vx-p-md">
              <div className="text-lg font-bold text-green-400">{report.confidence_analysis.high_confidence}</div>
              <div className="text-sm text-gray-300">High Confidence (≥80%)</div>
            </div>
            <div className="vx-p-md">
              <div className="text-lg font-bold text-yellow-400">{report.confidence_analysis.medium_confidence}</div>
              <div className="text-sm text-gray-300">Medium Confidence (50-79%)</div>
            </div>
            <div className="vx-p-md">
              <div className="text-lg font-bold text-red-400">{report.confidence_analysis.low_confidence}</div>
              <div className="text-sm text-gray-300">Low Confidence (<50%)</div>
            </div>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="vx-card vx-glass vx-p-lg">
          <h3 className="vx-font-medium text-white vx-m-md">Recent Documents</h3>
          <div className="space-y-3">
            {report.recent_documents.map((doc, index) => (
              <div key={index} className="vx-flex vx-items-center vx-justify-between vx-p-sm border-b border-gray-700">
                <div className="vx-flex vx-items-center vx-gap-md">
                  <span className="text-2xl">📄</span>
                  <div>
                    <div className="text-white font-medium">{doc.filename}</div>
                    <div className="text-sm text-gray-400">{doc.document_type}</div>
                  </div>
                </div>
                <div className="vx-text-right">
                  <div className={`vx-status ${doc.status === 'processed' ? 'vx-status-processed' : 'vx-status-online'}`}>
                    {doc.status}
                  </div>
                  <div className="text-sm text-gray-400">{doc.confidence}% confidence</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSapPostingReport = () => {
    const report = reports['sap-posting'];
    if (!report) return null;

    return (
      <div className="vx-flex vx-flex-col vx-gap-lg">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="vx-card vx-glass-yellow vx-p-md">
            <div className="text-2xl font-bold vx-text-gradient">{report.summary.total_sap_attempts}</div>
            <div className="text-sm text-gray-300">Total Attempts</div>
          </div>
          <div className="vx-card vx-glass vx-p-md">
            <div className="text-2xl font-bold text-green-400">{report.summary.successful_postings}</div>
            <div className="text-sm text-gray-300">Successful</div>
          </div>
          <div className="vx-card vx-glass vx-p-md">
            <div className="text-2xl font-bold text-red-400">{report.summary.failed_postings}</div>
            <div className="text-sm text-gray-300">Failed</div>
          </div>
          <div className="vx-card vx-glass vx-p-md">
            <div className="text-2xl font-bold text-purple-400">{report.summary.success_rate.toFixed(1)}%</div>
            <div className="text-sm text-gray-300">Success Rate</div>
          </div>
        </div>

        {/* Recent SAP Postings */}
        <div className="vx-card vx-glass vx-p-lg">
          <h3 className="vx-font-medium text-white vx-m-md">Recent SAP Postings</h3>
          <div className="space-y-3">
            {report.recent_postings.map((posting, index) => (
              <div key={index} className="vx-flex vx-items-center vx-justify-between vx-p-sm border-b border-gray-700">
                <div className="vx-flex vx-items-center vx-gap-md">
                  <span className="text-2xl">💼</span>
                  <div>
                    <div className="text-white font-medium">{posting.document_filename}</div>
                    <div className="text-sm text-gray-400">SAP Doc: {posting.sap_document_number}</div>
                  </div>
                </div>
                <div className="vx-text-right">
                  <div className={`vx-status ${posting.status === 'success' ? 'vx-status-processed' : 'text-red-400'}`}>
                    {posting.status}
                  </div>
                  <div className="text-sm text-gray-400">{posting.posting_date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderProcessingStatsReport = () => {
    const report = reports['processing-stats'];
    if (!report) return null;

    return (
      <div className="vx-flex vx-flex-col vx-gap-lg">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="vx-card vx-glass-yellow vx-p-md">
            <div className="text-2xl font-bold vx-text-gradient">{report.summary.total_documents}</div>
            <div className="text-sm text-gray-300">Total Documents</div>
          </div>
          <div className="vx-card vx-glass vx-p-md">
            <div className="text-2xl font-bold text-green-400">{report.summary.avg_processing_time}s</div>
            <div className="text-sm text-gray-300">Avg Processing Time</div>
          </div>
          <div className="vx-card vx-glass vx-p-md">
            <div className="text-2xl font-bold text-purple-400">{report.summary.recent_activity_count}</div>
            <div className="text-sm text-gray-300">Recent Activity (7 days)</div>
          </div>
        </div>

        {/* Document Type Distribution */}
        <div className="vx-card vx-glass vx-p-lg">
          <h3 className="vx-font-medium text-white vx-m-md">Document Type Distribution</h3>
          <div className="space-y-3">
            {report.document_type_distribution.map((type, index) => (
              <div key={index} className="vx-flex vx-items-center vx-justify-between vx-p-sm">
                <div className="text-white">{type.document_type}</div>
                <div className="vx-flex vx-items-center vx-gap-md">
                  <div className="text-gray-300">{type.count} docs</div>
                  <div className="w-20 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full"
                      style={{ width: `${type.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-400 w-12">{type.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Processing Time Trends */}
        <div className="vx-card vx-glass vx-p-lg">
          <h3 className="vx-font-medium text-white vx-m-md">Processing Time Trends (Last 7 Days)</h3>
          <div className="space-y-3">
            {report.processing_time_trends.map((trend, index) => (
              <div key={index} className="vx-flex vx-items-center vx-justify-between vx-p-sm">
                <div className="text-white">{trend.date}</div>
                <div className="vx-flex vx-items-center vx-gap-md">
                  <div className="text-gray-300">{trend.avg_time}s avg</div>
                  <div className="text-sm text-gray-400">{trend.document_count} docs</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating Orbs */}
      <div className="vx-floating-orb" style={{ top: '10%', left: '5%', animationDelay: '0s' }}></div>
      <div className="vx-floating-orb" style={{ top: '70%', right: '10%', animationDelay: '3s' }}></div>
      <div className="vx-floating-orb" style={{ bottom: '15%', left: '15%', animationDelay: '6s' }}></div>

      <div className="min-h-screen vx-p-lg">
        <div className="max-w-6xl mx-auto">
          <div className="vx-card vx-glass vx-animate-fade-in">
            <div className="vx-card-header vx-flex vx-items-center vx-justify-between">
              <div>
                <h1 className="vx-card-title vx-text-gradient">📊 Reports & Analytics</h1>
                <p className="vx-card-description">Comprehensive insights and data analysis</p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="vx-btn vx-btn-ghost"
              >
                ← Back to Dashboard
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-700 vx-p-md">
              <nav className="vx-flex vx-gap-lg">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`vx-p-md vx-font-medium text-sm border-b-2 transition-all ${
                      activeTab === tab.id
                        ? 'border-yellow-400 vx-text-gradient'
                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="vx-p-lg">
              {error && (
                <div className="vx-card vx-glass border border-red-500 text-red-300 vx-p-md vx-m-md">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="vx-text-center vx-p-xl">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400 mx-auto"></div>
                  <p className="vx-m-md text-gray-300">Loading report...</p>
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
    </>
  );
}
