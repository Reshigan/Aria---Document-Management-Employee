import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle } from 'lucide-react';

const QualityInspections: React.FC = () => {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/quality/inspections');
      const data = await response.json();
      setInspections(data.inspections || []);
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quality Inspections</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track quality control inspections</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} />
            New Inspection
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Inspections</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{inspections.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Passed</p>
            <p className="text-2xl font-bold text-green-600">
              {inspections.filter(i => i.result === 'passed').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
            <p className="text-2xl font-bold text-red-600">
              {inspections.filter(i => i.result === 'failed').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Work Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Inspector</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Result</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : inspections.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">No inspections found</td></tr>
              ) : (
                inspections.map((inspection) => (
                  <tr key={inspection.inspection_id}>
                    <td className="px-6 py-4 text-sm">{inspection.inspection_id}</td>
                    <td className="px-6 py-4 text-sm">{inspection.work_order_id}</td>
                    <td className="px-6 py-4 text-sm">{inspection.inspector}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        inspection.result === 'passed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {inspection.result}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{new Date(inspection.inspection_date).toLocaleDateString()}</td>
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

export default QualityInspections;
