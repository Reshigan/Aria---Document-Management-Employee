import React, { useState, useEffect } from 'react';
import { 
  Server, Plus, Search, Filter, Download, Upload, 
  CheckCircle, XCircle, Clock, AlertCircle, Link2,
  FileText, Settings, Database, RefreshCw
} from 'lucide-react';

interface SAPConnection {
  id: string;
  connection_name: string;
  sap_system_type: string;
  host: string;
  port: number;
  client: string;
  connection_type: string;
  is_active: boolean;
  last_tested_at?: string;
  created_at: string;
}

interface FieldMapping {
  id: string;
  document_type: string;
  aria_field: string;
  sap_field: string;
  transformation_rule?: string;
  is_active: boolean;
}

interface ExportQueueItem {
  id: string;
  document_type: string;
  document_id: string;
  export_method: string;
  status: string;
  priority: number;
  retry_count: number;
  error_message?: string;
  created_at: string;
}

interface GLMapping {
  id: string;
  aria_gl_account: string;
  sap_gl_account: string;
  is_active: boolean;
}

type TabType = 'connections' | 'mappings' | 'export-queue' | 'gl-mappings';

const SAPIntegration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('connections');
  const [connections, setConnections] = useState<SAPConnection[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [exportQueue, setExportQueue] = useState<ExportQueueItem[]>([]);
  const [glMappings, setGLMappings] = useState<GLMapping[]>([]);
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
        case 'connections':
          const connectionsRes = await fetch(`/api/erp/sap-integration/connections?company_id=${companyId}`, { headers });
          if (connectionsRes.ok) {
            const data = await connectionsRes.json();
            setConnections(data.connections || []);
          }
          break;
        case 'mappings':
          const mappingsRes = await fetch(`/api/erp/sap-integration/field-mappings?company_id=${companyId}`, { headers });
          if (mappingsRes.ok) {
            const data = await mappingsRes.json();
            setFieldMappings(data.mappings || []);
          }
          break;
        case 'export-queue':
          const queueRes = await fetch(`/api/erp/sap-integration/export-queue?company_id=${companyId}`, { headers });
          if (queueRes.ok) {
            const data = await queueRes.json();
            setExportQueue(data.exports || []);
          }
          break;
        case 'gl-mappings':
          const glMappingsRes = await fetch(`/api/erp/sap-integration/gl-mappings?company_id=${companyId}`, { headers });
          if (glMappingsRes.ok) {
            const data = await glMappingsRes.json();
            setGLMappings(data.gl_mappings || []);
          }
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (connectionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/erp/sap-integration/connections/${connectionId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Connection test ${data.test_result.success ? 'successful' : 'failed'}: ${data.test_result.message}`);
        loadData();
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      alert('Failed to test connection');
    }
  };

  const exportCSV = async (documentType: string) => {
    try {
      const token = localStorage.getItem('token');
      const period = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      let endpoint = '';
      switch (documentType) {
        case 'journal-entries':
          endpoint = `/api/erp/sap-integration/export/csv/journal-entries?company_id=${companyId}&period=${period}`;
          break;
        case 'supplier-invoices':
          endpoint = `/api/erp/sap-integration/export/csv/supplier-invoices?company_id=${companyId}&period=${period}`;
          break;
        case 'customer-invoices':
          endpoint = `/api/erp/sap-integration/export/csv/customer-invoices?company_id=${companyId}&period=${period}`;
          break;
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${documentType}_${period}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
      processing: { color: 'bg-blue-100 text-blue-800', icon: <RefreshCw className="w-3 h-3" /> },
      completed: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      failed: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> }
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  const renderConnections = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">SAP Connections</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Connection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections.map((connection) => (
          <div key={connection.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Server className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{connection.connection_name}</h4>
                  <p className="text-sm text-gray-500">{connection.sap_system_type}</p>
                </div>
              </div>
              {connection.is_active ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
              ) : (
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Inactive</span>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Host:</span>
                <span className="font-medium">{connection.host}:{connection.port}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Client:</span>
                <span className="font-medium">{connection.client}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Type:</span>
                <span className="font-medium">{connection.connection_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last Tested:</span>
                <span className="font-medium">
                  {connection.last_tested_at ? new Date(connection.last_tested_at).toLocaleDateString() : 'Never'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => testConnection(connection.id)}
                className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center gap-1"
              >
                <Link2 className="w-3 h-3" />
                Test Connection
              </button>
              <button className="flex-1 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {connections.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No SAP connections configured</p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Add Your First SAP Connection
          </button>
        </div>
      )}
    </div>
  );

  const renderFieldMappings = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Field Mappings</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Mapping
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ARIA Field</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SAP Field</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transformation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fieldMappings.map((mapping) => (
              <tr key={mapping.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mapping.document_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{mapping.aria_field}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{mapping.sap_field}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{mapping.transformation_rule || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {mapping.is_active ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Inactive</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderExportQueue = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Export Queue</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => exportCSV('journal-entries')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export Journal Entries
          </button>
          <button 
            onClick={() => exportCSV('supplier-invoices')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export Supplier Invoices
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900">CSV Export for Manual SAP Upload</h4>
            <p className="text-sm text-blue-800 mt-1">
              Export documents to CSV format for manual upload to SAP using transactions like FB01 (Journal Entries) or MIRO (Supplier Invoices).
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Export Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retry Count</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {exportQueue.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.document_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.document_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.export_method}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.priority}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.retry_count}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.status === 'pending' && (
                    <button className="text-blue-600 hover:text-blue-900">Process</button>
                  )}
                  {item.status === 'failed' && (
                    <button className="text-orange-600 hover:text-orange-900">Retry</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGLMappings = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">GL Account Mappings</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New GL Mapping
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ARIA GL Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SAP GL Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {glMappings.map((mapping) => (
              <tr key={mapping.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">{mapping.aria_gl_account}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{mapping.sap_gl_account}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {mapping.is_active ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Inactive</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">Please select a company to view SAP integration data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SAP Integration</h1>
          <p className="text-gray-600">Connect to SAP ECC and S/4HANA with CSV export for manual upload</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('connections')}
            className={`${
              activeTab === 'connections'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Server className="w-4 h-4" />
            Connections
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            className={`${
              activeTab === 'mappings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Settings className="w-4 h-4" />
            Field Mappings
          </button>
          <button
            onClick={() => setActiveTab('export-queue')}
            className={`${
              activeTab === 'export-queue'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <FileText className="w-4 h-4" />
            Export Queue
          </button>
          <button
            onClick={() => setActiveTab('gl-mappings')}
            className={`${
              activeTab === 'gl-mappings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Database className="w-4 h-4" />
            GL Mappings
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'connections' && renderConnections()}
          {activeTab === 'mappings' && renderFieldMappings()}
          {activeTab === 'export-queue' && renderExportQueue()}
          {activeTab === 'gl-mappings' && renderGLMappings()}
        </>
      )}
    </div>
  );
};

export default SAPIntegration;
