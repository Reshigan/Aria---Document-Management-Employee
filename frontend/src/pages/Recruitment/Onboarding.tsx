import React, { useState } from 'react';
import { Plus, Edit2, CheckCircle, Clock, User, FileText, Briefcase, Calendar } from 'lucide-react';

interface OnboardingTask {
  id: number;
  task: string;
  category: string;
  completed: boolean;
}

interface OnboardingRecord {
  id: number;
  employee_name: string;
  position: string;
  department: string;
  start_date: string;
  manager: string;
  buddy: string;
  tasks_completed: number;
  tasks_total: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  tasks: OnboardingTask[];
}

const Onboarding: React.FC = () => {
  const [records, setRecords] = useState<OnboardingRecord[]>([
    { 
      id: 1, 
      employee_name: 'Emma Williams', 
      position: 'Senior Software Engineer', 
      department: 'IT', 
      start_date: '2026-02-01', 
      manager: 'Tom Wilson', 
      buddy: 'David Chen',
      tasks_completed: 8,
      tasks_total: 12,
      status: 'IN_PROGRESS',
      tasks: [
        { id: 1, task: 'Complete employment contract', category: 'Documentation', completed: true },
        { id: 2, task: 'Submit ID and tax documents', category: 'Documentation', completed: true },
        { id: 3, task: 'Set up workstation', category: 'IT Setup', completed: true },
        { id: 4, task: 'Create email account', category: 'IT Setup', completed: true },
        { id: 5, task: 'System access provisioning', category: 'IT Setup', completed: true },
        { id: 6, task: 'Company orientation', category: 'Training', completed: true },
        { id: 7, task: 'Department introduction', category: 'Training', completed: true },
        { id: 8, task: 'Safety training', category: 'Training', completed: true },
        { id: 9, task: 'Meet with HR', category: 'Meetings', completed: false },
        { id: 10, task: 'Meet with manager', category: 'Meetings', completed: false },
        { id: 11, task: 'Team introduction', category: 'Meetings', completed: false },
        { id: 12, task: '30-day review scheduled', category: 'Review', completed: false },
      ]
    },
    { 
      id: 2, 
      employee_name: 'Michael Brown', 
      position: 'Operations Manager', 
      department: 'Operations', 
      start_date: '2026-02-15', 
      manager: 'Mary Johnson', 
      buddy: 'Peter Williams',
      tasks_completed: 3,
      tasks_total: 12,
      status: 'IN_PROGRESS',
      tasks: []
    },
    { 
      id: 3, 
      employee_name: 'Sarah Johnson', 
      position: 'Financial Analyst', 
      department: 'Finance', 
      start_date: '2026-03-01', 
      manager: 'Sarah Johnson', 
      buddy: 'Mike Brown',
      tasks_completed: 0,
      tasks_total: 12,
      status: 'NOT_STARTED',
      tasks: []
    },
  ]);
  const [selectedRecord, setSelectedRecord] = useState<OnboardingRecord | null>(null);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      NOT_STARTED: { bg: '#f3f4f6', text: '#374151', icon: <Clock size={14} /> },
      IN_PROGRESS: { bg: '#fef3c7', text: '#92400e', icon: <Clock size={14} /> },
      COMPLETED: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> }
    };
    const c = config[status] || config.NOT_STARTED;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status.replace('_', ' ')}</span>;
  };

  const handleToggleTask = (recordId: number, taskId: number) => {
    setRecords(records.map(r => {
      if (r.id === recordId) {
        const updatedTasks = r.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
        const completed = updatedTasks.filter(t => t.completed).length;
        return {
          ...r,
          tasks: updatedTasks,
          tasks_completed: completed,
          status: completed === r.tasks_total ? 'COMPLETED' as const : completed > 0 ? 'IN_PROGRESS' as const : 'NOT_STARTED' as const
        };
      }
      return r;
    }));
    if (selectedRecord && selectedRecord.id === recordId) {
      const updated = records.find(r => r.id === recordId);
      if (updated) setSelectedRecord(updated);
    }
  };

  const inProgress = records.filter(r => r.status === 'IN_PROGRESS').length;
  const notStarted = records.filter(r => r.status === 'NOT_STARTED').length;
  const completed = records.filter(r => r.status === 'COMPLETED').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Employee Onboarding</h1>
        <p style={{ color: '#6b7280' }}>Track new employee onboarding progress and tasks</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><User size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total New Hires</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{records.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Clock size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>In Progress</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{inProgress}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '10px' }}><FileText size={24} style={{ color: '#6b7280' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Not Started</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>{notStarted}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Completed</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{completed}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedRecord ? '1fr 1fr' : '1fr', gap: '24px' }}>
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>New Hires</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {records.map((record) => {
              const progress = (record.tasks_completed / record.tasks_total) * 100;
              return (
                <div
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    padding: '20px',
                    cursor: 'pointer',
                    border: selectedRecord?.id === record.id ? '2px solid #2563eb' : '2px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{record.employee_name}</div>
                      <div style={{ fontSize: '14px', color: '#2563eb' }}>{record.position}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{record.department}</div>
                    </div>
                    {getStatusBadge(record.status)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Calendar size={14} style={{ color: '#6b7280' }} />
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Start: {record.start_date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', backgroundColor: progress >= 100 ? '#10b981' : '#2563eb', borderRadius: '4px' }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{record.tasks_completed}/{record.tasks_total}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedRecord && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{selectedRecord.employee_name}</h3>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>{selectedRecord.position} | {selectedRecord.department}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Manager</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{selectedRecord.manager}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Buddy</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{selectedRecord.buddy}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>Onboarding Tasks</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedRecord.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(selectedRecord.id, task.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: task.completed ? '#f0fdf4' : '#f9fafb',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: task.completed ? 'none' : '2px solid #d1d5db',
                    backgroundColor: task.completed ? '#10b981' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {task.completed && <CheckCircle size={14} color="white" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', color: task.completed ? '#6b7280' : '#111827', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.task}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{task.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
