import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ModernLayout from '../components/layout/ModernLayout';
import AnalyticsDashboard from '../components/dashboard/AnalyticsDashboard';

export default function EnterpriseDashboard() {
  const [activeTab, setActiveTab] = useState('executive');
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [realTimeData, setRealTimeData] = useState({});
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token) {
      router.push('/');
      return;
    }
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchDashboardData(activeTab);
    // Set up real-time updates
    const interval = setInterval(() => {
      fetchRealTimeData();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchDashboardData = async (dashboardType) => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`/api/proxy/enterprise-analytics/${dashboardType}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(prev => ({
          ...prev,
          [dashboardType]: data
        }));
      } else {
        setError(`Failed to load ${dashboardType} dashboard`);
      }
    } catch (err) {
      setError(`Error loading ${dashboardType} dashboard`);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTimeData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/enterprise-analytics/realtime', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRealTimeData(data);
      }
    } catch (err) {
      console.error('Real-time data fetch failed:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(activeTab);
    fetchRealTimeData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const tabs = [
    { id: 'executive', name: 'Executive Overview', icon: '👔', description: 'High-level KPIs and insights' },
    { id: 'operational', name: 'Operations', icon: '⚙️', description: 'Day-to-day operational metrics' },
    { id: 'financial', name: 'Financial', icon: '💰', description: 'Cost analysis and ROI metrics' },
    { id: 'compliance', name: 'Compliance', icon: '🛡️', description: 'Regulatory and audit metrics' },
    { id: 'predictive', name: 'Predictive', icon: '🔮', description: 'AI-powered forecasting' }
  ];

  const renderExecutiveDashboard = () => {
    const data = dashboardData['executive'];
    if (!data) return <div className="text-center py-8 text-gray-400">No data available</div>;

    return (
      <div className="space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="vx-card vx-glass-yellow p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="text-3xl font-bold vx-text-gradient mb-2">
                {data.kpis?.total_documents?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-gray-300 mb-1">Total Documents</div>
              <div className="text-xs text-green-400 flex items-center">
                <span className="mr-1">↗</span>
                +{data.kpis?.period_growth || 0}% this period
              </div>
            </div>
          </div>

          <div className="vx-card vx-glass p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {data.kpis?.processing_success_rate || 0}%
              </div>
              <div className="text-sm text-gray-300 mb-1">Success Rate</div>
              <div className="text-xs text-blue-400">
                {data.kpis?.total_processing_jobs || 0} total jobs
              </div>
            </div>
          </div>

          <div className="vx-card vx-glass p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400/20 to-transparent rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {data.compliance?.compliance_score || 0}%
              </div>
              <div className="text-sm text-gray-300 mb-1">Compliance Score</div>
              <div className="text-xs text-green-400">
                {data.compliance?.compliance_level || 'Unknown'}
              </div>
            </div>
          </div>

          <div className="vx-card vx-glass p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/20 to-transparent rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                ${data.trends?.cost_trends?.total_estimated_cost || 0}
              </div>
              <div className="text-sm text-gray-300 mb-1">Monthly Cost</div>
              <div className="text-xs text-purple-400">
                Estimated operational cost
              </div>
            </div>
          </div>
        </div>

        {/* Risk Indicators */}
        <div className="vx-card vx-glass p-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <span className="mr-3">🚨</span>
            Risk Assessment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.risk_indicators && Object.entries(data.risk_indicators).map(([key, risk]) => {
              if (typeof risk === 'object' && risk.level) {
                const getRiskColor = (level) => {
                  switch (level) {
                    case 'high': return 'text-red-400 bg-red-400/10 border-red-400/30';
                    case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
                    case 'low': return 'text-green-400 bg-green-400/10 border-green-400/30';
                    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
                  }
                };

                return (
                  <div key={key} className={`p-4 rounded-lg border ${getRiskColor(risk.level)}`}>
                    <div className="font-medium capitalize mb-2">
                      {key.replace(/_/g, ' ').replace(' risk', '')}
                    </div>
                    <div className="text-2xl font-bold mb-1">{risk.value}%</div>
                    <div className="text-sm opacity-75 capitalize">{risk.level} risk</div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>

        {/* Executive Insights */}
        <div className="vx-card vx-glass p-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <span className="mr-3">💡</span>
            Executive Insights
          </h3>
          <div className="space-y-4">
            {data.insights?.map((insight, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 bg-white/5 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  insight.priority === 'high' ? 'bg-red-400' :
                  insight.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                }`}></div>
                <div className="flex-1">
                  <div className="font-medium text-white mb-1">{insight.title}</div>
                  <div className="text-sm text-gray-300 mb-2">{insight.description}</div>
                  <div className="text-xs text-blue-400">{insight.recommendation}</div>
                </div>
              </div>
            )) || <div className="text-gray-400 text-center py-4">No insights available</div>}
          </div>
        </div>
      </div>
    );
  };

  const renderOperationalDashboard = () => {
    const data = dashboardData['operational'];
    if (!data) return <div className="text-center py-8 text-gray-400">No data available</div>;

    return (
      <div className="space-y-8">
        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="vx-card vx-glass p-6">
            <div className="text-2xl font-bold text-green-400 mb-2">
              {data.performance_metrics?.throughput || 0}
            </div>
            <div className="text-sm text-gray-300">Documents/Hour</div>
            <div className="text-xs text-green-400 mt-1">Throughput</div>
          </div>

          <div className="vx-card vx-glass p-6">
            <div className="text-2xl font-bold text-blue-400 mb-2">
              {data.performance_metrics?.latency || 0}s
            </div>
            <div className="text-sm text-gray-300">Average Latency</div>
            <div className="text-xs text-blue-400 mt-1">Processing Time</div>
          </div>

          <div className="vx-card vx-glass p-6">
            <div className="text-2xl font-bold text-purple-400 mb-2">
              {data.performance_metrics?.availability || 0}%
            </div>
            <div className="text-sm text-gray-300">System Availability</div>
            <div className="text-xs text-purple-400 mt-1">Uptime</div>
          </div>
        </div>

        {/* Resource Utilization */}
        <div className="vx-card vx-glass p-8">
          <h3 className="text-xl font-bold text-white mb-6">Resource Utilization</h3>
          <div className="space-y-6">
            {data.resource_utilization && Object.entries(data.resource_utilization).map(([resource, usage]) => (
              <div key={resource} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300 capitalize">{resource.replace('_', ' ')}</span>
                  <span className="text-white">{usage}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      usage > 80 ? 'bg-red-400' : usage > 60 ? 'bg-yellow-400' : 'bg-green-400'
                    }`}
                    style={{ width: `${usage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Processing Queue */}
        <div className="vx-card vx-glass p-8">
          <h3 className="text-xl font-bold text-white mb-6">Processing Queue Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-3xl font-bold text-yellow-400 mb-2">
                {data.queue_analysis?.queue_length || 0}
              </div>
              <div className="text-sm text-gray-300">Items in Queue</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {data.queue_analysis?.avg_wait_time || 0}s
              </div>
              <div className="text-sm text-gray-300">Average Wait Time</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFinancialDashboard = () => {
    const data = dashboardData['financial'];
    if (!data) return <div className="text-center py-8 text-gray-400">No data available</div>;

    return (
      <div className="space-y-8">
        {/* Cost Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="vx-card vx-glass p-6">
            <h4 className="text-lg font-medium text-white mb-4">Storage Costs</h4>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              ${data.storage_costs?.monthly || 0}
            </div>
            <div className="text-sm text-gray-300">Monthly Storage</div>
            <div className="text-xs text-blue-400 mt-1">
              ${data.storage_costs?.per_document || 0} per document
            </div>
          </div>

          <div className="vx-card vx-glass p-6">
            <h4 className="text-lg font-medium text-white mb-4">Processing Costs</h4>
            <div className="text-3xl font-bold text-green-400 mb-2">
              ${data.processing_costs?.total || 0}
            </div>
            <div className="text-sm text-gray-300">Total Processing</div>
            <div className="text-xs text-green-400 mt-1">
              ${data.processing_costs?.per_job || 0} per job
            </div>
          </div>
        </div>

        {/* ROI Analysis */}
        <div className="vx-card vx-glass p-8">
          <h3 className="text-xl font-bold text-white mb-6">ROI Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-2">
                {data.roi_analysis?.roi_percentage || 0}%
              </div>
              <div className="text-sm text-gray-300">Return on Investment</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400 mb-2">
                ${data.efficiency_savings?.total_savings || 0}
              </div>
              <div className="text-sm text-gray-300">Efficiency Savings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-2">
                {data.roi_analysis?.payback_months || 0} mo
              </div>
              <div className="text-sm text-gray-300">Payback Period</div>
            </div>
          </div>
        </div>

        {/* Budget Forecast */}
        <div className="vx-card vx-glass p-8">
          <h3 className="text-xl font-bold text-white mb-6">Budget Forecast</h3>
          <div className="space-y-4">
            {data.budget_forecast?.quarterly_forecast?.map((quarter, index) => (
              <div key={index} className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                <div>
                  <div className="font-medium text-white">{quarter.period}</div>
                  <div className="text-sm text-gray-400">{quarter.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-yellow-400">${quarter.estimated_cost}</div>
                  <div className="text-xs text-gray-400">{quarter.confidence}% confidence</div>
                </div>
              </div>
            )) || <div className="text-gray-400 text-center py-4">No forecast data available</div>}
          </div>
        </div>
      </div>
    );
  };

  const renderComplianceDashboard = () => {
    const data = dashboardData['compliance'];
    if (!data) return <div className="text-center py-8 text-gray-400">No data available</div>;

    return (
      <div className="space-y-8">
        {/* Compliance Score */}
        <div className="vx-card vx-glass-yellow p-8 text-center">
          <div className="text-6xl font-bold vx-text-gradient mb-4">
            {data.compliance_score || 0}%
          </div>
          <div className="text-xl text-white mb-2">Overall Compliance Score</div>
          <div className="text-sm text-gray-300">
            Based on regulatory requirements and internal policies
          </div>
        </div>

        {/* Compliance Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.retention_compliance && (
            <div className="vx-card vx-glass p-6">
              <h4 className="text-lg font-medium text-white mb-4">Data Retention</h4>
              <div className="text-3xl font-bold text-green-400 mb-2">
                {data.retention_compliance.compliance_rate || 0}%
              </div>
              <div className="text-sm text-gray-300">Compliant Documents</div>
            </div>
          )}

          {data.access_compliance && (
            <div className="vx-card vx-glass p-6">
              <h4 className="text-lg font-medium text-white mb-4">Access Control</h4>
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {data.access_compliance.compliance_rate || 0}%
              </div>
              <div className="text-sm text-gray-300">Proper Access Controls</div>
            </div>
          )}

          {data.privacy_compliance && (
            <div className="vx-card vx-glass p-6">
              <h4 className="text-lg font-medium text-white mb-4">Data Privacy</h4>
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {data.privacy_compliance.compliance_rate || 0}%
              </div>
              <div className="text-sm text-gray-300">Privacy Compliant</div>
            </div>
          )}
        </div>

        {/* Violations */}
        <div className="vx-card vx-glass p-8">
          <h3 className="text-xl font-bold text-white mb-6">Compliance Violations</h3>
          <div className="space-y-4">
            {data.violations?.map((violation, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 bg-red-400/10 border border-red-400/30 rounded-lg">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="font-medium text-white mb-1">{violation.type}</div>
                  <div className="text-sm text-gray-300 mb-2">{violation.description}</div>
                  <div className="text-xs text-red-400">Severity: {violation.severity}</div>
                </div>
                <div className="text-xs text-gray-400">{violation.date}</div>
              </div>
            )) || <div className="text-green-400 text-center py-4">No violations detected</div>}
          </div>
        </div>
      </div>
    );
  };

  const renderPredictiveDashboard = () => {
    const data = dashboardData['predictive'];
    if (!data) return <div className="text-center py-8 text-gray-400">No data available</div>;

    return (
      <div className="space-y-8">
        {/* Forecasts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="vx-card vx-glass p-6">
            <h4 className="text-lg font-medium text-white mb-4">Volume Forecast</h4>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {data.volume_forecast?.next_month_prediction || 0}
            </div>
            <div className="text-sm text-gray-300">Documents Next Month</div>
            <div className="text-xs text-blue-400 mt-1">
              {data.volume_forecast?.confidence || 0}% confidence
            </div>
          </div>

          <div className="vx-card vx-glass p-6">
            <h4 className="text-lg font-medium text-white mb-4">Resource Demand</h4>
            <div className="text-3xl font-bold text-green-400 mb-2">
              {data.resource_forecast?.peak_demand_prediction || 0}%
            </div>
            <div className="text-sm text-gray-300">Peak Resource Usage</div>
            <div className="text-xs text-green-400 mt-1">
              Expected next week
            </div>
          </div>
        </div>

        {/* Anomaly Detection */}
        <div className="vx-card vx-glass p-8">
          <h3 className="text-xl font-bold text-white mb-6">Anomaly Detection</h3>
          <div className="space-y-4">
            {data.anomaly_detection?.detected_anomalies?.map((anomaly, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="font-medium text-white mb-1">{anomaly.type}</div>
                  <div className="text-sm text-gray-300 mb-2">{anomaly.description}</div>
                  <div className="text-xs text-yellow-400">Confidence: {anomaly.confidence}%</div>
                </div>
                <div className="text-xs text-gray-400">{anomaly.detected_at}</div>
              </div>
            )) || <div className="text-green-400 text-center py-4">No anomalies detected</div>}
          </div>
        </div>

        {/* Model Accuracy */}
        <div className="vx-card vx-glass p-8">
          <h3 className="text-xl font-bold text-white mb-6">Model Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.model_accuracy && Object.entries(data.model_accuracy).map(([model, accuracy]) => (
              <div key={model} className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-2">{accuracy}%</div>
                <div className="text-sm text-gray-300 capitalize">{model.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Prepare dashboard data for the modern component
  const modernDashboardData = {
    total_documents: dashboardData[activeTab]?.kpis?.total_documents || 1247,
    processed_today: dashboardData[activeTab]?.kpis?.processed_today || 89,
    storage_used: dashboardData[activeTab]?.kpis?.storage_used || '2.4 GB',
    active_users: dashboardData[activeTab]?.kpis?.active_users || 23,
    chart_data: dashboardData[activeTab]?.chart_data,
    category_data: dashboardData[activeTab]?.category_data
  };

  const modernRealTimeData = {
    recent_activities: realTimeData?.recent_activities || [
      {
        icon: '📄',
        message: 'New document processed: Invoice_2024_001.pdf',
        timestamp: '2 minutes ago',
        status: 'success'
      },
      {
        icon: '📧',
        message: 'Email attachment detected from Office365',
        timestamp: '5 minutes ago',
        status: 'processing'
      },
      {
        icon: '🔍',
        message: 'Document classification completed',
        timestamp: '8 minutes ago',
        status: 'success'
      }
    ]
  };

  return (
    <ModernLayout user={user} onLogout={handleLogout}>
      <AnalyticsDashboard
        data={modernDashboardData}
        realTimeData={modernRealTimeData}
        onRefresh={handleRefresh}
        loading={loading}
      />
    </ModernLayout>
  );
}