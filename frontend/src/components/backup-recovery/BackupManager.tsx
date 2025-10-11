import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { 
  Database, 
  HardDrive, 
  Settings, 
  Globe, 
  Play, 
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Activity,
  Eye,
  RefreshCw
} from 'lucide-react';

interface BackupJob {
  id: number;
  job_name: string;
  job_type: 'full' | 'incremental' | 'differential';
  backup_scope: 'database' | 'files' | 'system' | 'all';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  current_operation?: string;
  total_size: number;
  compressed_size: number;
  compression_ratio: number;
  backup_duration: number;
  file_count: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface BackupStatistics {
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  running_backups: number;
  success_rate: number;
  total_storage_used: number;
  total_storage_formatted: string;
  avg_compression_ratio: number;
  recent_backups: Array<{
    id: number;
    name: string;
    status: string;
    created_at: string;
    size: string;
  }>;
}

const BackupManager: React.FC = () => {
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
  const [statistics, setStatistics] = useState<BackupStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Form state for creating backup jobs
  const [newBackup, setNewBackup] = useState({
    job_name: '',
    job_type: 'full' as const,
    backup_scope: 'all' as const,
    compression_enabled: true,
    encryption_enabled: true,
    retention_days: 30,
    max_backups: 10
  });

  useEffect(() => {
    loadBackupJobs();
    loadStatistics();
    
    // Set up auto-refresh for running jobs
    const interval = setInterval(() => {
      loadBackupJobs();
      loadStatistics();
    }, 5000);
    
    setRefreshInterval(interval);
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  const loadBackupJobs = async () => {
    try {
      // Mock data for demonstration
      const mockJobs: BackupJob[] = [
        {
          id: 1,
          job_name: 'Daily Database Backup',
          job_type: 'full',
          backup_scope: 'database',
          status: 'completed',
          progress_percentage: 100,
          total_size: 1024 * 1024 * 500, // 500MB
          compressed_size: 1024 * 1024 * 150, // 150MB
          compression_ratio: 0.7,
          backup_duration: 45.5,
          file_count: 1,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          completed_at: new Date(Date.now() - 86400000 + 45500).toISOString()
        },
        {
          id: 2,
          job_name: 'Weekly Full System Backup',
          job_type: 'full',
          backup_scope: 'all',
          status: 'running',
          progress_percentage: 65.3,
          current_operation: 'Backing up files',
          total_size: 1024 * 1024 * 1024 * 2, // 2GB
          compressed_size: 1024 * 1024 * 800, // 800MB
          compression_ratio: 0.6,
          backup_duration: 0,
          file_count: 15420,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          started_at: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      setBackupJobs(mockJobs);
    } catch (error) {
      console.error('Failed to load backup jobs:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      // Mock statistics
      const mockStats: BackupStatistics = {
        total_backups: 25,
        successful_backups: 23,
        failed_backups: 1,
        running_backups: 1,
        success_rate: 92.0,
        total_storage_used: 1024 * 1024 * 1024 * 5.2, // 5.2GB
        total_storage_formatted: '5.2 GB',
        avg_compression_ratio: 0.65,
        recent_backups: [
          {
            id: 1,
            name: 'Daily Database Backup',
            status: 'completed',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            size: '150 MB'
          },
          {
            id: 2,
            name: 'Weekly Full System Backup',
            status: 'running',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            size: '800 MB'
          }
        ]
      };
      setStatistics(mockStats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const createBackupJob = async () => {
    setLoading(true);
    try {
      // Mock creation - in real app would call API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newJob: BackupJob = {
        id: Date.now(),
        job_name: newBackup.job_name,
        job_type: newBackup.job_type,
        backup_scope: newBackup.backup_scope,
        status: 'pending',
        progress_percentage: 0,
        total_size: 0,
        compressed_size: 0,
        compression_ratio: 0,
        backup_duration: 0,
        file_count: 0,
        created_at: new Date().toISOString()
      };
      
      setBackupJobs(prev => [newJob, ...prev]);
      setShowCreateDialog(false);
      setNewBackup({
        job_name: '',
        job_type: 'full',
        backup_scope: 'all',
        compression_enabled: true,
        encryption_enabled: true,
        retention_days: 30,
        max_backups: 10
      });
    } catch (error) {
      alert(`Failed to create backup job: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const startBackupJob = async (jobId: number) => {
    try {
      setBackupJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'running' as const, progress_percentage: 0, current_operation: 'Initializing backup...' }
          : job
      ));
    } catch (error) {
      alert(`Failed to start backup: ${error}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'outline',
      cancelled: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'files':
        return <HardDrive className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      case 'all':
        return <Globe className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Backup & Recovery</h1>
          <p className="text-muted-foreground">Manage system backups and data recovery</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadBackupJobs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Create Backup
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Backup</DialogTitle>
                <DialogDescription>
                  Configure a new backup job for your system data
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="job_name">Backup Name</Label>
                  <Input
                    id="job_name"
                    value={newBackup.job_name}
                    onChange={(e) => setNewBackup({ ...newBackup, job_name: e.target.value })}
                    placeholder="Enter backup name"
                  />
                </div>
                <div>
                  <Label htmlFor="job_type">Backup Type</Label>
                  <Select
                    value={newBackup.job_type}
                    onValueChange={(value: 'full' | 'incremental' | 'differential') =>
                      setNewBackup({ ...newBackup, job_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Backup</SelectItem>
                      <SelectItem value="incremental">Incremental</SelectItem>
                      <SelectItem value="differential">Differential</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="backup_scope">Backup Scope</Label>
                  <Select
                    value={newBackup.backup_scope}
                    onValueChange={(value: 'database' | 'files' | 'system' | 'all') =>
                      setNewBackup({ ...newBackup, backup_scope: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Complete System</SelectItem>
                      <SelectItem value="database">Database Only</SelectItem>
                      <SelectItem value="files">Files Only</SelectItem>
                      <SelectItem value="system">System Config</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="compression"
                    checked={newBackup.compression_enabled}
                    onCheckedChange={(checked) =>
                      setNewBackup({ ...newBackup, compression_enabled: checked })
                    }
                  />
                  <Label htmlFor="compression">Enable Compression</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="encryption"
                    checked={newBackup.encryption_enabled}
                    onCheckedChange={(checked) =>
                      setNewBackup({ ...newBackup, encryption_enabled: checked })
                    }
                  />
                  <Label htmlFor="encryption">Enable Encryption</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="retention_days">Retention (days)</Label>
                    <Input
                      id="retention_days"
                      type="number"
                      value={newBackup.retention_days}
                      onChange={(e) =>
                        setNewBackup({ ...newBackup, retention_days: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_backups">Max Backups</Label>
                    <Input
                      id="max_backups"
                      type="number"
                      value={newBackup.max_backups}
                      onChange={(e) =>
                        setNewBackup({ ...newBackup, max_backups: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <Button onClick={createBackupJob} disabled={loading} className="w-full">
                  {loading ? 'Creating...' : 'Create Backup Job'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Backups</p>
                  <p className="text-2xl font-bold">{statistics.total_backups}</p>
                </div>
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{statistics.success_rate.toFixed(1)}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                  <p className="text-2xl font-bold">{statistics.total_storage_formatted}</p>
                </div>
                <HardDrive className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Running Jobs</p>
                  <p className="text-2xl font-bold">{statistics.running_backups}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">Backup Jobs</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          {/* Backup Jobs List */}
          <Card>
            <CardHeader>
              <CardTitle>Backup Jobs</CardTitle>
              <CardDescription>
                Manage and monitor your backup jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backupJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No backup jobs found</p>
                    <p className="text-sm text-muted-foreground">Create your first backup job to get started</p>
                  </div>
                ) : (
                  backupJobs.map((job) => (
                    <Card key={job.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getScopeIcon(job.backup_scope)}
                            <div>
                              <h3 className="font-semibold">{job.job_name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {job.job_type} • {job.backup_scope}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(job.status)}
                              {getStatusBadge(job.status)}
                            </div>
                            {job.status === 'running' && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {job.current_operation}
                              </p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            {job.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => startBackupJob(job.id)}
                                variant="outline"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Backup Job Details</DialogTitle>
                                  <DialogDescription>
                                    Detailed information about {job.job_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Job Name</Label>
                                      <p className="text-sm">{job.job_name}</p>
                                    </div>
                                    <div>
                                      <Label>Status</Label>
                                      <div className="flex items-center space-x-2 mt-1">
                                        {getStatusIcon(job.status)}
                                        {getStatusBadge(job.status)}
                                      </div>
                                    </div>
                                    <div>
                                      <Label>Type</Label>
                                      <p className="text-sm">{job.job_type}</p>
                                    </div>
                                    <div>
                                      <Label>Scope</Label>
                                      <p className="text-sm">{job.backup_scope}</p>
                                    </div>
                                    <div>
                                      <Label>File Count</Label>
                                      <p className="text-sm">{job.file_count.toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <Label>Duration</Label>
                                      <p className="text-sm">
                                        {job.backup_duration > 0 ? formatDuration(job.backup_duration) : 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Original Size</Label>
                                      <p className="text-sm">{formatBytes(job.total_size)}</p>
                                    </div>
                                    <div>
                                      <Label>Compressed Size</Label>
                                      <p className="text-sm">{formatBytes(job.compressed_size)}</p>
                                    </div>
                                  </div>
                                  {job.status === 'running' && (
                                    <div>
                                      <Label>Progress</Label>
                                      <div className="mt-2">
                                        <Progress value={job.progress_percentage} className="w-full" />
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {job.progress_percentage.toFixed(1)}% - {job.current_operation}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                  {job.error_message && (
                                    <Alert>
                                      <AlertTriangle className="h-4 w-4" />
                                      <AlertDescription>{job.error_message}</AlertDescription>
                                    </Alert>
                                  )}
                                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                    <div>
                                      <Label>Created</Label>
                                      <p>{new Date(job.created_at).toLocaleString()}</p>
                                    </div>
                                    {job.completed_at && (
                                      <div>
                                        <Label>Completed</Label>
                                        <p>{new Date(job.completed_at).toLocaleString()}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </div>
                      {job.status === 'running' && (
                        <div className="mt-4">
                          <Progress value={job.progress_percentage} className="w-full" />
                          <p className="text-sm text-muted-foreground mt-1">
                            {job.progress_percentage.toFixed(1)}% complete
                          </p>
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Backup Activity</CardTitle>
              <CardDescription>
                Latest backup operations and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statistics?.recent_backups && statistics.recent_backups.length > 0 ? (
                <div className="space-y-3">
                  {statistics.recent_backups.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(backup.status)}
                        <div>
                          <p className="font-medium">{backup.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(backup.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(backup.status)}
                        <p className="text-sm text-muted-foreground mt-1">{backup.size}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent backup activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BackupManager;