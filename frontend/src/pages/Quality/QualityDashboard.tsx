import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';

const QualityDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/quality/dashboard');
      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Quality Management Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pass Rate</p>
                <p className="text-3xl font-bold text-green-600">{dashboard?.pass_rate || 0}%</p>
              </div>
              <CheckCircle className="text-green-600" size={40} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Inspections</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboard?.total_inspections || 0}</p>
              </div>
              <TrendingUp className="text-blue-600" size={40} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active NCRs</p>
                <p className="text-3xl font-bold text-orange-600">{dashboard?.active_ncrs || 0}</p>
              </div>
              <AlertTriangle className="text-orange-600" size={40} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Open CAPAs</p>
                <p className="text-3xl font-bold text-purple-600">{dashboard?.open_capas || 0}</p>
              </div>
              <XCircle className="text-purple-600" size={40} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityDashboard;
