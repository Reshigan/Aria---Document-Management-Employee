import React, { useState } from 'react';
import { Users, ChevronDown, ChevronRight, Building2, User } from 'lucide-react';

interface OrgNode {
  id: number;
  name: string;
  title: string;
  department: string;
  email: string;
  photo?: string;
  children: OrgNode[];
  expanded?: boolean;
}

const OrgChart: React.FC = () => {
  const [orgData, setOrgData] = useState<OrgNode>({
    id: 1,
    name: 'John Smith',
    title: 'CEO',
    department: 'Executive',
    email: 'john.smith@company.co.za',
    expanded: true,
    children: [
      {
        id: 2,
        name: 'Sarah Johnson',
        title: 'CFO',
        department: 'Finance',
        email: 'sarah.johnson@company.co.za',
        expanded: true,
        children: [
          { id: 6, name: 'Mike Brown', title: 'Finance Manager', department: 'Finance', email: 'mike.brown@company.co.za', children: [] },
          { id: 7, name: 'Lisa Davis', title: 'Accountant', department: 'Finance', email: 'lisa.davis@company.co.za', children: [] },
        ]
      },
      {
        id: 3,
        name: 'Tom Wilson',
        title: 'CTO',
        department: 'IT',
        email: 'tom.wilson@company.co.za',
        expanded: true,
        children: [
          { id: 8, name: 'Anna Lee', title: 'IT Manager', department: 'IT', email: 'anna.lee@company.co.za', children: [
            { id: 12, name: 'David Chen', title: 'Software Engineer', department: 'IT', email: 'david.chen@company.co.za', children: [] },
            { id: 13, name: 'Emma White', title: 'Software Engineer', department: 'IT', email: 'emma.white@company.co.za', children: [] },
          ] },
        ]
      },
      {
        id: 4,
        name: 'Mary Johnson',
        title: 'COO',
        department: 'Operations',
        email: 'mary.johnson@company.co.za',
        expanded: true,
        children: [
          { id: 9, name: 'Peter Williams', title: 'Operations Manager', department: 'Operations', email: 'peter.williams@company.co.za', children: [] },
          { id: 10, name: 'Jane Smith', title: 'Production Manager', department: 'Manufacturing', email: 'jane.smith@company.co.za', children: [] },
        ]
      },
      {
        id: 5,
        name: 'Robert Brown',
        title: 'HR Director',
        department: 'HR',
        email: 'robert.brown@company.co.za',
        expanded: true,
        children: [
          { id: 11, name: 'Susan Miller', title: 'HR Manager', department: 'HR', email: 'susan.miller@company.co.za', children: [] },
        ]
      },
    ]
  });

  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  const toggleExpand = (node: OrgNode) => {
    const updateNode = (n: OrgNode): OrgNode => {
      if (n.id === node.id) {
        return { ...n, expanded: !n.expanded };
      }
      return { ...n, children: n.children.map(updateNode) };
    };
    setOrgData(updateNode(orgData));
  };

  const countEmployees = (node: OrgNode): number => {
    return 1 + node.children.reduce((acc, child) => acc + countEmployees(child), 0);
  };

  const renderTreeNode = (node: OrgNode, level: number = 0) => {
    const hasChildren = node.children.length > 0;
    
    return (
      <div key={node.id} style={{ marginLeft: level > 0 ? '40px' : '0' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '16px', 
          backgroundColor: level === 0 ? '#eff6ff' : 'white', 
          borderRadius: '12px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '12px',
          border: level === 0 ? '2px solid #2563eb' : '1px solid #e5e7eb'
        }}>
          {hasChildren && (
            <button onClick={() => toggleExpand(node)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
              {node.expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          )}
          {!hasChildren && <div style={{ width: '28px' }} />}
          
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            backgroundColor: '#e0e7ff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#4f46e5',
            fontWeight: 'bold',
            fontSize: '16px'
          }}>
            {node.name.split(' ').map(n => n[0]).join('')}
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{node.name}</div>
            <div style={{ fontSize: '14px', color: '#2563eb', fontWeight: 500 }}>{node.title}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{node.department}</div>
          </div>
          
          {hasChildren && (
            <div style={{ 
              padding: '4px 8px', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '9999px', 
              fontSize: '12px', 
              color: '#6b7280',
              fontWeight: 600
            }}>
              {node.children.length} direct reports
            </div>
          )}
        </div>
        
        {node.expanded && hasChildren && (
          <div style={{ borderLeft: '2px solid #e5e7eb', marginLeft: '24px', paddingLeft: '0' }}>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const flattenOrg = (node: OrgNode, level: number = 0): Array<OrgNode & { level: number }> => {
    const result: Array<OrgNode & { level: number }> = [{ ...node, level }];
    node.children.forEach(child => {
      result.push(...flattenOrg(child, level + 1));
    });
    return result;
  };

  const totalEmployees = countEmployees(orgData);
  const departments = new Set<string>();
  const collectDepartments = (node: OrgNode) => {
    departments.add(node.department);
    node.children.forEach(collectDepartments);
  };
  collectDepartments(orgData);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Organization Chart</h1>
        <p style={{ color: '#6b7280' }}>View and navigate the organizational structure</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Users size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Employees</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{totalEmployees}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><Building2 size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Departments</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{departments.size}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><User size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Management Levels</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>4</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('tree')}
            style={{
              padding: '8px 16px',
              border: viewMode === 'tree' ? '2px solid #2563eb' : '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: viewMode === 'tree' ? '#eff6ff' : 'white',
              color: viewMode === 'tree' ? '#2563eb' : '#374151',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Tree View
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '8px 16px',
              border: viewMode === 'list' ? '2px solid #2563eb' : '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: viewMode === 'list' ? '#eff6ff' : 'white',
              color: viewMode === 'list' ? '#2563eb' : '#374151',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            List View
          </button>
        </div>
      </div>

      {viewMode === 'tree' ? (
        <div style={{ backgroundColor: '#f9fafb', padding: '24px', borderRadius: '12px' }}>
          {renderTreeNode(orgData)}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Employee</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Title</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Department</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Level</th>
              </tr>
            </thead>
            <tbody>
              {flattenOrg(orgData).map((node) => (
                <tr key={node.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: `${node.level * 20}px` }}>
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        backgroundColor: '#e0e7ff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#4f46e5',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        {node.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{node.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#2563eb', fontWeight: 500 }}>{node.title}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{node.department}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{node.email}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{node.level + 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrgChart;
