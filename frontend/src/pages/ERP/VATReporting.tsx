import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Download, Upload, 
  CheckCircle, XCircle, Clock, AlertCircle, Lock,
  Calendar, TrendingUp, DollarSign
} from 'lucide-react';

interface TaxCode {
  id: string;
  tax_code: string;
  description: string;
  tax_rate: number;
  tax_type: string;
  is_active: boolean;
  created_at: string;
}

interface VAT201Return {
  id: string;
  return_number: string;
  period_start: string;
  period_end: string;
  output_tax: number;
  input_tax: number;
  net_vat: number;
  status: string;
  submitted_at?: string;
  created_at: string;
}

interface EMP201Return {
  id: string;
  return_number: string;
  period_start: string;
  period_end: string;
  paye_amount: number;
  uif_amount: number;
  sdl_amount: number;
  total_amount: number;
  status: string;
  submitted_at?: string;
  created_at: string;
}

interface PeriodClose {
  id: string;
  period_name: string;
  period_start: string;
  period_end: string;
  status: string;
  closed_by?: string;
  closed_at?: string;
  created_at: string;
}

interface BBBEEReport {
  supplier_name: string;
  bbbee_level: string;
  total_spend: number;
  recognition_percentage: number;
  recognized_spend: number;
}

type TabType = 'tax-codes' | 'vat201' | 'emp201' | 'period-close' | 'bbbee';

