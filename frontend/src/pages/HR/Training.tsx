import React, { useState } from 'react';
import { Plus, Edit2, Eye, BookOpen, Users, Calendar, Award, CheckCircle, Clock } from 'lucide-react';

interface TrainingCourse {
  id: number;
  code: string;
  name: string;
  category: string;
  description: string;
  duration_hours: number;
  instructor: string;
  max_participants: number;
  enrolled: number;
  completed: number;
  next_session: string;
  status: 'ACTIVE' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

const Training: React.FC = () => {
  const [courses, setCourses] = useState<TrainingCourse[]>([
    { id: 1, code: 'TRN-001', name: 'ERP System Training', category: 'Technical', description: 'Comprehensive training on ARIA ERP system', duration_hours: 16, instructor: 'John Smith', max_participants: 20, enrolled: 15, completed: 12, next_session: '2026-02-01', status: 'SCHEDULED' },
    { id: 2, code: 'TRN-002', name: 'Leadership Development', category: 'Soft Skills', description: 'Building effective leadership skills', duration_hours: 24, instructor: 'Lisa Davis', max_participants: 15, enrolled: 12, completed: 0, next_session: '2026-02-15', status: 'SCHEDULED' },
    { id: 3, code: 'TRN-003', name: 'POPIA Compliance', category: 'Compliance', description: 'Understanding POPIA requirements', duration_hours: 4, instructor: 'Sarah Johnson', max_participants: 50, enrolled: 45, completed: 45, next_session: '2026-01-15', status: 'COMPLETED' },
    { id: 4, code: 'TRN-004', name: 'Excel Advanced', category: 'Technical', description: 'Advanced Excel formulas and macros', duration_hours: 8, instructor: 'Mike Brown', max_participants: 20, enrolled: 18, completed: 0, next_session: '2026-02-10', status: 'ACTIVE' },
    { id: 5, code: 'TRN-005', name: 'Health & Safety', category: 'Compliance', description: 'Workplace health and safety training', duration_hours: 4, instructor: 'Tom Wilson', max_participants: 100, enrolled: 85, completed: 80, next_session: '2026-03-01', status: 'SCHEDULED' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', description: '', duration_hours: '', instructor: '', max_participants: '', next_session: '' });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      ACTIVE: { bg: '#dcfce7', text: '#166534', icon: <Clock size={14} /> },
      SCHEDULED: { bg: '#dbeafe', text: '#1e40af', icon: <Calendar size={14} /> },
      COMPLETED: { bg: '#e0e7ff', text: '#3730a3', icon: <CheckCircle size={14} /> },
      CANCELLED: { bg: '#fee2e2', text: '#991b1b', icon: <Clock size={14} /> }
    };
    const c = config[status] || config.SCHEDULED;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status}</span>;
  };

  const handleCreate = () => {
    setForm({ name: '', category: '', description: '', duration_hours: '', instructor: '', max_participants: '', next_session: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newCourse: TrainingCourse = {
      id: Date.now(),
      code: `TRN-${String(courses.length + 1).padStart(3, '0')}`,
      name: form.name,
      category: form.category,
      description: form.description,
      duration_hours: parseInt(form.duration_hours) || 8,
      instructor: form.instructor,
      max_participants: parseInt(form.max_participants) || 20,
      enrolled: 0,
      completed: 0,
      next_session: form.next_session,
      status: 'SCHEDULED'
    };
    setCourses([newCourse, ...courses]);
    setShowModal(false);
  };

  const totalCourses = courses.length;
  const activeCourses = courses.filter(c => c.status === 'ACTIVE' || c.status === 'SCHEDULED').length;
  const totalEnrolled = courses.reduce((acc, c) => acc + c.enrolled, 0);
  const totalCompleted = courses.reduce((acc, c) => acc + c.completed, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Training Management</h1>
        <p style={{ color: '#6b7280' }}>Manage employee training courses and certifications</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><BookOpen size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Courses</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{totalCourses}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><Calendar size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Active/Scheduled</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{activeCourses}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Users size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Enrolled</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{totalEnrolled}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><Award size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Completions</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{totalCompleted}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Course List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> Add Course
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Course</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Duration</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Instructor</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Enrolled</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Next Session</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{course.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{course.code}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', backgroundColor: '#f3f4f6', color: '#374151' }}>{course.category}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{course.duration_hours}h</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{course.instructor}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{course.enrolled}</span>
                  <span style={{ color: '#6b7280' }}> / </span>
                  <span style={{ color: '#111827', fontWeight: 600 }}>{course.max_participants}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{course.next_session}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(course.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button>
                  <button style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Add Training Course</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Course Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Category</option>
                    <option value="Technical">Technical</option>
                    <option value="Soft Skills">Soft Skills</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Leadership">Leadership</option>
                    <option value="Safety">Safety</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Duration (hours) *</label>
                  <input type="number" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Instructor *</label>
                  <input type="text" value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Max Participants</label>
                  <input type="number" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Next Session Date</label>
                <input type="date" value={form.next_session} onChange={(e) => setForm({ ...form, next_session: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Add Course</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Training;
