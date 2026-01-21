import React, { useState } from 'react';
import { Search, Filter, Download, Eye, Clock, User, FileText, Edit2, Trash2, Plus } from 'lucide-react';

interface AuditEntry {
  id: number;
  timestamp: string;
  user: string;
  user_email: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'REJECT';
  module: string;
  entity: string;
  entity_id: string;
  description: string;
  ip_address: string;
  changes: string | null;
}

const AuditTrail: React.FC = () => {
  const [entries] = useState<AuditEntry[]>([
    { id: 1, timestamp: '2026-01-21 09:45:23', user: 'John Smith', user_email: 'john@company.co.za', action: 'UPDATE', module: 'Invoices', entity: 'Invoice', entity_id: 'INV-2026-0045', description: 'Updated invoice status to Paid', ip_address: '192.168.1.100', changes: 'status: PENDING → PAID' },
    { id: 2, timestamp: '2026-01-21 09:30:15', user: 'Sarah Johnson', user_email: 'sarah@company.co.za', action: 'CREATE', module: 'Customers', entity: 'Customer', entity_id: 'CUST-0089', description: 'Created new customer: ABC Manufacturing', ip_address: '192.168.1.105', changes: null },
    { id: 3, timestamp: '2026-01-21 09:15:42', user: 'Mike Brown', user_email: 'mike@company.co.za', action: 'APPROVE', module: 'Purchase Orders', entity: 'PO', entity_id: 'PO-2026-0023', description: 'Approved purchase order for R 45,000', ip_address: '192.168.1.110', changes: 'status: PENDING_APPROVAL → APPROVED' },
    { id: 4, timestamp: '2026-01-21 09:00:00', user: 'Tom Wilson', user_email: 'tom@company.co.za', action: 'LOGIN', module: 'Authentication', entity: 'Session', entity_id: 'SES-8834', description: 'User logged in successfully', ip_address: '192.168.1.115', changes: null },
    { id: 5, timestamp: '2026-01-21 08:45:30', user: 'Lisa Davis', user_email: 'lisa@company.co.za', action: 'EXPORT', module: 'Reports', entity: 'Report', entity_id: 'RPT-SALES-JAN', description: 'Exported Sales Report to PDF', ip_address: '192.168.1.120', changes: null },
    { id: 6, timestamp: '2026-01-21 08:30:18', user: 'John Smith', user_email: 'john@company.co.za', action: 'DELETE', module: 'Products', entity: 'Product', entity_id: 'PROD-0156', description: 'Deleted product: Old Widget (discontinued)', ip_address: '192.168.1.100', changes: null },
    { id: 7, timestamp: '2026-01-21 08:15:05', user: 'Sarah Johnson', user_email: 'sarah@company.co.za', action: 'VIEW', module: 'Payroll', entity: 'Payslip', entity_id: 'PS-2026-01-045', description: 'Viewed employee payslip', ip_address: '192.168.1.105', changes: null },
    { id: 8, timestamp: '2026-01-21 08:00:00', user: 'System', user_email: 'system@aria.local', action: 'CREATE', module: 'Automation', entity: 'Bot Run', entity_id: 'BOT-INV-001', description: 'Invoice Reminder Bot executed - 5 reminders sent', ip_address: '127.0.0.1', changes: null },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('All');
  const [selectedModule, setSelectedModule] = useState('All');

  const actions = ['All', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT'];
  const modules = ['All', 'Invoices', 'Customers', 'Purchase Orders', 'Authentication', 'Reports', 'Products', 'Payroll', 'Automation'];

  const getActionIcon = (action: string) => {
    const icons: Record<string, React.ReactNode> = {
      CREATE: <Plus size={14} />,
      UPDATE: <Edit2 size={14} />,
      DELETE: <Trash2 size={14} />,
      VIEW: <Eye size={14} />,
      EXPORT: <Download size={14} />,
      LOGIN: <User size={14} />,
      LOGOUT: <User size={14} />,
      APPROVE: <FileText size={14} />,
      REJECT: <FileText size={14} />
    };
    return icons[action] || <FileText size={14} />;
  };

  const getActionBadge = (action: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      CREATE: { bg: '#dcfce7', text: '#166534' },
      UPDATE: { bg: '#dbeafe', text: '#1e40af' },
      DELETE: { bg: '#fee2e2', text: '#991b1b' },
      VIEW: { bg: '#f3f4f6', text: '#374151' },
      EXPORT: { bg: '#e0e7ff', text: '#3730a3' },
      LOGIN: { bg: '#dcfce7', text: '#166534' },
      LOGOUT: { bg: '#fef3c7', text: '#92400e' },
      APPROVE: { bg: '#dcfce7', text: '#166534' },
      REJECT: { bg: '#fee2e2', text: '#991b1b' }
    };
    const c = config[action] || config.VIEW;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>
        {getActionIcon(action)} {action}
      </span>
    );
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.entity_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = selectedAction === 'All' || e.action === selectedAction;
    const matchesModule = selectedModule === 'All' || e.module === selectedModule;
    return matchesSearch && matchesAction && matchesModule;
  });

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Audit Trail</h1>
        <p style={{ color: '#6b7280' }}>Track all system activities and changes for compliance</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><FileText size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Events</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{entries.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><Plus size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Creates</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{entries.filter(e => e.action === 'CREATE').length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '10px' }}><Edit2 size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Updates</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{entries.filter(e => e.action === 'UPDATE').length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><Trash2 size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Deletes</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{entries.filter(e => e.action === 'DELETE').length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search by description, user, or entity ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 44px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
        >
          {actions.map(action => (
            <option key={action} value={action}>{action === 'All' ? 'All Actions' : action}</option>
          ))}
        </select>
        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
        >
          {modules.map(module => (
            <option key={module} value={module}>{module === 'All' ? 'All Modules' : module}</option>
          ))}
        </select>
        <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Download size={16} /> Export
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Timestamp</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>User</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Module</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={14} style={{ color: '#9ca3af' }} />
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>{entry.timestamp}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{entry.user}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{entry.user_email}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>{getActionBadge(entry.action)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{entry.module}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', color: '#111827' }}>{entry.description}</div>
                  {entry.changes && (
                    <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', marginTop: '4px' }}>{entry.changes}</div>
                  )}
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{entry.entity_id}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', fontFamily: 'monospace' }}>{entry.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditTrail;
