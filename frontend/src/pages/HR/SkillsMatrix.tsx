import React, { useState } from 'react';
import { Plus, Edit2, Award, Users, TrendingUp, Target } from 'lucide-react';

interface EmployeeSkill {
  employee: string;
  department: string;
  skills: Record<string, number>;
}

const SkillsMatrix: React.FC = () => {
  const skills = ['JavaScript', 'Python', 'SQL', 'Project Management', 'Communication', 'Leadership', 'Excel', 'Data Analysis'];
  
  const [employees] = useState<EmployeeSkill[]>([
    { employee: 'John Smith', department: 'IT', skills: { 'JavaScript': 5, 'Python': 4, 'SQL': 4, 'Project Management': 3, 'Communication': 4, 'Leadership': 3, 'Excel': 3, 'Data Analysis': 4 } },
    { employee: 'Sarah Johnson', department: 'Finance', skills: { 'JavaScript': 1, 'Python': 2, 'SQL': 4, 'Project Management': 4, 'Communication': 5, 'Leadership': 4, 'Excel': 5, 'Data Analysis': 5 } },
    { employee: 'Mike Brown', department: 'Sales', skills: { 'JavaScript': 1, 'Python': 1, 'SQL': 2, 'Project Management': 3, 'Communication': 5, 'Leadership': 4, 'Excel': 4, 'Data Analysis': 3 } },
    { employee: 'Tom Wilson', department: 'IT', skills: { 'JavaScript': 5, 'Python': 5, 'SQL': 5, 'Project Management': 4, 'Communication': 3, 'Leadership': 4, 'Excel': 3, 'Data Analysis': 4 } },
    { employee: 'Lisa Davis', department: 'HR', skills: { 'JavaScript': 1, 'Python': 1, 'SQL': 2, 'Project Management': 4, 'Communication': 5, 'Leadership': 5, 'Excel': 4, 'Data Analysis': 3 } },
    { employee: 'Anna Lee', department: 'IT', skills: { 'JavaScript': 4, 'Python': 3, 'SQL': 4, 'Project Management': 2, 'Communication': 3, 'Leadership': 2, 'Excel': 3, 'Data Analysis': 3 } },
  ]);

  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const departments = ['All', 'IT', 'Finance', 'Sales', 'HR', 'Operations'];

  const getSkillColor = (level: number) => {
    if (level >= 5) return { bg: '#dcfce7', text: '#166534' };
    if (level >= 4) return { bg: '#dbeafe', text: '#1e40af' };
    if (level >= 3) return { bg: '#fef3c7', text: '#92400e' };
    if (level >= 2) return { bg: '#fee2e2', text: '#991b1b' };
    return { bg: '#f3f4f6', text: '#6b7280' };
  };

  const getSkillLabel = (level: number) => {
    const labels = ['', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'];
    return labels[level] || '';
  };

  const filteredEmployees = selectedDepartment === 'All' 
    ? employees 
    : employees.filter(e => e.department === selectedDepartment);

  const calculateSkillAverage = (skill: string) => {
    const total = filteredEmployees.reduce((acc, e) => acc + (e.skills[skill] || 0), 0);
    return (total / filteredEmployees.length).toFixed(1);
  };

  const totalSkillGaps = filteredEmployees.reduce((acc, e) => {
    return acc + Object.values(e.skills).filter(s => s < 3).length;
  }, 0);

  const expertCount = filteredEmployees.reduce((acc, e) => {
    return acc + Object.values(e.skills).filter(s => s >= 5).length;
  }, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Skills Matrix</h1>
        <p style={{ color: '#6b7280' }}>Track employee skills and identify training needs</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Users size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Employees</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{filteredEmployees.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><Award size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Expert Skills</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{expertCount}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><Target size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Skill Gaps</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{totalSkillGaps}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><TrendingUp size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Skills Tracked</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{skills.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              style={{
                padding: '8px 16px',
                border: selectedDepartment === dept ? '2px solid #2563eb' : '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: selectedDepartment === dept ? '#eff6ff' : 'white',
                color: selectedDepartment === dept ? '#2563eb' : '#374151',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {dept}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#dcfce7' }} /> Expert (5)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#dbeafe' }} /> Advanced (4)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#fef3c7' }} /> Intermediate (3)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#fee2e2' }} /> Basic (2)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f3f4f6' }} /> Beginner (1)</span>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', position: 'sticky', left: 0, backgroundColor: '#f9fafb' }}>Employee</th>
              {skills.map(skill => (
                <th key={skill} style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', minWidth: '100px' }}>{skill}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', position: 'sticky', left: 0, backgroundColor: 'white' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{employee.employee}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{employee.department}</div>
                </td>
                {skills.map(skill => {
                  const level = employee.skills[skill] || 0;
                  const color = getSkillColor(level);
                  return (
                    <td key={skill} style={{ padding: '8px', textAlign: 'center' }}>
                      <div
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          backgroundColor: color.bg,
                          color: color.text,
                          fontWeight: 600,
                          fontSize: '14px'
                        }}
                        title={getSkillLabel(level)}
                      >
                        {level}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#111827', position: 'sticky', left: 0, backgroundColor: '#f9fafb' }}>Team Average</td>
              {skills.map(skill => (
                <td key={skill} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold', color: '#2563eb' }}>
                  {calculateSkillAverage(skill)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SkillsMatrix;
