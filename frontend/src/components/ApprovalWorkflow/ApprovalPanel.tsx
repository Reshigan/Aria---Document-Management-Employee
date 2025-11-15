import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Send } from 'lucide-react';

interface ApprovalPanelProps {
  documentType: string;
  documentId: string;
  currentStatus: string;
  onStatusChange?: () => void;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
  documentType,
  documentId,
  currentStatus,
  onStatusChange
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmitForApproval = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/approval/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          document_type: documentType,
          document_id: documentId
        })
      });

      if (response.ok) {
        alert('Document submitted for approval');
        if (onStatusChange) onStatusChange();
      } else {
        throw new Error('Failed to submit for approval');
      }
    } catch (error) {
      console.error('Submit failed:', error);
      alert('Failed to submit document for approval');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!comments.trim()) {
      alert('Please add approval comments');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/approval/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          document_type: documentType,
          document_id: documentId,
          comments: comments
        })
      });

      if (response.ok) {
        alert('Document approved successfully');
        setComments('');
        if (onStatusChange) onStatusChange();
      } else {
        throw new Error('Failed to approve document');
      }
    } catch (error) {
      console.error('Approve failed:', error);
      alert('Failed to approve document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/approval/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          document_type: documentType,
          document_id: documentId,
          reason: reason
        })
      });

      if (response.ok) {
        alert('Document rejected');
        setReason('');
        if (onStatusChange) onStatusChange();
      } else {
        throw new Error('Failed to reject document');
      }
    } catch (error) {
      console.error('Reject failed:', error);
      alert('Failed to reject document');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      draft: {
        color: 'bg-gray-100 text-gray-800',
        icon: <Clock size={16} />,
        label: 'Draft'
      },
      pending_approval: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock size={16} />,
        label: 'Pending Approval'
      },
      approved: {
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle size={16} />,
        label: 'Approved'
      },
      rejected: {
        color: 'bg-red-100 text-red-800',
        icon: <XCircle size={16} />,
        label: 'Rejected'
      },
      posted: {
        color: 'bg-blue-100 text-blue-800',
        icon: <CheckCircle size={16} />,
        label: 'Posted'
      }
    };

    const config = statusConfig[currentStatus] || statusConfig.draft;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config.color}`}>
        {config.icon}
        <span className="font-medium">{config.label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Approval Status</h3>
        {getStatusBadge()}
      </div>

      {currentStatus === 'draft' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            This document is in draft status. Submit it for approval when ready.
          </p>
          <button
            onClick={handleSubmitForApproval}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
            <span>{submitting ? 'Submitting...' : 'Submit for Approval'}</span>
          </button>
        </div>
      )}

      {currentStatus === 'pending_approval' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            This document is awaiting approval. Approve or reject below.
          </p>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Approval Comments
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add your approval comments..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleApprove}
            disabled={submitting || !comments.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle size={16} />
            <span>{submitting ? 'Approving...' : 'Approve'}</span>
          </button>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Rejection Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for rejection..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleReject}
            disabled={submitting || !reason.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <XCircle size={16} />
            <span>{submitting ? 'Rejecting...' : 'Reject'}</span>
          </button>
        </div>
      )}

      {(currentStatus === 'approved' || currentStatus === 'posted') && (
        <div className="space-y-2">
          <p className="text-sm text-green-600 font-medium">
            ✓ This document has been approved and is ready for posting.
          </p>
        </div>
      )}

      {currentStatus === 'rejected' && (
        <div className="space-y-2">
          <p className="text-sm text-red-600 font-medium">
            ✗ This document has been rejected. Please review and make necessary changes.
          </p>
        </div>
      )}
    </div>
  );
};
