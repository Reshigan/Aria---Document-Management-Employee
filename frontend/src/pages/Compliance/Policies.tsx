import React, { useState } from 'react';
import { Search, Eye, Download, FileText, Shield, Users, Calendar, CheckCircle } from 'lucide-react';

interface Policy {
  id: number;
  code: string;
  title: string;
  category: string;
  description: string;
  version: string;
  effective_date: string;
  owner: string;
  acknowledgements: number;
  total_employees: number;
  last_updated: string;
}

const Policies: React.FC = () => {
  const [policies] = useState<Policy[]>([
    { id: 1, code: 'POL-001', title: 'Code of Conduct', category: 'HR', description: 'Employee behavior and ethical standards', version: '3.0', effective_date: '2025-01-01', owner: 'HR Director', acknowledgements: 145, total_employees: 150, last_updated: '2024-12-15' },
    { id: 2, code: 'POL-002', title: 'Information Security Policy', category: 'IT', description: 'Data protection and cybersecurity guidelines', version: '2.5', effective_date: '2025-03-01', owner: 'IT Manager', acknowledgements: 148, total_employees: 150, last_updated: '2025-02-20' },
    { id: 3, code: 'POL-003', title: 'POPIA Compliance Policy', category: 'Compliance', description: 'Personal information protection requirements', version: '2.0', effective_date: '2025-07-01', owner: 'Compliance Officer', acknowledgements: 150, total_employees: 150, last_updated: '2025-06-25' },
    { id: 4, code: 'POL-004', title: 'Anti-Bribery & Corruption', category: 'Compliance', description: 'Prevention of bribery and corrupt practices', version: '1.5', effective_date: '2024-06-01', owner: 'Legal Counsel', acknowledgements: 142, total_employees: 150, last_updated: '2024-05-15' },
    { id: 5, code: 'POL-005', title: 'Health & Safety Policy', category: 'Operations', description: 'Workplace health and safety requirements', version: '4.0', effective_date: '2025-01-15', owner: 'Safety Officer', acknowledgements: 150, total_employees: 150, last_updated: '2025-01-10' },
    { id: 6, code: 'POL-006', title: 'Leave Policy', category: 'HR', description: 'Annual, sick, and special leave entitlements', version: '2.0', effective_date: '2025-01-01', owner: 'HR Director', acknowledgements: 150, total_employees: 150, last_updated: '2024-12-20' },
    { id: 7, code: 'POL-007', title: 'Remote Work Policy', category: 'HR', description: 'Guidelines for working from home', version: '1.5', effective_date: '2024-03-01', owner: 'HR Director', acknowledgements: 138, total_employees: 150, last_updated: '2024-02-25' },
    { id: 8, code: 'POL-008', title: 'Procurement Policy', category: 'Finance', description: 'Purchasing and vendor management guidelines', version: '2.0', effective_date: '2025-04-01', owner: 'CFO', acknowledgements: 45, total_employees: 50, last_updated: '2025-03-20' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'HR', 'IT', 'Compliance', 'Finance', 'Operations'];

  const filteredPolicies = policies.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      HR: <Users size={20} />,
      IT: <Shield size={20} />,
      Compliance: <FileText size={20} />,
      Finance: <FileText size={20} />,
      Operations: <FileText size={20} />
    };
    return icons[category] || <FileText size={20} />;
  };

  const getAcknowledgementPercentage = (ack: number, total: number) => {
    return Math.round((ack / total) * 100);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Company Policies</h1>
        <p style={{ color: '#6b7280' }}>View and acknowledge company policies and procedures</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><FileText size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Policies</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{policies.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Fully Acknowledged</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{policies.filter(p => p.acknowledgements === p.total_employees).length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Users size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending Ack.</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{policies.filter(p => p.acknowledgements < p.total_employees).length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><Calendar size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Updated This Year</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{policies.filter(p => p.last_updated.startsWith('2025') || p.last_updated.startsWith('2026')).length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search policies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 44px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 16px',
                border: selectedCategory === cat ? '2px solid #2563eb' : '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: selectedCategory === cat ? '#eff6ff' : 'white',
                color: selectedCategory === cat ? '#2563eb' : '#374151',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {filteredPolicies.map((policy) => {
          const ackPercentage = getAcknowledgementPercentage(policy.acknowledgements, policy.total_employees);
          return (
            <div key={policy.id} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '8px', color: '#6b7280' }}>
                    {getCategoryIcon(policy.category)}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{policy.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{policy.code} | v{policy.version}</div>
                  </div>
                </div>
                <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', backgroundColor: '#f3f4f6', color: '#374151' }}>{policy.category}</span>
              </div>
              
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>{policy.description}</p>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Acknowledgements</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: ackPercentage === 100 ? '#10b981' : '#f59e0b' }}>{policy.acknowledgements}/{policy.total_employees} ({ackPercentage}%)</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${ackPercentage}%`, height: '100%', backgroundColor: ackPercentage === 100 ? '#10b981' : '#f59e0b', borderRadius: '3px' }} />
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  Effective: {policy.effective_date} | Owner: {policy.owner}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                    <Eye size={14} /> View
                  </button>
                  <button style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Policies;
