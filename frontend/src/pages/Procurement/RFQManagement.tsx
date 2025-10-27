import React, { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';

const RFQManagement: React.FC = () => {
  const [rfqs, setRFQs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRFQs();
  }, []);

  const fetchRFQs = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/procurement/rfq');
      const data = await response.json();
      setRFQs(data.rfqs || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Request for Quotation (RFQ)</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage RFQs and supplier quotes</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} />
            Create RFQ
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">RFQ ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Issue Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : rfqs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">No RFQs found</td></tr>
              ) : (
                rfqs.map((rfq) => (
                  <tr key={rfq.rfq_id}>
                    <td className="px-6 py-4 text-sm font-medium">{rfq.rfq_id}</td>
                    <td className="px-6 py-4 text-sm">{rfq.title}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{rfq.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">{new Date(rfq.issue_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">{new Date(rfq.due_date).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RFQManagement;
