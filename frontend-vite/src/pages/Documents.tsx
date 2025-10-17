import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Upload, FolderOpen } from 'lucide-react';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentPreview } from '@/components/documents/DocumentPreview';
import { useDocumentsStore } from '@/store/documents';
import type { Document } from '@/types';

export function Documents() {
  const { documents, addDocument, deleteDocument } = useDocumentsStore();
  const [showUpload, setShowUpload] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  const handleUpload = (files: File[]) => {
    files.forEach(file => {
      const newDocument: Document = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'John Doe',
        status: 'processing',
        tags: []
      };
      addDocument(newDocument);
    });
  };

  const handlePreview = (document: Document) => {
    setPreviewDocument(document);
  };

  const handleDownload = (document: Document) => {
    // In a real app, this would download the file
    console.log('Downloading:', document.name);
  };

  const handleDelete = (document: Document) => {
    if (confirm(`Are you sure you want to delete "${document.name}"?`)) {
      deleteDocument(document.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-2">
            Manage and organize your documents
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Documents
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border rounded-lg p-4"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{documents.length}</p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border rounded-lg p-4"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {documents.filter(d => d.status === 'processed').length}
              </p>
              <p className="text-sm text-muted-foreground">Processed</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border rounded-lg p-4"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {documents.filter(d => d.status === 'processing').length}
              </p>
              <p className="text-sm text-muted-foreground">Processing</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border rounded-lg p-4"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {documents.filter(d => d.status === 'failed').length}
              </p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-card border rounded-lg p-6"
        >
          <DocumentUpload onUpload={handleUpload} />
        </motion.div>
      )}

      {/* Documents List */}
      <div className="bg-card border rounded-lg p-6">
        <DocumentList
          documents={documents}
          onPreview={handlePreview}
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      </div>

      {/* Document Preview Modal */}
      <DocumentPreview
        document={previewDocument}
        isOpen={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        onDownload={handleDownload}
        onDelete={handleDelete}
      />
    </div>
  );
}