import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  FileText, 
  Brain, 
  History, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2
} from 'lucide-react';
import DocumentUpload from '@/components/DocumentProcessing/DocumentUpload';
import DocumentAnalysisResults from '@/components/DocumentProcessing/DocumentAnalysisResults';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNotifications } from '@/components/NotificationSystem';

interface ProcessingJob {
  job_id: number;
  document_id: number;
  processing_type: string;
  status: string;
  progress: number;
  created_at: string;
  completed_at?: string;
  processing_time?: number;
  results?: any;
  error_message?: string;
}

const DocumentProcessing: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ProcessingJob | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { addNotification } = useNotifications();
  const wsUrl = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  const { isConnected } = useWebSocket(`${wsUrl}${window.location.host}/ws`, {
    onMessage: (data) => {
      // Handle WebSocket messages for real-time updates
      if (data.type === 'processing_update') {
        setProcessingJobs(prev => 
          prev.map(job => 
            job.job_id === data.job_id 
              ? { ...job, status: data.status, progress: data.progress }
              : job
          )
        );
      }
    }
  });

  // Load processing jobs on component mount
  useEffect(() => {
    loadProcessingJobs();
  }, []);

  // Listen for WebSocket notifications
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'document_processing') {
          // Update job status
          setProcessingJobs(prev => 
            prev.map(job => 
              job.job_id === data.job_id 
                ? { ...job, status: data.status, results: data.results }
                : job
            )
          );

          // Show notification
          if (data.status === 'completed') {
            addNotification({
              type: 'success',
              title: 'Processing Complete',
              message: data.message || 'Document processing completed successfully'
            });
          } else if (data.status === 'failed') {
            addNotification({
              type: 'error',
              title: 'Processing Failed',
              message: data.message || 'Document processing failed'
            });
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    if (isConnected) {
      // Add event listener for WebSocket messages
      // This would be handled by the WebSocket hook in a real implementation
    }

    return () => {
      // Cleanup
    };
  }, [isConnected, addNotification]);

  const loadProcessingJobs = async () => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/documents/processing/jobs`, {
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
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load processing jobs'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadJobResults = async (jobId: number) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/documents/processing/job/${jobId}/status`, {
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
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load job results'
      });
    }
  };

  const deleteJob = async (jobId: number) => {
    try {
      // This would be a DELETE endpoint in a real implementation
      setProcessingJobs(prev => prev.filter(job => job.job_id !== jobId));
      
      addNotification({
        type: 'success',
        title: 'Job Deleted',
        message: 'Processing job deleted successfully'
      });
    } catch (error) {
      console.error('Failed to delete job:', error);
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete processing job'
      });
    }
  };

  const handleUploadComplete = (result: any) => {
    addNotification({
      type: 'success',
      title: 'Upload Complete',
      message: 'Document uploaded and processing started'
    });
    
    // Refresh jobs list
    loadProcessingJobs();
  };

  const handleUploadError = (error: string) => {
    addNotification({
      type: 'error',
      title: 'Upload Failed',
      message: error
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
      case 'in_progress':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatProcessingTime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${Number(seconds ?? 0).toFixed(1)}s`;
    return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 container mx-auto p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Processing</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Upload and analyze documents with advanced OCR and AI capabilities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button onClick={loadProcessingJobs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="w-4 h-4" />
            <span>History</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center space-x-2">
            <Brain className="w-4 h-4" />
            <span>Results</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-3">
          <DocumentUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Processing History</span>
                <Badge variant="outline">
                  {processingJobs.length} jobs
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {processingJobs.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {processingJobs.map((job) => (
                      <div
                        key={job.job_id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 cursor-pointer"
                        onClick={() => loadJobResults(job.job_id)}
                      >
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(job.status)}
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium">Job #{job.job_id}</p>
                              <Badge className={getStatusColor(job.status)}>
                                {job.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {job.processing_type} • {formatDate(job.created_at)}
                            </p>
                            {job.processing_time && (
                              <p className="text-xs text-gray-400">
                                Processing time: {formatProcessingTime(job.processing_time)}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {job.progress !== undefined && job.status === 'processing' && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {Number(job.progress ?? 0).toFixed(0)}%
                            </div>
                          )}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteJob(job.job_id);
                            }}
                            size="sm"
                            variant="ghost"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No processing jobs found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Upload a document to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-3">
          {selectedJob ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Job #{selectedJob.job_id} Results</span>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(selectedJob.status)}>
                        {selectedJob.status}
                      </Badge>
                      {selectedJob.processing_time && (
                        <Badge variant="outline">
                          {formatProcessingTime(selectedJob.processing_time)}
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-medium">Processing Type:</p>
                      <p className="text-gray-600 dark:text-gray-400">{selectedJob.processing_type}</p>
                    </div>
                    <div>
                      <p className="font-medium">Document ID:</p>
                      <p className="text-gray-600 dark:text-gray-400">{selectedJob.document_id}</p>
                    </div>
                    <div>
                      <p className="font-medium">Started:</p>
                      <p className="text-gray-600 dark:text-gray-400">{formatDate(selectedJob.created_at)}</p>
                    </div>
                    {selectedJob.completed_at && (
                      <div>
                        <p className="font-medium">Completed:</p>
                        <p className="text-gray-600 dark:text-gray-400">{formatDate(selectedJob.completed_at)}</p>
                      </div>
                    )}
                  </div>
                  
                  {selectedJob.error_message && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 rounded">
                      <p className="text-red-800 dark:text-red-300 text-sm">{selectedJob.error_message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedJob.results && (
                <DocumentAnalysisResults
                  results={selectedJob.results}
                  processingTime={selectedJob.processing_time}
                />
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No results selected</p>
                <p className="text-xs text-gray-400 mt-1">
                  Select a job from the history to view results
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentProcessing;
