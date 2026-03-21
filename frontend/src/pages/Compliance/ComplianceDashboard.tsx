import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { FileText, Scale, Building, AlertTriangle, Shield, CheckCircle, Clock, RefreshCw, TrendingUp } from 'lucide-react';

interface ComplianceMetrics {
  tax_obligations_pending: number;
  legal_documents_expiring: number;
  fixed_assets_count: number;
  compliance_score: number;
}

const ComplianceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ComplianceMetrics>({
    tax_obligations_pending: 0,
    legal_documents_expiring: 0,
    fixed_assets_count: 0,
    compliance_score: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/compliance/metrics');
      setMetrics(response.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load compliance metrics';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-4" data-testid="compliance-dashboard">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Compliance Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Monitor tax, legal, and regulatory compliance</p>
          </div>
          <button onClick={loadMetrics} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 transition-all ">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link to="/tax" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl  group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Tax Compliance</p>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Manage tax obligations</p>
                </div>
              </div>
            </div>
          </Link>
          <Link to="/legal" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl  group-hover:scale-110 transition-transform">
                  <Scale className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Legal Compliance</p>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Manage legal documents</p>
                </div>
              </div>
            </div>
          </Link>
          <Link to="/fixed-assets" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl  group-hover:scale-110 transition-transform">
                  <Building className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Fixed Assets</p>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Track asset depreciation</p>
                </div>
              </div>
            </div>
          </Link>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl ">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Alerts</p>
                <p className="text-xs text-gray-500 dark:text-gray-300">View compliance alerts</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-gradient-to-br ${getScoreGradient(metrics.compliance_score)} rounded-lg`}>
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${getScoreColor(metrics.compliance_score)}`}>{metrics.compliance_score}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-300">Compliance Score</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl ">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${metrics.tax_obligations_pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>{metrics.tax_obligations_pending}</p>
                <p className="text-xs text-gray-500 dark:text-gray-300">Pending Tax Obligations</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl ">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${metrics.legal_documents_expiring > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>{metrics.legal_documents_expiring}</p>
                <p className="text-xs text-gray-500 dark:text-gray-300">Expiring Documents</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl ">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.fixed_assets_count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-300">Fixed Assets</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compliance Status</h2>
            </div>
          </div>
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-300">Loading...</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Tax Compliance</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">All tax obligations up to date</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${metrics.tax_obligations_pending === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>
                  {metrics.tax_obligations_pending === 0 ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  {metrics.tax_obligations_pending === 0 ? 'Compliant' : 'Action Required'}
                </span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Legal Compliance</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">All legal documents current</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${metrics.legal_documents_expiring === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>
                  {metrics.legal_documents_expiring === 0 ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  {metrics.legal_documents_expiring === 0 ? 'Compliant' : 'Action Required'}
                </span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Asset Management</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">Fixed assets properly tracked</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-3.5 w-3.5" />Compliant
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplianceDashboard;
