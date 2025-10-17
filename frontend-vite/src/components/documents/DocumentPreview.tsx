import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  Share2, 
  Edit, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  FileText,
  Image as ImageIcon,
  File
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Document } from '@/types';

interface DocumentPreviewProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  onEdit?: (document: Document) => void;
  className?: string;
}

export function DocumentPreview({
  document,
  isOpen,
  onClose,
  onDownload,
  onDelete,
  onEdit,
  className
}: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  if (!document) return null;

  const isImage = document.type.includes('image');
  const isPDF = document.type.includes('pdf');
  const isText = document.type.includes('text');

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = () => {
    if (isImage) return ImageIcon;
    if (isPDF || document.type.includes('document')) return FileText;
    return File;
  };

  const IconComponent = getFileIcon();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={cn(
              'fixed inset-4 bg-background rounded-lg shadow-2xl flex flex-col',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <IconComponent className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{document.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(document.size)} • {document.type}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {(isImage || isPDF) && (
                  <>
                    <button
                      onClick={handleZoomOut}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      disabled={zoom <= 50}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                      {zoom}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      disabled={zoom >= 200}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    {isImage && (
                      <button
                        onClick={handleRotate}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    )}
                    <div className="w-px h-6 bg-border mx-2" />
                  </>
                )}
                
                <button
                  onClick={() => onDownload?.(document)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {/* Share functionality */}}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                {onEdit && (
                  <button
                    onClick={() => onEdit(document)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onDelete?.(document)}
                  className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Preview Area */}
              <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                {isImage ? (
                  <motion.img
                    src={`/api/documents/${document.id}/preview`}
                    alt={document.name}
                    className="max-w-full max-h-full object-contain"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transformOrigin: 'center'
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                ) : isPDF ? (
                  <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">PDF Preview</p>
                      <p className="text-muted-foreground mb-4">
                        PDF preview will be available soon
                      </p>
                      <button
                        onClick={() => onDownload?.(document)}
                        className="btn-primary"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download to View
                      </button>
                    </div>
                  </div>
                ) : isText ? (
                  <div className="w-full h-full bg-muted rounded-lg p-6 overflow-auto">
                    <pre className="text-sm whitespace-pre-wrap">
                      {/* Text content would be loaded here */}
                      Loading text content...
                    </pre>
                  </div>
                ) : (
                  <div className="text-center">
                    <IconComponent className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">Preview Not Available</p>
                    <p className="text-muted-foreground mb-4">
                      This file type cannot be previewed in the browser
                    </p>
                    <button
                      onClick={() => onDownload?.(document)}
                      className="btn-primary"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download File
                    </button>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="w-80 border-l bg-muted/30 p-4 overflow-auto">
                <h3 className="font-semibold mb-4">Document Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm mt-1">{document.name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Size</label>
                    <p className="text-sm mt-1">{formatFileSize(document.size)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <p className="text-sm mt-1">{document.type}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Uploaded</label>
                    <p className="text-sm mt-1">{formatDate(document.uploadedAt)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Uploaded by</label>
                    <p className="text-sm mt-1">{document.uploadedBy}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        document.status === 'processed' && 'bg-green-500',
                        document.status === 'processing' && 'bg-yellow-500',
                        document.status === 'failed' && 'bg-red-500'
                      )} />
                      <span className="text-sm capitalize">{document.status}</span>
                    </div>
                  </div>
                  
                  {document.tags && document.tags.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tags</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {document.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 pt-4 border-t space-y-2">
                  <button
                    onClick={() => onDownload?.(document)}
                    className="w-full btn-primary"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                  <button
                    onClick={() => {/* Share functionality */}}
                    className="w-full btn-secondary"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </button>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(document)}
                      className="w-full btn-secondary"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}