import React, { useState } from 'react';
import { CheckSquare, Send, Download, Trash2, X } from 'lucide-react';

interface BatchActionBarProps {
  selectedIds: string[];
  documentType: string;
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedIds,
  documentType,
  onClearSelection,
  onActionComplete
}) => {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (selectedIds.length === 0) return null;

  const handleBatchApprove = async () => {
    if (!confirm(`Approve ${selectedIds.length} document(s)?`)) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/batch/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          document_type: documentType,
          document_ids: selectedIds
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setTimeout(() => {
          setResult(null);
          onClearSelection();
          onActionComplete();
        }, 3000);
      } else {
        throw new Error('Batch approve failed');
      }
    } catch (error) {
      console.error('Batch approve failed:', error);
      alert('Failed to approve documents');
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchPost = async () => {
    if (!confirm(`Post ${selectedIds.length} document(s)?`)) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/batch/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          document_type: documentType,
          document_ids: selectedIds
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setTimeout(() => {
          setResult(null);
          onClearSelection();
          onActionComplete();
        }, 3000);
      } else {
        throw new Error('Batch post failed');
      }
    } catch (error) {
      console.error('Batch post failed:', error);
      alert('Failed to post documents');
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchExport = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/batch/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          document_type: documentType,
          document_ids: selectedIds,
          export_format: 'csv'
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${documentType}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        onClearSelection();
      } else {
        throw new Error('Batch export failed');
      }
    } catch (error) {
      console.error('Batch export failed:', error);
      alert('Failed to export documents');
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} document(s)? This action cannot be undone.`)) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/batch/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          document_type: documentType,
          document_ids: selectedIds
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setTimeout(() => {
          setResult(null);
          onClearSelection();
          onActionComplete();
        }, 3000);
      } else {
        throw new Error('Batch delete failed');
      }
    } catch (error) {
      console.error('Batch delete failed:', error);
      alert('Failed to delete documents');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-500 shadow-lg z-50">
      <div className="container mx-auto px-4 py-4">
        {result ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CheckSquare className="text-green-600" size={24} />
              <div>
                <p className="font-semibold">Batch operation complete</p>
                <p className="text-sm text-gray-600">
                  {result.successful} succeeded, {result.failed} failed out of {result.total}
                </p>
              </div>
            </div>
            <button
              onClick={() => setResult(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CheckSquare className="text-blue-600" size={24} />
              <span className="font-semibold">
                {selectedIds.length} document(s) selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchApprove}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <CheckSquare size={16} />
                <span>Approve</span>
              </button>
              <button
                onClick={handleBatchPost}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
                <span>Post</span>
              </button>
              <button
                onClick={handleBatchExport}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Download size={16} />
                <span>Export</span>
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
              <button
                onClick={onClearSelection}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                <X size={16} />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
