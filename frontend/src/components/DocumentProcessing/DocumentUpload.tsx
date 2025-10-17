import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Image, File, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface DocumentUploadProps {
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadComplete,
  onUploadError
}) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [ocrEngine, setOcrEngine] = useState('ensemble');
  const [autoProcess, setAutoProcess] = useState(true);
  const [analysisTypes, setAnalysisTypes] = useState({
    classification: true,
    sentiment: true,
    summarization: true,
    entity_extraction: true,
    key_phrases: false,
    topic_modeling: false
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending' as const,
      progress: 0
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.tiff', '.bmp'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  });

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        )
      );

      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('auto_process', autoProcess.toString());
      formData.append('ocr_engine', ocrEngine);
      formData.append('analysis_types', Object.entries(analysisTypes)
        .filter(([_, enabled]) => enabled)
        .map(([type, _]) => type)
        .join(',')
      );

      const response = await fetch('/api/documents/processing/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      setUploadFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: autoProcess ? 'processing' : 'completed',
                progress: autoProcess ? 50 : 100,
                result
              }
            : f
        )
      );

      // If auto-processing is enabled, monitor the job
      if (autoProcess && result.processing_job_id) {
        monitorProcessingJob(uploadFile.id, result.processing_job_id);
      } else {
        onUploadComplete?.(result);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: errorMessage }
            : f
        )
      );

      onUploadError?.(errorMessage);
    }
  };

  const monitorProcessingJob = async (fileId: string, jobId: number) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/documents/processing/job/${jobId}/status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to check job status');
        }

        const jobStatus = await response.json();

        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? {
                  ...f,
                  progress: jobStatus.progress || 50,
                  status: jobStatus.status === 'completed' ? 'completed' : 
                          jobStatus.status === 'failed' ? 'error' : 'processing',
                  result: jobStatus.results,
                  error: jobStatus.error_message
                }
              : f
          )
        );

        if (jobStatus.status === 'completed') {
          onUploadComplete?.(jobStatus);
        } else if (jobStatus.status === 'failed') {
          onUploadError?.(jobStatus.error_message || 'Processing failed');
        } else {
          // Continue monitoring
          setTimeout(checkStatus, 2000);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Status check failed';
        
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? { ...f, status: 'error', error: errorMessage }
              : f
          )
        );

        onUploadError?.(errorMessage);
      }
    };

    checkStatus();
  };

  const uploadAllFiles = () => {
    uploadFiles
      .filter(f => f.status === 'pending')
      .forEach(uploadFile);
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status !== 'completed' && f.status !== 'error'));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ocr-engine">OCR Engine</Label>
              <Select value={ocrEngine} onValueChange={setOcrEngine}>
                <SelectTrigger>
                  <SelectValue placeholder="Select OCR engine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ensemble">Ensemble (Best Quality)</SelectItem>
                  <SelectItem value="tesseract">Tesseract</SelectItem>
                  <SelectItem value="easyocr">EasyOCR</SelectItem>
                  <SelectItem value="paddleocr">PaddleOCR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-process"
                  checked={autoProcess}
                  onCheckedChange={setAutoProcess}
                />
                <Label htmlFor="auto-process">Auto-process after upload</Label>
              </div>
            </div>
          </div>

          {autoProcess && (
            <div className="space-y-2">
              <Label>Analysis Types</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(analysisTypes).map(([type, enabled]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        setAnalysisTypes(prev => ({ ...prev, [type]: checked }))
                      }
                    />
                    <Label htmlFor={type} className="text-sm capitalize">
                      {type.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag & drop files here, or click to select files
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, images (JPG, PNG, TIFF), Word documents, and text files
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Maximum file size: 50MB
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Files ({uploadFiles.length})</CardTitle>
            <div className="space-x-2">
              <Button
                onClick={uploadAllFiles}
                disabled={!uploadFiles.some(f => f.status === 'pending')}
                size="sm"
              >
                Upload All
              </Button>
              <Button
                onClick={clearCompleted}
                variant="outline"
                size="sm"
                disabled={!uploadFiles.some(f => f.status === 'completed' || f.status === 'error')}
              >
                Clear Completed
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadFiles.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(uploadFile.file)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {uploadFile.status}
                        </Badge>
                        {getStatusIcon(uploadFile.status)}
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    
                    {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                      <div className="mt-2">
                        <Progress value={uploadFile.progress} className="h-1" />
                        <p className="text-xs text-gray-500 mt-1">
                          {uploadFile.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                        </p>
                      </div>
                    )}
                    
                    {uploadFile.error && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {uploadFile.error}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {uploadFile.result && uploadFile.status === 'completed' && (
                      <div className="mt-2 text-xs text-green-600">
                        Processing completed successfully
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0">
                    {uploadFile.status === 'pending' && (
                      <Button
                        onClick={() => uploadFile(uploadFile)}
                        size="sm"
                        variant="outline"
                      >
                        Upload
                      </Button>
                    )}
                    <Button
                      onClick={() => removeFile(uploadFile.id)}
                      size="sm"
                      variant="ghost"
                      className="ml-2"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentUpload;