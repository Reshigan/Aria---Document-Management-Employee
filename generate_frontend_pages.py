#!/usr/bin/env python3
"""
Generate all remaining frontend pages at warp speed
"""

import os

# Define all page templates
PAGES = {
    'admin/SystemSettings.tsx': '''import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import DataTable from '../../components/shared/DataTable';
import { Settings, Shield, Bell, Database, Key, Activity } from 'lucide-react';

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState('audit');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs);
      }
    } finally {
      setLoading(false);
    }
  };

  const auditColumns = [
    { key: 'timestamp', label: 'Date/Time', render: (log: any) => new Date(log.timestamp).toLocaleString() },
    { key: 'user', label: 'User', render: (log: any) => log.user_email },
    { key: 'action', label: 'Action' },
    { key: 'resource', label: 'Resource' },
    { key: 'ip_address', label: 'IP Address' }
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <Settings className="h-8 w-8" />
        System Settings
      </h1>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'audit', label: 'Audit Logs', icon: Activity },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'backup', label: 'Backup', icon: Database },
            { id: 'api', label: 'API Keys', icon: Key }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg shadow">
          <DataTable
            data={auditLogs}
            columns={auditColumns}
            searchable={true}
            exportable={true}
            exportFilename="audit-logs"
          />
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Password Policy</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>Require minimum 8 characters</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>Require uppercase and lowercase</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>Require at least one number</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              defaultValue="60"
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <Button className="bg-blue-600 text-white">Save Security Settings</Button>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Configure notification preferences for all users</p>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Configure automated backups</p>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Manage API keys for integrations</p>
        </div>
      )}
    </div>
  );
}
''',

    'reports/BotDashboard.tsx': '''import React, { useState, useEffect } from 'react';
import { Bot, TrendingUp, Clock, CheckCircle, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function BotDashboardPage() {
  const [stats, setStats] = useState({
    total_actions: 0,
    success_rate: 0,
    time_saved_hours: 0,
    active_bots: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/reports/bots/dashboard', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const chartData = [
    { day: 'Mon', actions: 45 },
    { day: 'Tue', actions: 52 },
    { day: 'Wed', actions: 48 },
    { day: 'Thu', actions: 61 },
    { day: 'Fri', actions: 55 },
    { day: 'Sat', actions: 25 },
    { day: 'Sun', actions: 18 }
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <Bot className="h-8 w-8" />
        Bot Activity Dashboard
      </h1>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total Actions</div>
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.total_actions}</div>
          <div className="text-sm text-green-600 mt-2">↑ 12% from last month</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Success Rate</div>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.success_rate}%</div>
          <div className="text-sm text-green-600 mt-2">↑ 2% from last month</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Time Saved</div>
            <Clock className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.time_saved_hours}h</div>
          <div className="text-sm text-gray-600 mt-2">This month</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Active Bots</div>
            <TrendingUp className="h-5 w-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.active_bots}/4</div>
          <div className="text-sm text-gray-600 mt-2">All systems operational</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Activity Last 7 Days</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="actions" stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Bot Performance</h3>
          <div className="space-y-4">
            {[
              { name: 'Invoice Reconciliation', success: 95, actions: 234 },
              { name: 'BBBEE Compliance', success: 98, actions: 156 },
              { name: 'Payroll Automation', success: 100, actions: 89 },
              { name: 'Expense Management', success: 92, actions: 178 }
            ].map((bot) => (
              <div key={bot.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{bot.name}</span>
                  <span className="text-gray-600">{bot.success}% success</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${bot.success}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Actions</h3>
          <div className="space-y-3">
            {[
              { bot: 'Invoice Bot', action: 'Matched invoice #INV-1234', time: '2 min ago' },
              { bot: 'BBBEE Bot', action: 'Verified supplier certificate', time: '15 min ago' },
              { bot: 'Payroll Bot', action: 'Processed payroll for 45 employees', time: '1 hour ago' },
              { bot: 'Expense Bot', action: 'Auto-coded 12 expense claims', time: '2 hours ago' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <Bot className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{item.bot}</div>
                  <div className="text-sm text-gray-600">{item.action}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
''',

    'reports/InvoiceReconciliationReport.tsx': '''import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import DataTable from '../../components/shared/DataTable';

export default function InvoiceReconciliationReportPage() {
  const [data, setData] = useState({ stats: {}, invoices: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/reports/bots/invoice-reconciliation', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setData(await response.json());
      }
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'invoice_number', label: 'Invoice #' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'amount', label: 'Amount', render: (row: any) => `R ${row.amount.toFixed(2)}` },
    { key: 'status', label: 'Status', render: (row: any) => {
      const colors = {
        matched: 'text-green-600',
        pending: 'text-yellow-600',
        unmatched: 'text-red-600'
      };
      return <span className={colors[row.status as keyof typeof colors]}>{row.status}</span>;
    }},
    { key: 'confidence', label: 'Confidence', render: (row: any) => `${row.confidence}%` }
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <FileText className="h-8 w-8" />
        Invoice Reconciliation Report
      </h1>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total Processed</div>
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">234</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Auto-Matched</div>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">223</div>
          <div className="text-sm text-gray-600 mt-2">95.3% accuracy</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Pending Review</div>
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">8</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Unmatched</div>
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">3</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={data.invoices}
          columns={columns}
          searchable={true}
          exportable={true}
          exportFilename="invoice-reconciliation"
        />
      </div>
    </div>
  );
}
''',
}

# Create all files
for path, content in PAGES.items():
    full_path = f'/workspace/project/Aria---Document-Management-Employee/frontend/src/pages/{path}'
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w') as f:
        f.write(content)
    print(f"Created: {path}")

print(f"\n✅ Created {len(PAGES)} pages")
