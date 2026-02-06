import React, { useState, useEffect } from 'react';
import { Workflow, Play, Clock, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';

interface WorkflowInstance {
  id: string;
  type: string;
  initiator: string;
  status: 'In Progress' | 'Pending Approval' | 'Completed' | 'Failed';
  step: string;
  started_at: string;
  updated_at: string;
}

interface WorkflowType {
  id: string;
  name: string;
  description: string;
  steps_count: number;
}

export default function WorkflowManagementPage() {
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [workflowTypes, setWorkflowTypes] = useState<WorkflowType[]>([]);
  const [showStartModal, setShowStartModal] = useState(false);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const [instancesRes, typesRes] = await Promise.all([
        fetch(`${API_BASE}/api/workflows/instances`, { headers }),
        fetch(`${API_BASE}/api/workflows/types`, { headers })
      ]);
      if (instancesRes.ok) setWorkflows(await instancesRes.json());
      if (typesRes.ok) setWorkflowTypes(await typesRes.json());
    } catch (err) {
      console.error('Error fetching workflows:', err);
      // Fallback data
      setWorkflows([
        { id: 'WF-001', type: 'Procure-to-Pay', initiator: 'John Doe', status: 'In Progress', step: '3/5', started_at: '2026-01-15', updated_at: '2026-01-15' },
        { id: 'WF-002', type: 'Order-to-Cash', initiator: 'Jane Smith', status: 'Pending Approval', step: '2/4', started_at: '2026-01-14', updated_at: '2026-01-15' }
      ]);
      setWorkflowTypes([
        { id: 'p2p', name: 'Procure-to-Pay', description: 'PR → RFQ → PO → GRN → Invoice', steps_count: 5 },
        { id: 'o2c', name: 'Order-to-Cash', description: 'Quote → Order → Delivery → Invoice', steps_count: 4 },
        { id: 'h2r', name: 'Hire-to-Retire', description: 'Recruit → Onboard → Payroll → Exit', steps_count: 4 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleStartWorkflow = async (typeId: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      await fetch(`${API_BASE}/api/workflows/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ type_id: typeId })
      });
      setShowStartModal(false);
      await fetchWorkflows();
    } catch (err) {
      console.error('Failed to start workflow:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/30">
              <Workflow className="h-7 w-7 text-white" />
            </div>
            Workflow Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 ml-14">Manage and monitor business workflows</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchWorkflows}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowStartModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all"
          >
            <Play className="h-5 w-5" />
            Start Workflow
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {workflowTypes.map((wf) => (
              <div key={wf.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{wf.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{wf.description}</p>
                <span className="text-xs text-indigo-600 dark:text-indigo-400">{wf.steps_count} steps</span>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Active Workflows</h3>
            <DataTable
              data={workflows}
              columns={[
                { key: 'id', label: 'Workflow ID' },
                { key: 'type', label: 'Type' },
                { key: 'initiator', label: 'Initiated By' },
                { key: 'step', label: 'Progress' },
                { key: 'status', label: 'Status', render: (row: WorkflowInstance) => (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    row.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    row.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                    row.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                  }`}>{row.status}</span>
                )}
              ]}
              searchable={true}
              exportable={false}
            />
          </div>
        </>
      )}

      {showStartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-500">
              <h2 className="text-xl font-bold text-white">Start New Workflow</h2>
            </div>
            <div className="p-6 space-y-3">
              {workflowTypes.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => handleStartWorkflow(wf.id)}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-left hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-white">{wf.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{wf.description}</div>
                </button>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowStartModal(false)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