const VATReporting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('tax-codes');
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [vat201Returns, setVat201Returns] = useState<VAT201Return[]>([]);
  const [emp201Returns, setEmp201Returns] = useState<EMP201Return[]>([]);
  const [periodCloses, setPeriodCloses] = useState<PeriodClose[]>([]);
  const [bbbeeReport, setBbbeeReport] = useState<BBBEEReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const companyId = localStorage.getItem('selectedCompanyId') || '';

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      switch (activeTab) {
        case 'tax-codes':
          const taxCodesRes = await fetch(`/api/erp/vat-reporting/tax-codes?company_id=${companyId}`, { headers });
          if (taxCodesRes.ok) {
            const data = await taxCodesRes.json();
            setTaxCodes(data.tax_codes || []);
          }
          break;
        case 'vat201':
          const vat201Res = await fetch(`/api/erp/vat-reporting/vat201?company_id=${companyId}`, { headers });
          if (vat201Res.ok) {
            const data = await vat201Res.json();
            setVat201Returns(data.vat201_returns || []);
          }
          break;
        case 'emp201':
          const emp201Res = await fetch(`/api/erp/vat-reporting/emp201?company_id=${companyId}`, { headers });
          if (emp201Res.ok) {
            const data = await emp201Res.json();
            setEmp201Returns(data.emp201_returns || []);
          }
          break;
        case 'period-close':
          const periodCloseRes = await fetch(`/api/erp/vat-reporting/period-close?company_id=${companyId}`, { headers });
          if (periodCloseRes.ok) {
            const data = await periodCloseRes.json();
            setPeriodCloses(data.period_closes || []);
          }
          break;
        case 'bbbee':
          const bbbeeRes = await fetch(`/api/erp/vat-reporting/bbbee/procurement?company_id=${companyId}`, { headers });
          if (bbbeeRes.ok) {
            const data = await bbbeeRes.json();
            setBbbeeReport(data.bbbee_report || []);
          }
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100', icon: <Clock className="w-3 h-3" /> },
      pending: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300', icon: <Clock className="w-3 h-3" /> },
      submitted: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200', icon: <CheckCircle className="w-3 h-3" /> },
      approved: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', icon: <CheckCircle className="w-3 h-3" /> },
      open: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', icon: <CheckCircle className="w-3 h-3" /> },
      closed: { color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300', icon: <Lock className="w-3 h-3" /> },
      rejected: { color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300', icon: <XCircle className="w-3 h-3" /> }
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.draft;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  const renderTaxCodes = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tax Codes</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Tax Code
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tax Code</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tax Type</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tax Rate</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {taxCodes.map((taxCode) => (
              <tr key={taxCode.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{taxCode.tax_code}</td>
                <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{taxCode.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{taxCode.tax_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{taxCode.tax_rate}%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {taxCode.is_active ? (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">Active</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs rounded-full">Inactive</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100 mr-3">Edit</button>
                  <button className="text-red-600 dark:text-red-400 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderVAT201 = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">VAT201 Returns</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New VAT201 Return
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Return Number</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Period</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Output Tax</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Input Tax</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Net VAT</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {vat201Returns.map((vat201) => (
              <tr key={vat201.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{vat201.return_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                  {new Date(vat201.period_start).toLocaleDateString()} - {new Date(vat201.period_end).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">R {Number(vat201.output_tax ?? 0).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">R {Number(vat201.input_tax ?? 0).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                  R {Number(vat201.net_vat ?? 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(vat201.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100 mr-3">View</button>
                  {vat201.status === 'draft' && (
                    <button className="text-green-600 dark:text-green-400 hover:text-green-900">Submit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEMP201 = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">EMP201 Returns</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New EMP201 Return
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Return Number</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Period</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PAYE</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">UIF</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SDL</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {emp201Returns.map((emp201) => (
              <tr key={emp201.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{emp201.return_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                  {new Date(emp201.period_start).toLocaleDateString()} - {new Date(emp201.period_end).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">R {Number(emp201.paye_amount ?? 0).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">R {Number(emp201.uif_amount ?? 0).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">R {Number(emp201.sdl_amount ?? 0).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                  R {Number(emp201.total_amount ?? 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(emp201.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100 mr-3">View</button>
                  {emp201.status === 'draft' && (
                    <button className="text-green-600 dark:text-green-400 hover:text-green-900">Submit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPeriodClose = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Period Close</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Period Close
        </button>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900">Period Close Warning</h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
              Closing a period will lock all transactions for that period. This action cannot be undone without proper authorization.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Period Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Period Start</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Period End</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Closed By</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Closed At</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {periodCloses.map((period) => (
              <tr key={period.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{period.period_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{new Date(period.period_start).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{new Date(period.period_end).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(period.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{period.closed_by || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                  {period.closed_at ? new Date(period.closed_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                  {period.status === 'open' ? (
                    <button className="text-red-600 dark:text-red-400 hover:text-red-900 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Close Period
                    </button>
                  ) : (
                    <span className="text-gray-400">Locked</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBBBEE = () => {
    const totalSpend = bbbeeReport.reduce((sum, item) => sum + item.total_spend, 0);
    const totalRecognized = bbbeeReport.reduce((sum, item) => sum + item.recognized_spend, 0);
    const overallRecognition = totalSpend > 0 ? (totalRecognized / totalSpend) * 100 : 0;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">BBBEE Procurement Report</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Procurement Spend</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mt-1">R {Number(totalSpend ?? 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Recognized Spend</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">R {Number(totalRecognized ?? 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Recognition Rate</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{Number(overallRecognition ?? 0).toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Supplier Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">BBBEE Level</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Spend</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Recognition %</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Recognized Spend</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {bbbeeReport.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{item.supplier_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                      Level {item.bbbee_level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">R {Number(item.total_spend ?? 0).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.recognition_percentage}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 dark:text-green-400">
                    R {Number(item.recognized_spend ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Please select a company to view VAT reporting data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">VAT & Compliance Reporting</h1>
          <p className="text-gray-600 dark:text-gray-400">South African VAT201, EMP201, BBBEE reporting and period close</p>
        </div>
      </div>

      <div className="border-b border-gray-100 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('tax-codes')}
            className={`${
              activeTab === 'tax-codes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <FileText className="w-4 h-4" />
            Tax Codes
          </button>
          <button
            onClick={() => setActiveTab('vat201')}
            className={`${
              activeTab === 'vat201'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <FileText className="w-4 h-4" />
            VAT201
          </button>
          <button
            onClick={() => setActiveTab('emp201')}
            className={`${
              activeTab === 'emp201'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <FileText className="w-4 h-4" />
            EMP201
          </button>
          <button
            onClick={() => setActiveTab('period-close')}
            className={`${
              activeTab === 'period-close'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Lock className="w-4 h-4" />
            Period Close
          </button>
          <button
            onClick={() => setActiveTab('bbbee')}
            className={`${
              activeTab === 'bbbee'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <TrendingUp className="w-4 h-4" />
            BBBEE
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'tax-codes' && renderTaxCodes()}
          {activeTab === 'vat201' && renderVAT201()}
          {activeTab === 'emp201' && renderEMP201()}
          {activeTab === 'period-close' && renderPeriodClose()}
          {activeTab === 'bbbee' && renderBBBEE()}
        </>
      )}
    </div>
  );
};

export default VATReporting;
