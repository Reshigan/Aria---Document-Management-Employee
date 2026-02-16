import { useState, useEffect } from 'react';
import { Workflow, Play, Clock, RefreshCw, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';
import api from '../../services/api';

interface ApprovalWorkflow {
  id: string;
  workflow_name: string;
  document_type: string;
  is_active: number;
  step_count?: number;
  created_at: string;
}

interface PendingApproval {
  id: string;
  workflow_name: string;
  document_type: string;
  document_id: string;
  document_number: string;
  amount: number;
  status: string;
  requested_at: string;
  requested_by_name?: string;
  notes?: string;
}

const DOC_TYPES = [
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'payment', label: 'Payment' },
  { value: 'journal_entry', label: 'Journal Entry' },
  { value: 'leave_request', label: 'Leave Request' },
  { value: 'expense', label: 'Expense' },
  { value: 'invoice', label: 'Invoice' },
];

export default function WorkflowManagementPage() {
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ workflow_name: '', document_type: '' });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wfRes, apRes] = await Promise.all([
        api.get('/approvals/workflows'),
        api.get('/approvals/all'),
      ]);
      setWorkflows(wfRes.data?.workflows || wfRes.data?.data?.workflows || []);
      setApprovals(apRes.data?.approvals || apRes.data?.data?.approvals || []);
    } catch {
      setWorkflows([]);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.workflow_name || !newWorkflow.document_type) return;
    try {
      await api.post('/approvals/workflows', newWorkflow);
      setMessage('Workflow created successfully');
      setShowCreateModal(false);
      setNewWorkflow({ workflow_name: '', document_type: '' });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create workflow');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/approvals/${id}/approve`, { notes: 'Approved' });
      setMessage('Approved successfully');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await api.post(`/approvals/${id}/reject`, { reason });
      setMessage('Rejected');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject');
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
              <Workflow className="h-6 w-6 text-white" />
            </div>
            Approval Workflows
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-14">Manage approval workflows and pending approvals</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all">
            <Play className="h-4 w-4" />New Workflow
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />{error}
          <button onClick={() => setError(null)} className="ml-auto font-bold">&times;</button>
        </div>
      )}
      {message && (
        <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />{message}
          <button onClick={() => setMessage(null)} className="ml-auto font-bold">&times;</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {workflows.map((wf) => (
              <div key={wf.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 hover:shadow-md transition-shadow">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{wf.workflow_name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mb-2">{(wf.document_type || '').replace(/_/g, ' ')}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${wf.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {wf.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {wf.step_count !== undefined && <span className="text-xs text-indigo-600">{wf.step_count} steps</span>}
                </div>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="col-span-full text-center py-6 text-gray-500 text-sm">No workflows configured. Create one to get started.</div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Pending Approvals</h3>
            {approvals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No pending approvals</p>
              </div>
            ) : (
              <DataTable
                data={approvals}
                columns={[
                  { key: 'document_number', label: 'Document' },
                  { key: 'document_type', label: 'Type', render: (row: PendingApproval) => <span className="capitalize">{(row.document_type || '').replace(/_/g, ' ')}</span> },
                  { key: 'amount', label: 'Amount', render: (row: PendingApproval) => `R ${Number(row.amount || 0).toFixed(2)}` },
                  { key: 'requested_by_name', label: 'Requested By' },
                  { key: 'status', label: 'Status', render: (row: PendingApproval) => (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      row.status === 'approved' ? 'bg-green-100 text-green-800' :
                      row.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{row.status}</span>
                  )},
                  { key: 'requested_at', label: 'Date', render: (row: PendingApproval) => row.requested_at ? new Date(row.requested_at).toLocaleDateString() : '' },
                  { key: 'actions', label: 'Actions', render: (row: PendingApproval) => row.status === 'pending' ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleApprove(row.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Approve"><CheckCircle className="h-4 w-4" /></button>
                      <button onClick={() => handleReject(row.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject"><XCircle className="h-4 w-4" /></button>
                    </div>
                  ) : null },
                ]}
                searchable={true}
                exportable={false}
              />
            )}
          </div>
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-500">
              <h2 className="text-lg font-bold text-white">Create Approval Workflow</h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Workflow Name</label>
                <input type="text" value={newWorkflow.workflow_name} onChange={e => setNewWorkflow({ ...newWorkflow, workflow_name: e.target.value })}
                  placeholder="e.g. PO Approval > R10,000"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Type</label>
                <select value={newWorkflow.document_type} onChange={e => setNewWorkflow({ ...newWorkflow, document_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                  <option value="">Select type...</option>
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button onClick={handleCreateWorkflow} disabled={!newWorkflow.workflow_name || !newWorkflow.document_type}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">Create</button>
              <button onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
