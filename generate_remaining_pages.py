#!/usr/bin/env python3
"""
ARIA v2.0 - Automated Frontend Page Generator
Generates all remaining pages for complete deployment
"""

import os
from pathlib import Path

BASE_DIR = Path("/workspace/project/Aria---Document-Management-Employee/frontend/src/pages")

# Create all necessary directories
DIRECTORIES = [
    "Manufacturing",
    "Quality",
    "Maintenance", 
    "Procurement",
    "Legal",
    "NewBots"
]

for dir_name in DIRECTORIES:
    dir_path = BASE_DIR / dir_name
    dir_path.mkdir(parents=True, exist_ok=True)
    print(f"✅ Created directory: {dir_path}")

# Page templates
PAGES = {
    # Manufacturing Module Pages
    "Manufacturing/BOMManagement.tsx": '''import React, { useState, useEffect } from 'react';
import { Plus, Package, Edit, Trash2 } from 'lucide-react';

const BOMManagement: React.FC = () => {
  const [boms, setBOMs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBOMs();
  }, []);

  const fetchBOMs = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/manufacturing/bom');
      const data = await response.json();
      setBOMs(data.boms || []);
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bill of Materials (BOM)</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage product BOMs and material requirements</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} />
            Create BOM
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total BOMs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{boms.length}</p>
              </div>
              <Package className="text-blue-600" size={32} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">BOM ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                ) : boms.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center">No BOMs found</td></tr>
                ) : (
                  boms.map((bom) => (
                    <tr key={bom.bom_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm">{bom.bom_id}</td>
                      <td className="px-6 py-4 text-sm">{bom.product_name}</td>
                      <td className="px-6 py-4 text-sm">{bom.version}</td>
                      <td className="px-6 py-4 text-sm">{bom.items?.length || 0}</td>
                      <td className="px-6 py-4 text-sm">
                        <button className="text-blue-600 hover:text-blue-900 mr-3"><Edit size={18} /></button>
                        <button className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BOMManagement;
''',

    "Manufacturing/WorkOrders.tsx": '''import React, { useState, useEffect } from 'react';
import { Plus, ClipboardList } from 'lucide-react';

const WorkOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/manufacturing/work-orders');
      const data = await response.json();
      setOrders(data.work_orders || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Work Orders</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track production work orders</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} />
            Create Work Order
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {['pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
            <div key={status} className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{status.replace('_', ' ')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {orders.filter(o => o.status === status).length}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Start Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center">No work orders found</td></tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.order_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm font-medium">{order.order_id}</td>
                      <td className="px-6 py-4 text-sm">{order.product_name}</td>
                      <td className="px-6 py-4 text-sm">{order.quantity}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{new Date(order.start_date).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkOrders;
''',

    "Manufacturing/ManufacturingDashboard.tsx": '''import React, { useState, useEffect } from 'react';
import { Package, ClipboardList, TrendingUp, AlertCircle } from 'lucide-react';

const ManufacturingDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/manufacturing/dashboard');
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Manufacturing Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total BOMs</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboard?.total_boms || 0}
                </p>
              </div>
              <Package className="text-blue-600" size={40} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Work Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboard?.active_work_orders || 0}
                </p>
              </div>
              <ClipboardList className="text-green-600" size={40} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Production Plans</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboard?.production_plans || 0}
                </p>
              </div>
              <TrendingUp className="text-purple-600" size={40} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboard?.pending_orders || 0}
                </p>
              </div>
              <AlertCircle className="text-orange-600" size={40} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <h2 className="text-xl font-bold mb-4">Recent Work Orders</h2>
            <div className="space-y-2">
              {dashboard?.recent_orders?.slice(0, 5).map((order: any) => (
                <div key={order.order_id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div>
                    <p className="font-medium">{order.order_id}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{order.product_name}</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{order.status}</span>
                </div>
              )) || <p className="text-gray-500">No recent orders</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <h2 className="text-xl font-bold mb-4">Production Capacity</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Utilization</span>
                  <span className="text-sm font-medium">{dashboard?.capacity_utilization || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: `${dashboard?.capacity_utilization || 0}%`}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManufacturingDashboard;
''',

    # Quality Management Pages
    "Quality/QualityInspections.tsx": '''import React, { useState, useEffect } from 'react';
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
''',

    "Quality/QualityDashboard.tsx": '''import React, { useState, useEffect } from 'react';
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
''',

    # Maintenance Pages
    "Maintenance/AssetManagement.tsx": '''import React, { useState, useEffect } from 'react';
import { Plus, Wrench } from 'lucide-react';

const AssetManagement: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/maintenance/assets');
      const data = await response.json();
      setAssets(data.assets || []);
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Asset Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage equipment assets</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} />
            Add Asset
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Asset ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">No assets found</td></tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.asset_id}>
                    <td className="px-6 py-4 text-sm font-medium">{asset.asset_id}</td>
                    <td className="px-6 py-4 text-sm">{asset.asset_name}</td>
                    <td className="px-6 py-4 text-sm">{asset.asset_type}</td>
                    <td className="px-6 py-4 text-sm">{asset.location}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{asset.status}</span>
                    </td>
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

export default AssetManagement;
''',

    # Procurement Pages
    "Procurement/RFQManagement.tsx": '''import React, { useState, useEffect } from 'react';
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
''',

    # Legal Pages
    "Legal/TermsOfService.tsx": '''import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Terms of Service</h1>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Last updated: October 27, 2025</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">1. Acceptance of Terms</h2>
          <p>By accessing and using ARIA Platform, you accept and agree to be bound by the terms and provision of this agreement.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">2. Use License</h2>
          <p>Permission is granted to temporarily access ARIA Platform for personal or commercial use according to your subscription tier.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">3. Service Description</h2>
          <p>ARIA Platform provides AI-powered automation bots and ERP modules for business process automation.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">4. Subscription and Payment</h2>
          <p>Subscription fees are billed monthly or annually based on your chosen plan. All fees are non-refundable except as required by law.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">5. Data Privacy</h2>
          <p>We are committed to protecting your data. Please refer to our Privacy Policy for detailed information.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">6. Limitation of Liability</h2>
          <p>ARIA Platform shall not be liable for any indirect, incidental, special, consequential, or punitive damages.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">7. Termination</h2>
          <p>We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">8. Governing Law</h2>
          <p>These Terms shall be governed by the laws of South Africa.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">9. Contact Information</h2>
          <p>For questions about these Terms, please contact us at: support@aria.vantax.co.za</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
''',

    "Legal/PrivacyPolicy.tsx": '''import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Privacy Policy</h1>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Last updated: October 27, 2025</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">1. Information We Collect</h2>
          <p>We collect information you provide directly to us, including name, email, company information, and usage data.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">2. How We Use Your Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our services, and to communicate with you.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">3. Information Sharing</h2>
          <p>We do not sell, trade, or rent your personal information to third parties.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">4. Data Security</h2>
          <p>We implement appropriate security measures to protect your personal information, including SSL encryption and secure data storage.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">5. POPIA Compliance</h2>
          <p>We comply with South Africa's Protection of Personal Information Act (POPIA) and GDPR where applicable.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">6. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal information. Contact us to exercise these rights.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">7. Cookies</h2>
          <p>We use cookies to enhance your experience. You can control cookies through your browser settings.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">8. Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">9. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us at: privacy@aria.vantax.co.za</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
''',

    # Pricing Page
    "PricingComplete.tsx": '''import React from 'react';
import { Check, X } from 'lucide-react';

const PricingComplete: React.FC = () => {
  const tiers = [
    {
      name: 'Free',
      price: 'R0',
      period: '/month',
      description: 'Perfect for trying out ARIA',
      features: [
        { text: '5 bots active', included: true },
        { text: '3 users', included: true },
        { text: '1 organization', included: true },
        { text: 'Community support', included: true },
        { text: 'Basic analytics', included: false },
        { text: 'API access', included: false },
        { text: 'Priority support', included: false },
      ],
      cta: 'Get Started Free',
      popular: false
    },
    {
      name: 'Starter',
      price: 'R499',
      period: '/month',
      description: 'For small businesses',
      features: [
        { text: '20 bots active', included: true },
        { text: '10 users', included: true },
        { text: '1 organization', included: true },
        { text: 'Email support (24h)', included: true },
        { text: 'Basic analytics', included: true },
        { text: 'API access', included: false },
        { text: 'Priority support', included: false },
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      name: 'Professional',
      price: 'R1,999',
      period: '/month',
      description: 'For growing companies',
      features: [
        { text: '44 bots active', included: true },
        { text: '50 users', included: true },
        { text: '3 organizations', included: true },
        { text: 'Priority support (8h)', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'API access', included: true },
        { text: 'Custom workflows', included: true },
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'R4,999',
      period: '/month',
      description: 'For large organizations',
      features: [
        { text: 'All 59 bots active', included: true },
        { text: 'Unlimited users', included: true },
        { text: 'Unlimited organizations', included: true },
        { text: '24/7 support (1h response)', included: true },
        { text: 'Complete ERP suite', included: true },
        { text: 'Custom integrations', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'On-premise option', included: true },
      ],
      cta: 'Contact Sales',
      popular: false
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Choose the plan that fits your business needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 ${
                tier.popular ? 'ring-2 ring-blue-600 scale-105' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-lg rounded-tr-2xl text-sm font-semibold">
                  Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {tier.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{tier.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {tier.price}
                </span>
                <span className="text-gray-600 dark:text-gray-400">{tier.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    {feature.included ? (
                      <Check className="text-green-500 mr-2 flex-shrink-0 mt-0.5" size={20} />
                    ) : (
                      <X className="text-gray-400 mr-2 flex-shrink-0 mt-0.5" size={20} />
                    )}
                    <span className={`text-sm ${
                      feature.included ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                    }`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                tier.popular
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}>
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            All plans include 14-day free trial • No credit card required
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Need a custom plan? <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold">Contact our sales team</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingComplete;
'''
}

# Generate all pages
for filename, content in PAGES.items():
    filepath = BASE_DIR / filename
    filepath.parent.mkdir(parents=True, exist_ok=True)
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✅ Created: {filename}")

print("\n" + "="*60)
print("✅ ALL PAGES GENERATED SUCCESSFULLY!")
print("="*60)
print(f"\nTotal pages created: {len(PAGES)}")
print("\nPages by category:")
print(f"  - Manufacturing: 3 pages")
print(f"  - Quality: 2 pages") 
print(f"  - Maintenance: 1 page")
print(f"  - Procurement: 1 page")
print(f"  - Legal: 2 pages")
print(f"  - Pricing: 1 page")
print("\n" + "="*60)
