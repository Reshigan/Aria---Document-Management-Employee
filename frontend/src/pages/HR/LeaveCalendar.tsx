import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Users, Sun, Briefcase } from 'lucide-react';

interface LeaveEntry {
  id: number;
  employee: string;
  department: string;
  leave_type: 'ANNUAL' | 'SICK' | 'FAMILY' | 'STUDY' | 'MATERNITY' | 'PATERNITY';
  start_date: string;
  end_date: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

const LeaveCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1));
  const [leaves] = useState<LeaveEntry[]>([
    { id: 1, employee: 'Sarah Johnson', department: 'Finance', leave_type: 'ANNUAL', start_date: '2026-01-20', end_date: '2026-01-24', status: 'APPROVED' },
    { id: 2, employee: 'Mike Brown', department: 'IT', leave_type: 'SICK', start_date: '2026-01-21', end_date: '2026-01-22', status: 'APPROVED' },
    { id: 3, employee: 'Lisa Davis', department: 'HR', leave_type: 'ANNUAL', start_date: '2026-01-27', end_date: '2026-01-31', status: 'PENDING' },
    { id: 4, employee: 'Tom Wilson', department: 'Sales', leave_type: 'FAMILY', start_date: '2026-01-15', end_date: '2026-01-16', status: 'APPROVED' },
    { id: 5, employee: 'Anna Lee', department: 'IT', leave_type: 'STUDY', start_date: '2026-01-28', end_date: '2026-01-30', status: 'APPROVED' },
  ]);

  const getLeaveColor = (type: string) => {
    const colors: Record<string, string> = {
      ANNUAL: '#3b82f6',
      SICK: '#ef4444',
      FAMILY: '#8b5cf6',
      STUDY: '#f59e0b',
      MATERNITY: '#ec4899',
      PATERNITY: '#06b6d4'
    };
    return colors[type] || '#6b7280';
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isDateInRange = (date: Date, start: string, end: string) => {
    const d = date.toISOString().split('T')[0];
    return d >= start && d <= end;
  };

  const getLeavesForDate = (date: Date) => {
    return leaves.filter(l => l.status === 'APPROVED' && isDateInRange(date, l.start_date, l.end_date));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const approvedLeaves = leaves.filter(l => l.status === 'APPROVED').length;
  const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;
  const onLeaveToday = leaves.filter(l => {
    const today = new Date().toISOString().split('T')[0];
    return l.status === 'APPROVED' && today >= l.start_date && today <= l.end_date;
  }).length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Leave Calendar</h1>
        <p style={{ color: '#6b7280' }}>View team leave schedules and availability</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Calendar size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Leaves</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{leaves.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><Sun size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Approved</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{approvedLeaves}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Briefcase size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{pendingLeaves}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><Users size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>On Leave Today</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{onLeaveToday}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={prevMonth} style={{ padding: '8px', background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>{formatMonth(currentDate)}</h2>
            <button onClick={nextMonth} style={{ padding: '8px', background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                {day}
              </div>
            ))}
            {emptyDays.map(i => (
              <div key={`empty-${i}`} style={{ padding: '8px', minHeight: '80px' }} />
            ))}
            {days.map(day => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const dayLeaves = getLeavesForDate(date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              
              return (
                <div
                  key={day}
                  style={{
                    padding: '8px',
                    minHeight: '80px',
                    backgroundColor: isWeekend ? '#f9fafb' : 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 600, color: isWeekend ? '#9ca3af' : '#111827', marginBottom: '4px' }}>
                    {day}
                  </div>
                  {dayLeaves.slice(0, 2).map(leave => (
                    <div
                      key={leave.id}
                      style={{
                        fontSize: '10px',
                        padding: '2px 4px',
                        backgroundColor: getLeaveColor(leave.leave_type),
                        color: 'white',
                        borderRadius: '4px',
                        marginBottom: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {leave.employee.split(' ')[0]}
                    </div>
                  ))}
                  {dayLeaves.length > 2 && (
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>+{dayLeaves.length - 2} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Leave Types</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { type: 'ANNUAL', label: 'Annual Leave' },
                { type: 'SICK', label: 'Sick Leave' },
                { type: 'FAMILY', label: 'Family Responsibility' },
                { type: 'STUDY', label: 'Study Leave' },
                { type: 'MATERNITY', label: 'Maternity Leave' },
                { type: 'PATERNITY', label: 'Paternity Leave' },
              ].map(item => (
                <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: getLeaveColor(item.type) }} />
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Upcoming Leaves</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {leaves.filter(l => l.status === 'APPROVED').slice(0, 5).map(leave => (
                <div key={leave.id} style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{leave.employee}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{leave.department}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ 
                      fontSize: '10px', 
                      padding: '2px 6px', 
                      backgroundColor: getLeaveColor(leave.leave_type), 
                      color: 'white', 
                      borderRadius: '4px' 
                    }}>
                      {leave.leave_type}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{leave.start_date} - {leave.end_date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveCalendar;
