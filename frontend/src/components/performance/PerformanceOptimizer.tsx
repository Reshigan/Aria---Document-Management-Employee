import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Zap, 
  Database, 
  Clock, 
  TrendingUp,
  Activity,
  Gauge,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings,
  Trash2,
  Eye
} from 'lucide-react';

interface PerformanceMetrics {
  response_time: {
    avg: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requests_per_second: number;
    documents_processed: number;
  };
  cache_performance: {
    hit_rate: number;
    miss_rate: number;
    total_requests: number;
  };
  database_performance: {
    query_time_avg: number;
    slow_queries: number;
    connection_pool_usage: number;
  };
  system_resources: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
  };
}

interface CacheEntry {
  key: string;
  size: number;
  hits: number;
  last_accessed: string;
  ttl: number;
  type: string;
}

interface OptimizationRecommendation {
  id: string;
  type: 'cache' | 'database' | 'system' | 'api';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  action: string;
}

const PerformanceOptimizer: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMetrics();
    loadCacheEntries();
    loadRecommendations();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadMetrics();
        loadCacheEntries();
      }, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadMetrics = async () => {
    try {
      // Mock performance metrics
      const mockMetrics: PerformanceMetrics = {
        response_time: {
          avg: 245,
          p95: 580,
          p99: 1200
        },
        throughput: {
          requests_per_second: 125,
          documents_processed: 1850
        },
        cache_performance: {
          hit_rate: 87.5,
          miss_rate: 12.5,
          total_requests: 15420
        },
        database_performance: {
          query_time_avg: 45,
          slow_queries: 3,
          connection_pool_usage: 65
        },
        system_resources: {
          cpu_usage: 42,
          memory_usage: 68,
          disk_usage: 34
        }
      };
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const loadCacheEntries = async () => {
    try {
      // Mock cache entries
      const mockEntries: CacheEntry[] = [
        {
          key: 'user_sessions:*',
          size: 2048576, // 2MB
          hits: 15420,
          last_accessed: new Date(Date.now() - 300000).toISOString(),
          ttl: 3600,
          type: 'session'
        },
        {
          key: 'document_metadata:*',
          size: 5242880, // 5MB
          hits: 8750,
          last_accessed: new Date(Date.now() - 120000).toISOString(),
          ttl: 1800,
          type: 'metadata'
        },
        {
          key: 'search_results:*',
          size: 1048576, // 1MB
          hits: 3200,
          last_accessed: new Date(Date.now() - 600000).toISOString(),
          ttl: 900,
          type: 'search'
        },
        {
          key: 'api_responses:*',
          size: 3145728, // 3MB
          hits: 12500,
          last_accessed: new Date(Date.now() - 60000).toISOString(),
          ttl: 600,
          type: 'api'
        }
      ];
      setCacheEntries(mockEntries);
    } catch (error) {
      console.error('Failed to load cache entries:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      // Mock optimization recommendations
      const mockRecommendations: OptimizationRecommendation[] = [
        {
          id: '1',
          type: 'cache',
          severity: 'medium',
          title: 'Increase Cache TTL for Document Metadata',
          description: 'Document metadata cache entries are expiring too frequently, causing unnecessary database queries.',
          impact: 'Could improve response time by 15-20%',
          action: 'Increase TTL from 30 minutes to 2 hours for document metadata cache'
        },
        {
          id: '2',
          type: 'database',
          severity: 'high',
          title: 'Optimize Slow Query Performance',
          description: '3 slow queries detected with average execution time > 1 second.',
          impact: 'Reducing query time could improve overall system performance by 25%',
          action: 'Add database indexes for frequently queried columns'
        },
        {
          id: '3',
          type: 'system',
          severity: 'low',
          title: 'Memory Usage Optimization',
          description: 'Memory usage is at 68%, consider optimizing memory allocation.',
          impact: 'Better memory management could prevent future performance issues',
          action: 'Implement memory pooling for frequently allocated objects'
        }
      ];
      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const clearCache = async (cacheType?: string) => {
    setLoading(true);
    try {
      // Mock cache clearing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (cacheType) {
        setCacheEntries(prev => prev.filter(entry => entry.type !== cacheType));
      } else {
        setCacheEntries([]);
      }
      
      // Reload metrics after cache clear
      loadMetrics();
    } catch (error) {
      alert(`Failed to clear cache: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const optimizeDatabase = async () => {
    setLoading(true);
    try {
      // Mock database optimization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update metrics to show improvement
      setMetrics(prev => prev ? {
        ...prev,
        database_performance: {
          ...prev.database_performance,
          query_time_avg: Math.max(20, prev.database_performance.query_time_avg - 15),
          slow_queries: Math.max(0, prev.database_performance.slow_queries - 2)
        }
      } : null);
      
      // Remove database-related recommendations
      setRecommendations(prev => prev.filter(rec => rec.type !== 'database'));
    } catch (error) {
      alert(`Failed to optimize database: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return { status: 'good', color: 'text-green-500' };
    if (value <= thresholds.warning) return { status: 'warning', color: 'text-yellow-500' };
    return { status: 'critical', color: 'text-red-500' };
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };

    return (
      <Badge 
        variant="secondary"
        className={colors[severity as keyof typeof colors]}
      >
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Optimization</h1>
          <p className="text-muted-foreground">Monitor and optimize system performance</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setAutoRefresh(!autoRefresh)} 
            variant={autoRefresh ? "default" : "outline"} 
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button onClick={loadMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                  <p className={`text-2xl font-bold ${getPerformanceStatus(metrics.response_time.avg, { good: 200, warning: 500 }).color}`}>
                    {formatDuration(metrics.response_time.avg)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Requests/sec</p>
                  <p className="text-2xl font-bold text-blue-500">{metrics.throughput.requests_per_second}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cache Hit Rate</p>
                  <p className={`text-2xl font-bold ${getPerformanceStatus(100 - metrics.cache_performance.hit_rate, { good: 10, warning: 25 }).color}`}>
                    {metrics.cache_performance.hit_rate.toFixed(1)}%
                  </p>
                </div>
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CPU Usage</p>
                  <p className={`text-2xl font-bold ${getPerformanceStatus(metrics.system_resources.cpu_usage, { good: 50, warning: 80 }).color}`}>
                    {metrics.system_resources.cpu_usage}%
                  </p>
                </div>
                <Gauge className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cache">Cache Management</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Detailed Metrics */}
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Response Time Distribution</CardTitle>
                  <CardDescription>Response time percentiles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Average</span>
                      <span className="font-mono">{formatDuration(metrics.response_time.avg)}</span>
                    </div>
                    <Progress value={(metrics.response_time.avg / 1000) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>95th Percentile</span>
                      <span className="font-mono">{formatDuration(metrics.response_time.p95)}</span>
                    </div>
                    <Progress value={(metrics.response_time.p95 / 1000) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>99th Percentile</span>
                      <span className="font-mono">{formatDuration(metrics.response_time.p99)}</span>
                    </div>
                    <Progress value={(metrics.response_time.p99 / 1000) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Resources</CardTitle>
                  <CardDescription>Current resource utilization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>CPU Usage</span>
                      <span className="font-mono">{metrics.system_resources.cpu_usage}%</span>
                    </div>
                    <Progress value={metrics.system_resources.cpu_usage} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Memory Usage</span>
                      <span className="font-mono">{metrics.system_resources.memory_usage}%</span>
                    </div>
                    <Progress value={metrics.system_resources.memory_usage} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Disk Usage</span>
                      <span className="font-mono">{metrics.system_resources.disk_usage}%</span>
                    </div>
                    <Progress value={metrics.system_resources.disk_usage} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Database Performance</CardTitle>
                  <CardDescription>Database query metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Query Time</p>
                      <p className="text-2xl font-bold">{formatDuration(metrics.database_performance.query_time_avg)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Slow Queries</p>
                      <p className="text-2xl font-bold text-orange-500">{metrics.database_performance.slow_queries}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Connection Pool Usage</span>
                      <span className="font-mono">{metrics.database_performance.connection_pool_usage}%</span>
                    </div>
                    <Progress value={metrics.database_performance.connection_pool_usage} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Throughput Metrics</CardTitle>
                  <CardDescription>System throughput and processing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Requests/sec</p>
                      <p className="text-2xl font-bold text-blue-500">{metrics.throughput.requests_per_second}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Documents Processed</p>
                      <p className="text-2xl font-bold text-green-500">{metrics.throughput.documents_processed.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          {/* Cache Management */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Cache Management</h3>
              <p className="text-sm text-muted-foreground">Monitor and manage cache performance</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => clearCache()} variant="outline" disabled={loading}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Cache
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cache Entries</CardTitle>
              <CardDescription>Active cache entries and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cacheEntries.map((entry, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold">{entry.key}</h4>
                          <Badge variant="outline">{entry.type}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Size:</span> {formatBytes(entry.size)}
                          </div>
                          <div>
                            <span className="font-medium">Hits:</span> {entry.hits.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">TTL:</span> {entry.ttl}s
                          </div>
                          <div>
                            <span className="font-medium">Last Access:</span> {new Date(entry.last_accessed).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => clearCache(entry.type)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          {/* Database Optimization */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Database Optimization</h3>
              <p className="text-sm text-muted-foreground">Optimize database performance and queries</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={optimizeDatabase} disabled={loading}>
                <Settings className="h-4 w-4 mr-2" />
                {loading ? 'Optimizing...' : 'Optimize Database'}
              </Button>
            </div>
          </div>

          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Query Time</p>
                      <p className="text-2xl font-bold">{formatDuration(metrics.database_performance.query_time_avg)}</p>
                    </div>
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Slow Queries</p>
                      <p className="text-2xl font-bold text-orange-500">{metrics.database_performance.slow_queries}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pool Usage</p>
                      <p className="text-2xl font-bold">{metrics.database_performance.connection_pool_usage}%</p>
                    </div>
                    <Database className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {/* Optimization Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
              <CardDescription>
                AI-powered suggestions to improve system performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No optimization recommendations at this time</p>
                    <p className="text-sm text-muted-foreground">Your system is performing well!</p>
                  </div>
                ) : (
                  recommendations.map((rec) => (
                    <Card key={rec.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold">{rec.title}</h4>
                            {getSeverityBadge(rec.severity)}
                            <Badge variant="outline">{rec.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="font-medium text-green-600">Impact:</span> {rec.impact}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium text-blue-600">Action:</span> {rec.action}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm">
                            Apply Fix
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceOptimizer;