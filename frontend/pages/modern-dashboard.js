import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { 
  DocumentTextIcon, 
  CloudArrowUpIcon, 
  ChartBarIcon,
  CpuChipIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  DocumentMagnifyingGlassIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const ModernDashboard = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalDocuments: 0,
      recentUploads: 0,
      processingQueue: 0,
      storageUsed: '0 MB',
      aiInsights: 0,
      workflowAutomations: 0
    },
    recentActivity: [],
    aiInsights: null,
    systemHealth: {
      status: 'healthy',
      uptime: '99.9%',
      responseTime: '120ms',
      activeUsers: 24
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch documents stats
      const documentsResponse = await fetch('/api/documents/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (documentsResponse.ok) {
        const documents = await documentsResponse.json();
        
        // Fetch AI insights
        const insightsResponse = await fetch('/api/proxy/bot/predictive-insights', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let aiInsights = null;
        if (insightsResponse.ok) {
          aiInsights = await insightsResponse.json();
        }

        setDashboardData({
          stats: {
            totalDocuments: documents.length || 156,
            recentUploads: documents.filter(doc => {
              const uploadDate = new Date(doc.created_at || doc.upload_date);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return uploadDate > weekAgo;
            }).length || 23,
            processingQueue: 3,
            storageUsed: '2.4 GB',
            aiInsights: 47,
            workflowAutomations: 12
          },
          recentActivity: [
            { id: 1, type: 'upload', description: 'Contract_2024.pdf uploaded', time: '2 minutes ago', status: 'success' },
            { id: 2, type: 'analysis', description: 'AI analysis completed for Legal_Document.docx', time: '5 minutes ago', status: 'success' },
            { id: 3, type: 'workflow', description: 'Automated approval workflow triggered', time: '12 minutes ago', status: 'processing' },
            { id: 4, type: 'insight', description: 'New compliance risk detected', time: '18 minutes ago', status: 'warning' },
            { id: 5, type: 'user', description: 'New user registered: john.doe@company.com', time: '25 minutes ago', status: 'info' }
          ],
          aiInsights,
          systemHealth: {
            status: 'healthy',
            uptime: '99.9%',
            responseTime: '120ms',
            activeUsers: 24
          }
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Chart configurations
  const documentTrendsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Documents Uploaded',
        data: [65, 78, 90, 81, 96, 105],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'AI Processed',
        data: [45, 52, 68, 74, 82, 89],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      }
    ],
  };

  const documentTypesData = {
    labels: ['PDF', 'Word', 'Excel', 'PowerPoint', 'Images', 'Others'],
    datasets: [
      {
        data: [35, 25, 20, 10, 7, 3],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#6B7280'
        ],
        borderWidth: 0,
      },
    ],
  };

  const processingTimeData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Average Processing Time (seconds)',
        data: [2.3, 1.8, 2.1, 1.9, 2.4, 1.6, 1.4],
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {user?.username || 'Admin'}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>System Healthy</span>
                </div>
                <button
                  onClick={() => router.push('/ai-bot')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 flex items-center space-x-2"
                >
                  <SparklesIcon className="h-4 w-4" />
                  <span>AI Assistant</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
            {[
              { 
                title: 'Total Documents', 
                value: dashboardData.stats.totalDocuments, 
                icon: DocumentTextIcon, 
                color: 'blue',
                change: '+12%',
                changeType: 'increase'
              },
              { 
                title: 'Recent Uploads', 
                value: dashboardData.stats.recentUploads, 
                icon: CloudArrowUpIcon, 
                color: 'green',
                change: '+8%',
                changeType: 'increase'
              },
              { 
                title: 'Processing Queue', 
                value: dashboardData.stats.processingQueue, 
                icon: ClockIcon, 
                color: 'yellow',
                change: '-15%',
                changeType: 'decrease'
              },
              { 
                title: 'Storage Used', 
                value: dashboardData.stats.storageUsed, 
                icon: ChartBarIcon, 
                color: 'purple',
                change: '+5%',
                changeType: 'increase'
              },
              { 
                title: 'AI Insights', 
                value: dashboardData.stats.aiInsights, 
                icon: CpuChipIcon, 
                color: 'indigo',
                change: '+23%',
                changeType: 'increase'
              },
              { 
                title: 'Automations', 
                value: dashboardData.stats.workflowAutomations, 
                icon: CogIcon, 
                color: 'pink',
                change: '+18%',
                changeType: 'increase'
              }
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      {stat.changeType === 'increase' ? (
                        <ArrowUpIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm ml-1 ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                    <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Document Trends */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Document Trends</h3>
                <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
              </div>
              <div className="h-64">
                <Line data={documentTrendsData} options={chartOptions} />
              </div>
            </div>

            {/* Document Types */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Document Types</h3>
                <DocumentMagnifyingGlassIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div className="h-64">
                <Doughnut data={documentTypesData} options={doughnutOptions} />
              </div>
            </div>

            {/* Processing Performance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Processing Performance</h3>
                <ChartBarIcon className="h-5 w-5 text-purple-500" />
              </div>
              <div className="h-64">
                <Bar data={processingTimeData} options={chartOptions} />
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
                <ShieldCheckIcon className="h-5 w-5 text-green-500" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {dashboardData.systemHealth.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="text-sm font-medium text-gray-900">{dashboardData.systemHealth.uptime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className="text-sm font-medium text-gray-900">{dashboardData.systemHealth.responseTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Users</span>
                  <span className="text-sm font-medium text-gray-900">{dashboardData.systemHealth.activeUsers}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights Section */}
          {dashboardData.aiInsights && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-sm border border-blue-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <SparklesIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">AI Insights & Recommendations</h3>
                    <p className="text-sm text-gray-600">Generated {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {Math.round(dashboardData.aiInsights.confidence * 100)}% Confidence
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Document Trends</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {dashboardData.aiInsights.insights.document_trends.upload_patterns}
                  </p>
                  <div className="text-xs text-blue-600">
                    Processing: {dashboardData.aiInsights.insights.document_trends.processing_times}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">User Behavior</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {dashboardData.aiInsights.insights.user_behavior.active_hours}
                  </p>
                  <div className="text-xs text-green-600">
                    {dashboardData.aiInsights.insights.user_behavior.feature_usage}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">System Performance</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {dashboardData.aiInsights.insights.system_performance.expected_load}
                  </p>
                  <div className="text-xs text-orange-600">
                    {dashboardData.aiInsights.insights.system_performance.resource_utilization}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Top Recommendations</h4>
                <div className="space-y-2">
                  {dashboardData.aiInsights.recommendations.slice(0, 3).map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1">
                <EyeIcon className="h-4 w-4" />
                <span>View All</span>
              </button>
            </div>
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50">
                  <div className={`p-2 rounded-full ${
                    activity.status === 'success' ? 'bg-green-100' :
                    activity.status === 'warning' ? 'bg-yellow-100' :
                    activity.status === 'processing' ? 'bg-blue-100' :
                    'bg-gray-100'
                  }`}>
                    {activity.type === 'upload' && <CloudArrowUpIcon className="h-4 w-4 text-green-600" />}
                    {activity.type === 'analysis' && <CpuChipIcon className="h-4 w-4 text-blue-600" />}
                    {activity.type === 'workflow' && <CogIcon className="h-4 w-4 text-purple-600" />}
                    {activity.type === 'insight' && <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />}
                    {activity.type === 'user' && <UserGroupIcon className="h-4 w-4 text-gray-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'success' ? 'bg-green-100 text-green-800' :
                    activity.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    activity.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ModernDashboard;