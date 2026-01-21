import React, { useState } from 'react';
import { Plus, Edit2, Eye, Briefcase, Users, Clock, CheckCircle, ExternalLink } from 'lucide-react';

interface JobPosting {
  id: number;
  title: string;
  department: string;
  location: string;
  employment_type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  salary_range: string;
  posted_date: string;
  closing_date: string;
  applicants_count: number;
  views_count: number;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'FILLED';
}

const JobPostings: React.FC = () => {
  const [postings, setPostings] = useState<JobPosting[]>([
    { id: 1, title: 'Senior Software Engineer', department: 'IT', location: 'Johannesburg', employment_type: 'FULL_TIME', salary_range: 'R550,000 - R750,000', posted_date: '2026-01-10', closing_date: '2026-02-10', applicants_count: 45, views_count: 320, status: 'ACTIVE' },
    { id: 2, title: 'Financial Analyst', department: 'Finance', location: 'Cape Town', employment_type: 'FULL_TIME', salary_range: 'R400,000 - R550,000', posted_date: '2026-01-15', closing_date: '2026-02-15', applicants_count: 28, views_count: 185, status: 'ACTIVE' },
    { id: 3, title: 'Sales Representative', department: 'Sales', location: 'Durban', employment_type: 'FULL_TIME', salary_range: 'R280,000 - R380,000', posted_date: '2026-01-05', closing_date: '2026-01-25', applicants_count: 62, views_count: 450, status: 'CLOSED' },
    { id: 4, title: 'HR Intern', department: 'HR', location: 'Johannesburg', employment_type: 'INTERNSHIP', salary_range: 'R8,000/month', posted_date: '2026-01-18', closing_date: '2026-02-28', applicants_count: 15, views_count: 95, status: 'ACTIVE' },
    { id: 5, title: 'Operations Manager', department: 'Operations', location: 'Pretoria', employment_type: 'FULL_TIME', salary_range: 'R650,000 - R850,000', posted_date: '2025-12-15', closing_date: '2026-01-15', applicants_count: 38, views_count: 280, status: 'FILLED' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', department: '', location: '', employment_type: 'FULL_TIME', salary_range: '', closing_date: '' });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151' },
      ACTIVE: { bg: '#dcfce7', text: '#166534' },
      PAUSED: { bg: '#fef3c7', text: '#92400e' },
      CLOSED: { bg: '#fee2e2', text: '#991b1b' },
      FILLED: { bg: '#dbeafe', text: '#1e40af' }
    };
    const c = config[status] || config.DRAFT;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      FULL_TIME: 'Full-time',
      PART_TIME: 'Part-time',
      CONTRACT: 'Contract',
      INTERNSHIP: 'Internship'
    };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', backgroundColor: '#f3f4f6', color: '#374151' }}>{labels[type] || type}</span>;
  };

  const handleCreate = () => {
    setForm({ title: '', department: '', location: '', employment_type: 'FULL_TIME', salary_range: '', closing_date: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newPosting: JobPosting = {
      id: Date.now(),
      title: form.title,
      department: form.department,
      location: form.location,
      employment_type: form.employment_type as JobPosting['employment_type'],
      salary_range: form.salary_range,
      posted_date: new Date().toISOString().split('T')[0],
      closing_date: form.closing_date,
      applicants_count: 0,
      views_count: 0,
      status: 'DRAFT'
    };
    setPostings([newPosting, ...postings]);
    setShowModal(false);
  };

  const handlePublish = (id: number) => setPostings(postings.map(p => p.id === id ? { ...p, status: 'ACTIVE' as const } : p));

  const activePostings = postings.filter(p => p.status === 'ACTIVE').length;
  const totalApplicants = postings.reduce((acc, p) => acc + p.applicants_count, 0);
  const totalViews = postings.reduce((acc, p) => acc + p.views_count, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Job Postings</h1>
        <p style={{ color: '#6b7280' }}>Manage job listings and recruitment campaigns</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Briefcase size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Postings</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{postings.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{activePostings}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><Users size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Applicants</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{totalApplicants}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Eye size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Views</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{totalViews}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Job Listings</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Job Posting
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Position</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Salary</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Applicants</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Views</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Closing</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {postings.map((posting) => (
              <tr key={posting.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{posting.title}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{posting.department} | {posting.location}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>{getTypeBadge(posting.employment_type)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{posting.salary_range}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#6366f1', textAlign: 'center' }}>{posting.applicants_count}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{posting.views_count}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{posting.closing_date}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(posting.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                  {posting.status === 'DRAFT' && (
                    <button onClick={() => handlePublish(posting.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Publish</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Job Posting</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Job Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Department *</label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Department</option>
                    <option value="IT">IT</option>
                    <option value="Finance">Finance</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Location *</label>
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Employment Type *</label>
                  <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="FULL_TIME">Full-time</option>
                    <option value="PART_TIME">Part-time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Closing Date *</label>
                  <input type="date" value={form.closing_date} onChange={(e) => setForm({ ...form, closing_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Salary Range</label>
                <input type="text" value={form.salary_range} onChange={(e) => setForm({ ...form, salary_range: e.target.value })} placeholder="e.g., R400,000 - R550,000" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPostings;
