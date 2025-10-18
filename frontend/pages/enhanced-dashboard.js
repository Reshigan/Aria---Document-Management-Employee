import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  BoltIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  DocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import ModernCard, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/ModernCard';
import ModernButton from '../components/ui/ModernButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ToastProvider, useToast } from '../components/ui/ModernToast';

const DashboardContent = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    aiAnalyses: 0,
    workflowsSuggested: 0,
    complianceChecks: 0
  });
  const [loading, setLoading] = useState(true);
  const [botCapabilities, setBotCapabilities] = useState([]);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      router.push('/modern-login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchDashboardData(token);
  }, [router]);

  const fetchDashboardData = async (token) => {
    try {
      // Fetch bot capabilities
      const capabilitiesResponse = await fetch('/api/bot/capabilities', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (capabilitiesResponse.ok) {
        const capabilities = await capabilitiesResponse.json();
        setBotCapabilities(capabilities.capabilities || []);
      }

      // Simulate stats (in real app, fetch from API)
      setStats({
        totalDocuments: 1247,
        aiAnalyses: 89,
        workflowsSuggested: 34,
        complianceChecks: 156
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    router.push('/modern-login');
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading your intelligent workspace..." />;
  }

  const quickActions = [
    {
      title: 'AI Chat Assistant',
      description: 'Get intelligent help with document management',
      icon: ChatBubbleLeftRightIcon,
      color: 'from-blue-500 to-cyan-500',
      action: () => router.push('/ai-bot')
    },
    {
      title: 'Document Analysis',
      description: 'Analyze documents with AI insights',
      icon: DocumentCheckIcon,
      color: 'from-green-500 to-emerald-500',
      action: () => router.push('/ai-bot?tab=analysis')
    },
    {
      title: 'Workflow Automation',
      description: 'Get intelligent workflow suggestions',
      icon: BoltIcon,
      color: 'from-purple-500 to-pink-500',
      action: () => router.push('/ai-bot?tab=workflows')
    },
    {
      title: 'Predictive Insights',
      description: 'View AI-powered predictions and trends',
      icon: LightBulbIcon,
      color: 'from-yellow-500 to-orange-500',
      action: () => router.push('/ai-bot?tab=insights')
    }
  ];

  const statCards = [
    {
      title: 'Total Documents',
      value: stats.totalDocuments.toLocaleString(),
      icon: DocumentTextIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'AI Analyses',
      value: stats.aiAnalyses.toLocaleString(),
      icon: CpuChipIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: '+23%',
      changeType: 'positive'
    },
    {
      title: 'Workflows Suggested',
      value: stats.workflowsSuggested.toLocaleString(),
      icon: BoltIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Compliance Checks',
      value: stats.complianceChecks.toLocaleString(),
      icon: ShieldCheckIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      change: '+15%',
      changeType: 'positive'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-3">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Aria Dashboard</h1>
                <p className="text-sm text-gray-600">Intelligent Document Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  Welcome, {user?.username || 'User'}
                </p>
                <p className="text-xs text-gray-600">Administrator</p>
              </div>
              <ModernButton
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </ModernButton>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to your AI-Powered Workspace
          </h2>
          <p className="text-lg text-gray-600">
            Manage documents intelligently with world-class AI capabilities
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ModernCard hover className="h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <div className="flex items-center mt-2">
                      <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600 font-medium">
                        {stat.change}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </ModernCard>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <ModernCard
                key={index}
                hover
                className="cursor-pointer group"
                onClick={action.action}
              >
                <div className="text-center">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${action.color} mb-4 group-hover:scale-110 transition-transform duration-200`}>
                    <action.icon className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{action.title}</h4>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </ModernCard>
            ))}
          </div>
        </motion.div>

        {/* AI Capabilities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <ModernCard>
            <CardHeader>
              <CardTitle>AI Bot Capabilities</CardTitle>
              <CardDescription>
                Explore the intelligent features available in your workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {botCapabilities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {botCapabilities.map((capability, index) => (
                    <div
                      key={index}
                      className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="p-2 bg-blue-100 rounded-lg mr-3 flex-shrink-0">
                        <SparklesIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">
                          {capability.name}
                        </h5>
                        <p className="text-sm text-gray-600">
                          {capability.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CpuChipIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Loading AI capabilities...</p>
                </div>
              )}
            </CardContent>
          </ModernCard>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <ModernCard>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest actions and AI insights in your workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    action: 'Document analyzed',
                    description: 'AI analysis completed for "Q4 Financial Report.pdf"',
                    time: '2 minutes ago',
                    icon: DocumentCheckIcon,
                    color: 'text-green-600'
                  },
                  {
                    action: 'Workflow suggested',
                    description: 'Automated approval workflow recommended for HR documents',
                    time: '15 minutes ago',
                    icon: BoltIcon,
                    color: 'text-purple-600'
                  },
                  {
                    action: 'Compliance check',
                    description: 'GDPR compliance verified for customer data files',
                    time: '1 hour ago',
                    icon: ShieldCheckIcon,
                    color: 'text-blue-600'
                  },
                  {
                    action: 'AI chat session',
                    description: 'Helped with document categorization queries',
                    time: '2 hours ago',
                    icon: ChatBubbleLeftRightIcon,
                    color: 'text-cyan-600'
                  }
                ].map((activity, index) => (
                  <div key={index} className="flex items-start">
                    <div className={`p-2 rounded-lg bg-gray-100 mr-4 flex-shrink-0`}>
                      <activity.icon className={`h-5 w-5 ${activity.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600 mb-1">{activity.description}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {activity.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </ModernCard>
        </motion.div>
      </div>
    </div>
  );
};

const EnhancedDashboard = () => {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
};

export default EnhancedDashboard;