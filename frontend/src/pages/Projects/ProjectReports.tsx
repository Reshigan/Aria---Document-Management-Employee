import React, { useState, useEffect } from 'react';
import { BarChart3, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../lib/api';

interface ProjectReport {
  project_name: string;
  budget: number;
  actual_cost: number;
  variance: number;
  progress: number;
  tasks_total: number;
  tasks_completed: number;
  hours_logged: number;
}

const ProjectReports: React.FC = () => {
  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/projects/reports');
      setReports(response.data.reports || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load project reports');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-rose-50 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-rose-50 dark:from-gray-900 dark:to-gray-800 p-8" data-testid="projects-reports">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl ">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          Project Reports
        </h1>
        <p className="text-gray-500 dark:text-gray-300 mt-1">View project performance and budget analysis</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Reports Table */}
      {reports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No project reports found</h3>
          <p className="text-gray-500 dark:text-gray-300">Reports will appear here once projects have data</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full" data-testid="reports-table">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Budget</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actual Cost</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Variance</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Tasks</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {reports.map((report, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{report.project_name}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-300">{formatCurrency(report.budget)}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-300">{formatCurrency(report.actual_cost)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 ${report.variance < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {report.variance < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                      {formatCurrency(report.variance)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
                          style={{ width: `${report.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-300">{report.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {report.tasks_completed}/{report.tasks_total}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{report.hours_logged}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProjectReports;
