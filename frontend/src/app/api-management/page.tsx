'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Key, 
  Activity, 
  Settings, 
  BarChart3, 
  Shield, 
  AlertTriangle,
  TrendingUp,
  Users,
  Clock,
  Zap,
  Database,
  Globe
} from 'lucide-react';
import { apiManagementService, APIHealthStatus, APIUsageAnalytics } from '@/services/apiManagementService';

export default function APIManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [healthStatus, setHealthStatus] = useState<APIHealthStatus | null>(null);
  const [analytics, setAnalytics] = useState<APIUsageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [healthData, summaryData] = await Promise.all([
        apiManagementService.getAPIHealth(),
        apiManagementService.getStatisticsSummary()
      ]);

      setHealthStatus(healthData);
      setAnalytics(summaryData.recent_analytics);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Key className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total API Keys</p>
              <p className="text-2xl font-bold">{healthStatus?.total_api_keys || 0}</p>
              <p className="text-xs text-green-600">
                {healthStatus?.active_api_keys || 0} active
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold">{analytics?.total_requests?.toLocaleString() || 0}</p>
              <p className="text-xs text-green-600">
                {analytics?.successful_requests || 0} successful
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold">
                {analytics ? apiManagementService.formatDuration(analytics.avg_response_time) : '0ms'}
              </p>
              <p className="text-xs text-gray-600">
                P95: {analytics ? apiManagementService.formatDuration(analytics.p95_response_time) : '0ms'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold">
                {analytics ? `${(analytics.error_rate * 100).toFixed(1)}%` : '0%'}
              </p>
              <p className="text-xs text-red-600">
                {healthStatus?.endpoints_with_errors || 0} endpoints affected
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderHealthStatus = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-500" />
            <span>API Health Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Endpoints</span>
            <Badge variant="outline">{healthStatus?.total_endpoints || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Active Endpoints</span>
            <Badge variant="secondary">{healthStatus?.active_endpoints || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Monitored Endpoints</span>
            <Badge variant="outline">{healthStatus?.monitored_endpoints || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Rate Limited Keys</span>
            <Badge variant={healthStatus?.rate_limited_keys ? "destructive" : "secondary"}>
              {healthStatus?.rate_limited_keys || 0}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <span>Performance Metrics</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Data Transfer</span>
            <span className="font-medium">
              {analytics ? apiManagementService.formatDataSize(analytics.total_data_transfer) : '0 B'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Unique API Keys</span>
            <span className="font-medium">{analytics?.unique_api_keys || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Failed Requests</span>
            <span className="font-medium text-red-600">{analytics?.failed_requests || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Success Rate</span>
            <span className="font-medium text-green-600">
              {analytics ? `${((analytics.successful_requests / analytics.total_requests) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTopEndpoints = () => (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <Globe className="h-5 w-5 text-purple-500" />
          <span>Top Endpoints</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {analytics?.top_endpoints?.slice(0, 5).map((endpoint, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium">{endpoint.endpoint}</p>
                  <p className="text-sm text-gray-600">
                    {endpoint.request_count.toLocaleString()} requests
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {apiManagementService.formatDuration(endpoint.avg_response_time)}
                </p>
                <p className="text-xs text-gray-600">avg response</p>
              </div>
            </div>
          )) || (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No endpoint data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderQuickActions = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <span>Quick Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          className="w-full justify-start" 
          variant="outline"
          onClick={() => setActiveTab('api-keys')}
        >
          <Key className="h-4 w-4 mr-2" />
          Create New API Key
        </Button>
        <Button 
          className="w-full justify-start" 
          variant="outline"
          onClick={() => setActiveTab('endpoints')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage Endpoints
        </Button>
        <Button 
          className="w-full justify-start" 
          variant="outline"
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          View Analytics
        </Button>
        <Button 
          className="w-full justify-start" 
          variant="outline"
          onClick={() => setActiveTab('rate-limits')}
        >
          <Shield className="h-4 w-4 mr-2" />
          Monitor Rate Limits
        </Button>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API management dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">API Management</h1>
          <p className="text-gray-600 mt-2">
            Manage API keys, monitor usage, and configure endpoints
          </p>
        </div>
        <Button onClick={loadDashboardData} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8">
          {renderOverviewStats()}
          {renderHealthStatus()}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {renderTopEndpoints()}
            </div>
            <div>
              {renderQuickActions()}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="api-keys" className="mt-8">
          <div className="text-center py-12">
            <Key className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">API Key Management</h3>
            <p className="text-gray-600">Component will be implemented next</p>
          </div>
        </TabsContent>

        <TabsContent value="endpoints" className="mt-8">
          <div className="text-center py-12">
            <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Endpoint Management</h3>
            <p className="text-gray-600">Component will be implemented next</p>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-8">
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Usage Analytics</h3>
            <p className="text-gray-600">Component will be implemented next</p>
          </div>
        </TabsContent>

        <TabsContent value="rate-limits" className="mt-8">
          <div className="text-center py-12">
            <Shield className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Rate Limit Monitor</h3>
            <p className="text-gray-600">Component will be implemented next</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}