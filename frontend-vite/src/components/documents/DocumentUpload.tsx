import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface DocumentUploadProps {
  onUpload?: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  acceptedTypes?: string[];
  className?: string;
}

export function DocumentUpload({
  onUpload,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.png'],
  className
}: DocumentUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'uploading',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach(uploadFile => {
      const interval = setInterval(() => {
        setUploadedFiles(prev => 
          prev.map(f => {
            if (f.id === uploadFile.id) {
              const newProgress = f.progress + Math.random() * 30;
              if (newProgress >= 100) {
                clearInterval(interval);
                return { ...f, progress: 100, status: 'success' };
              }
              return { ...f, progress: newProgress };
            }
            return f;
          })
        );
      }, 200);
    });

    onUpload?.(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {})
  });

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive && !isDragReject && 'border-primary bg-primary/5 scale-[1.01]',
          isDragReject && 'border-destructive bg-destructive/5',
          !isDragActive && 'border-border hover:border-primary/50 hover:scale-[1.01]'
        )}
      >
        <input {...getInputProps()} />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            isDragActive && !isDragReject && 'bg-primary/10 text-primary',
            isDragReject && 'bg-destructive/10 text-destructive',
            !isDragActive && 'bg-muted text-muted-foreground'
          )}>
            <Upload className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isDragActive 
                ? isDragReject 
                  ? 'Invalid file type' 
                  : 'Drop files here'
                : 'Upload Documents'
              }
            </h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: {acceptedTypes.join(', ')} • Max {formatFileSize(maxSize)} per file
            </p>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <h4 className="font-medium text-sm">Uploaded Files</h4>
            <div className="space-y-2">
              {uploadedFiles.map((uploadFile) => (
                <motion.div
                  key={uploadFile.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center space-x-3 p-3 bg-card rounded-lg border"
                >
                  <div className="flex-shrink-0">
                    {uploadFile.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : uploadFile.status === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    ) : (
                      <File className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadFile.file.size)}
                    </p>
                    
                    {uploadFile.status === 'uploading' && (
                      <div className="mt-1">
                        <div className="w-full bg-muted rounded-full h-1">
                          <motion.div
                            className="bg-primary h-1 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadFile.progress}%` }}
                            transition={{ duration: 0.2 }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round(uploadFile.progress)}%
                        </p>
                      </div>
                    )}
                    
                    {uploadFile.status === 'error' && uploadFile.error && (
                      <p className="text-xs text-destructive mt-1">
                        {uploadFile.error}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="flex-shrink-0 p-1 hover:bg-muted rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}