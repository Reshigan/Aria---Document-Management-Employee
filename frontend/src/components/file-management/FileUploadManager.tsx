'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, File, X, CheckCircle, AlertCircle, Pause, Play, RotateCcw } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error';
  progress: number;
  uploadId?: string;
  error?: string;
  chunks?: {
    total: number;
    uploaded: number;
  };
}

export default function FileUploadManager() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024 // 100MB
  });

  const startUpload = async (fileItem: UploadFile) => {
    setFiles(prev => prev.map(f => 
      f.id === fileItem.id 
        ? { ...f, status: 'uploading', progress: 0 }
        : f
    ));

    try {
      // For large files, use chunked upload
      if (fileItem.file.size > 10 * 1024 * 1024) { // 10MB
        await startChunkedUpload(fileItem);
      } else {
        await startSimpleUpload(fileItem);
      }
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id 
          ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
          : f
      ));
    }
  };

  const startSimpleUpload = async (fileItem: UploadFile) => {
    const formData = new FormData();
    formData.append('file', fileItem.file);
    formData.append('user_id', '1');

    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, progress }
            : f
        ));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 201) {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'completed', progress: 100 }
            : f
        ));
      } else {
        throw new Error(`Upload failed with status ${xhr.status}`);
      }
    };

    xhr.onerror = () => {
      throw new Error('Network error during upload');
    };

    xhr.open('POST', '/api/files/upload');
    xhr.send(formData);
  };

  const startChunkedUpload = async (fileItem: UploadFile) => {
    const chunkSize = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(fileItem.file.size / chunkSize);

    // Start chunked upload session
    const startResponse = await fetch('/api/files/upload/chunked/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: fileItem.file.name,
        file_size: fileItem.file.size,
        chunk_size: chunkSize
      })
    });

    if (!startResponse.ok) {
      throw new Error('Failed to start chunked upload');
    }

    const { upload_id } = await startResponse.json();
    
    setFiles(prev => prev.map(f => 
      f.id === fileItem.id 
        ? { 
            ...f, 
            uploadId: upload_id,
            chunks: { total: totalChunks, uploaded: 0 }
          }
        : f
    ));

    // Upload chunks
    for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
      const start = chunkNumber * chunkSize;
      const end = Math.min(start + chunkSize, fileItem.file.size);
      const chunk = fileItem.file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk);

      const chunkResponse = await fetch(`/api/files/upload/chunked/${upload_id}/chunk/${chunkNumber}`, {
        method: 'POST',
        body: formData
      });

      if (!chunkResponse.ok) {
        throw new Error(`Failed to upload chunk ${chunkNumber}`);
      }

      const progress = ((chunkNumber + 1) / totalChunks) * 100;
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id 
          ? { 
              ...f, 
              progress,
              chunks: { total: totalChunks, uploaded: chunkNumber + 1 }
            }
          : f
      ));
    }

    // Complete upload
    const completeResponse = await fetch(`/api/files/upload/chunked/${upload_id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'user_id=1'
    });

    if (!completeResponse.ok) {
      throw new Error('Failed to complete chunked upload');
    }

    setFiles(prev => prev.map(f => 
      f.id === fileItem.id 
        ? { ...f, status: 'completed', progress: 100 }
        : f
    ));
  };

  const pauseUpload = (fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: 'paused' }
        : f
    ));
  };

  const resumeUpload = (fileId: string) => {
    const fileItem = files.find(f => f.id === fileId);
    if (fileItem) {
      startUpload(fileItem);
    }
  };

  const retryUpload = (fileId: string) => {
    const fileItem = files.find(f => f.id === fileId);
    if (fileItem) {
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'pending', progress: 0, error: undefined }
          : f
      ));
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadAll = async () => {
    setIsUploading(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (const file of pendingFiles) {
      await startUpload(file);
    }
    
    setIsUploading(false);
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'uploading':
        return 'bg-blue-500';
      case 'paused':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">File Upload Manager</h2>
          <p className="text-gray-600">Upload and manage your files with progress tracking</p>
        </div>
        <div className="flex items-center space-x-2">
          {files.some(f => f.status === 'completed') && (
            <Button variant="outline" onClick={clearCompleted}>
              Clear Completed
            </Button>
          )}
          {files.some(f => f.status === 'pending') && (
            <Button onClick={uploadAll} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload All'}
            </Button>
          )}
        </div>
      </div>

      {/* Drop Zone */}
      <Card>
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-gray-500">
                  Support for single or bulk uploads. Max file size: 100MB
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Queue ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {files.map((fileItem) => (
                <div key={fileItem.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(fileItem.status)}
                      <div>
                        <p className="font-medium">{fileItem.file.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(fileItem.file.size)}
                          {fileItem.chunks && (
                            <span className="ml-2">
                              ({fileItem.chunks.uploaded}/{fileItem.chunks.total} chunks)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={fileItem.status === 'completed' ? 'default' : 'secondary'}>
                        {fileItem.status}
                      </Badge>
                      
                      {fileItem.status === 'uploading' && (
                        <Button size="sm" variant="outline" onClick={() => pauseUpload(fileItem.id)}>
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {fileItem.status === 'paused' && (
                        <Button size="sm" variant="outline" onClick={() => resumeUpload(fileItem.id)}>
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {fileItem.status === 'error' && (
                        <Button size="sm" variant="outline" onClick={() => retryUpload(fileItem.id)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {fileItem.status === 'pending' && (
                        <Button size="sm" onClick={() => startUpload(fileItem)}>
                          Upload
                        </Button>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => removeFile(fileItem.id)}
                        disabled={fileItem.status === 'uploading'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {(fileItem.status === 'uploading' || fileItem.status === 'paused') && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{Math.round(fileItem.progress)}%</span>
                        <span>{fileItem.status === 'uploading' ? 'Uploading...' : 'Paused'}</span>
                      </div>
                      <Progress value={fileItem.progress} className="h-2" />
                    </div>
                  )}
                  
                  {fileItem.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {fileItem.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Statistics */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {files.filter(f => f.status === 'pending').length}
              </p>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {files.filter(f => f.status === 'uploading' || f.status === 'paused').length}
              </p>
              <p className="text-sm text-gray-600">In Progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {files.filter(f => f.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {files.filter(f => f.status === 'error').length}
              </p>
              <p className="text-sm text-gray-600">Failed</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}