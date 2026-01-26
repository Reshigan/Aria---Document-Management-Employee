import React, { useState, useEffect } from 'react';
import { Workflow, Play, Clock } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';

export default function WorkflowManagementPage() {
  const [workflows, setWorkflows] = useState([]);
  const [showStartModal, setShowStartModal] = useState(false);

  const workflowTypes = [
    { id: 'p2p', name: 'Procure-to-Pay', description: 'PR → RFQ → PO → GRN → Invoice' },
    { id: 'o2c', name: 'Order-to-Cash', description: 'Quote → Order → Delivery → Invoice' },
    { id: 'h2r', name: 'Hire-to-Retire', description: 'Recruit → Onboard → Payroll → Exit' }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Workflow className="h-8 w-8" />
          Workflow Management
        </h1>
        <button
          onClick={() => setShowStartModal(true)}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700"
        >
          <Play className="h-4 w-4 inline mr-2" />
          Start Workflow
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {workflowTypes.map((wf) => (
          <div key={wf.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="text-lg font-bold mb-2">{wf.name}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{wf.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Active Workflows</h3>
        <DataTable
          data={[
            { id: 'WF-001', type: 'Procure-to-Pay', initiator: 'John Doe', status: 'In Progress', step: '3/5' },
            { id: 'WF-002', type: 'Order-to-Cash', initiator: 'Jane Smith', status: 'Pending Approval', step: '2/4' }
          ]}
          columns={[
            { key: 'id', label: 'Workflow ID' },
            { key: 'type', label: 'Type' },
            { key: 'initiator', label: 'Initiated By' },
            { key: 'step', label: 'Progress' },
            { key: 'status', label: 'Status' }
          ]}
          searchable={true}
          exportable={false}
        />
      </div>

      {showStartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Start New Workflow</h2>
            <div className="space-y-3">
              {workflowTypes.map((wf) => (
                <button
                  key={wf.id}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-left hover:border-blue-500"
                >
                  <div className="font-medium">{wf.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{wf.description}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowStartModal(false)}
              className="mt-4 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
