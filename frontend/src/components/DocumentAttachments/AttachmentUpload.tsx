import React, { useState, useEffect } from 'react';
import { Upload, File, Trash2, Download, Loader } from 'lucide-react';

interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  classification: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface AttachmentUploadProps {
  documentType: string;
  documentId: string;
}

export const AttachmentUpload: React.FC<AttachmentUploadProps> = ({
  documentType,
  documentId
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadAttachments();
  }, [documentType, documentId]);

  const loadAttachments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/attachments/${documentType}/${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      formData.append('document_id', documentId);

      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        await loadAttachments();
        event.target.value = '';
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadAttachments();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete attachment');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Number((bytes / 1024) || 0).toFixed(1)} KB`;
    return `${Number((bytes / (1024 * 1024)) || 0).toFixed(1)} MB`;
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getClassificationBadge = (classification: string) => {
    const colors: Record<string, string> = {
      invoice: 'bg-blue-100 text-blue-800',
      receipt: 'bg-green-100 text-green-800',
      contract: 'bg-purple-100 text-purple-800',
      purchase_order: 'bg-orange-100 text-orange-800',
      delivery_note: 'bg-yellow-100 text-yellow-800',
      bank_statement: 'bg-indigo-100 text-indigo-800',
      tax_document: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[classification] || colors.other}`}>
        {classification.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="flex-1">
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.tiff,.docx,.xlsx"
          />
          <div className={`flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            uploading
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
              : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50'
          }`}>
            {uploading ? (
              <>
                <Loader size={20} className="animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={20} />
                <span>Click to upload file</span>
              </>
            )}
          </div>
        </label>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">
          <Loader size={32} className="animate-spin mx-auto mb-2" />
          <p>Loading attachments...</p>
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <File size={48} className="mx-auto mb-2 text-gray-300" />
          <p>No attachments yet</p>
          <p className="text-sm">Upload files to attach them to this document</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <File size={24} className="text-gray-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate">{attachment.file_name}</p>
                  {getClassificationBadge(attachment.classification)}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>{formatFileSize(attachment.file_size)}</span>
                  <span>•</span>
                  <span>{attachment.uploaded_by}</span>
                  <span>•</span>
                  <span>{formatTimestamp(attachment.uploaded_at)}</span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(attachment.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                title="Delete attachment"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500 mt-2">
        Supported formats: PDF, JPG, PNG, TIFF, DOCX, XLSX (max 10MB)
      </div>
    </div>
  );
};
