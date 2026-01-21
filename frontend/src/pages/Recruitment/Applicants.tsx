import React, { useState } from 'react';
import { Plus, Edit2, Eye, Mail, Phone, FileText, Star, Users, Clock, CheckCircle } from 'lucide-react';

interface Applicant {
  id: number;
  name: string;
  email: string;
  phone: string;
  position: string;
  source: string;
  applied_date: string;
  experience_years: number;
  current_salary: number;
  expected_salary: number;
  rating: number;
  stage: 'NEW' | 'SCREENING' | 'INTERVIEW' | 'ASSESSMENT' | 'OFFER' | 'HIRED' | 'REJECTED';
}

const Applicants: React.FC = () => {
  const [applicants, setApplicants] = useState<Applicant[]>([
    { id: 1, name: 'David Chen', email: 'david.chen@email.com', phone: '+27 82 123 4567', position: 'Senior Software Engineer', source: 'LinkedIn', applied_date: '2026-01-18', experience_years: 6, current_salary: 520000, expected_salary: 650000, rating: 4, stage: 'INTERVIEW' },
    { id: 2, name: 'Emma Williams', email: 'emma.w@email.com', phone: '+27 83 234 5678', position: 'Senior Software Engineer', source: 'Indeed', applied_date: '2026-01-17', experience_years: 5, current_salary: 480000, expected_salary: 600000, rating: 5, stage: 'ASSESSMENT' },
    { id: 3, name: 'James Smith', email: 'james.smith@email.com', phone: '+27 84 345 6789', position: 'Financial Analyst', source: 'Referral', applied_date: '2026-01-19', experience_years: 3, current_salary: 380000, expected_salary: 450000, rating: 3, stage: 'SCREENING' },
    { id: 4, name: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '+27 85 456 7890', position: 'Financial Analyst', source: 'Company Website', applied_date: '2026-01-20', experience_years: 4, current_salary: 420000, expected_salary: 500000, rating: 4, stage: 'NEW' },
    { id: 5, name: 'Michael Brown', email: 'michael.b@email.com', phone: '+27 86 567 8901', position: 'Operations Manager', source: 'LinkedIn', applied_date: '2026-01-10', experience_years: 8, current_salary: 680000, expected_salary: 800000, rating: 5, stage: 'OFFER' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', position: '', source: '', experience_years: '', expected_salary: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount);

  const getStageBadge = (stage: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      NEW: { bg: '#dbeafe', text: '#1e40af' },
      SCREENING: { bg: '#fef3c7', text: '#92400e' },
      INTERVIEW: { bg: '#e0e7ff', text: '#3730a3' },
      ASSESSMENT: { bg: '#fce7f3', text: '#9d174d' },
      OFFER: { bg: '#dcfce7', text: '#166534' },
      HIRED: { bg: '#dcfce7', text: '#166534' },
      REJECTED: { bg: '#fee2e2', text: '#991b1b' }
    };
    const c = config[stage] || config.NEW;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{stage}</span>;
  };

  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <Star key={star} size={14} fill={star <= rating ? '#f59e0b' : 'none'} color={star <= rating ? '#f59e0b' : '#d1d5db'} />
        ))}
      </div>
    );
  };

  const handleCreate = () => {
    setForm({ name: '', email: '', phone: '', position: '', source: '', experience_years: '', expected_salary: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newApplicant: Applicant = {
      id: Date.now(),
      name: form.name,
      email: form.email,
      phone: form.phone,
      position: form.position,
      source: form.source,
      applied_date: new Date().toISOString().split('T')[0],
      experience_years: parseInt(form.experience_years),
      current_salary: 0,
      expected_salary: parseFloat(form.expected_salary),
      rating: 0,
      stage: 'NEW'
    };
    setApplicants([newApplicant, ...applicants]);
    setShowModal(false);
  };

  const handleAdvance = (id: number) => {
    const stages: Applicant['stage'][] = ['NEW', 'SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER', 'HIRED'];
    setApplicants(applicants.map(a => {
      if (a.id === id) {
        const currentIndex = stages.indexOf(a.stage);
        if (currentIndex < stages.length - 1) {
          return { ...a, stage: stages[currentIndex + 1] };
        }
      }
      return a;
    }));
  };

  const newCount = applicants.filter(a => a.stage === 'NEW').length;
  const interviewCount = applicants.filter(a => a.stage === 'INTERVIEW' || a.stage === 'ASSESSMENT').length;
  const offerCount = applicants.filter(a => a.stage === 'OFFER').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Applicants</h1>
        <p style={{ color: '#6b7280' }}>Track and manage job applicants through the hiring pipeline</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Users size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Applicants</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{applicants.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '10px' }}><FileText size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>New Applications</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{newCount}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><Clock size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>In Interview</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{interviewCount}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Offer Stage</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{offerCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Applicant List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> Add Applicant
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Applicant</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Position</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Source</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Experience</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Expected</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Rating</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Stage</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((applicant) => (
              <tr key={applicant.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{applicant.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{applicant.email}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{applicant.position}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{applicant.source}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{applicant.experience_years} years</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(applicant.expected_salary)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{renderStars(applicant.rating)}</td>
                <td style={{ padding: '12px 16px' }}>{getStageBadge(applicant.stage)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Mail size={16} /></button>
                  {applicant.stage !== 'HIRED' && applicant.stage !== 'REJECTED' && (
                    <button onClick={() => handleAdvance(applicant.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Advance</button>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Add Applicant</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Full Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Phone *</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Position *</label>
                  <input type="text" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Source *</label>
                  <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Source</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Indeed">Indeed</option>
                    <option value="Referral">Referral</option>
                    <option value="Company Website">Company Website</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Experience (years)</label>
                  <input type="number" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Expected Salary (ZAR)</label>
                  <input type="number" value={form.expected_salary} onChange={(e) => setForm({ ...form, expected_salary: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applicants;
