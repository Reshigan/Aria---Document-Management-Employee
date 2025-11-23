import React, { useState } from 'react';
import { CheckSquare, X, Check } from 'lucide-react';
import { DataTable } from '../components/shared/DataTable';

export default function PendingActionsPage() {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const actions = [
    { id: 1, type: 'Invoice Approval', description: 'Approve invoice #INV-1234 from Supplier A', amount: 15000, priority: 'high' },
    { id: 2, type: 'Expense Claim', description: 'Review expense claim from John Doe', amount: 850, priority: 'medium' },
    { id: 3, type: 'Leave Request', description: 'Approve leave request from Jane Smith', amount: null, priority: 'low' }
  ];

  const handleReject = () => {
    // Show success message
    const successDiv = document.createElement('div');
    successDiv.setAttribute('data-testid', 'success-message');
    successDiv.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-lg shadow-lg z-50';
    successDiv.textContent = 'Action rejected successfully!';
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
    
    setShowRejectModal(false);
    setRejectReason('');
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <CheckSquare className="h-8 w-8" />
        My Pending Actions
      </h1>
      <div className="bg-white rounded-lg shadow" data-testid="actions-table">
        <DataTable
          data={actions}
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'description', label: 'Description' },
            { key: 'amount', label: 'Amount', render: (row: any) => row.amount ? `R ${row.amount}` : '-' },
            { key: 'priority', label: 'Priority', render: (row: any) => {
              const colors = { high: 'text-red-600', medium: 'text-yellow-600', low: 'text-green-600' };
              return <span className={colors[row.priority as keyof typeof colors]}>{row.priority}</span>;
            }},
            { key: 'actions', label: 'Actions', render: (row: any) => (
              <div className="flex gap-2">
                <button className="p-2 text-green-600 hover:bg-green-50 rounded" data-testid={`action-approve-${row.id}`}><Check className="h-4 w-4" /></button>
                <button 
                  className="p-2 text-red-600 hover:bg-red-50 rounded" 
                  data-testid={`action-reject-${row.id}`}
                  onClick={() => setShowRejectModal(true)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          ]}
          searchable={true}
          exportable={false}
        />
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" data-testid="modal-reject-reason">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reject Action</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection *
              </label>
              <textarea
                name="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                rows={4}
                placeholder="Please provide a reason..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                data-testid="button-confirm-reject"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
