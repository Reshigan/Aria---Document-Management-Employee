import React, { useState } from 'react';
import { Plus, Edit2, Eye, Star, Calendar, User, TrendingUp, CheckCircle } from 'lucide-react';

interface PerformanceReview {
  id: number;
  employee: string;
  employee_id: string;
  department: string;
  reviewer: string;
  review_period: string;
  review_date: string;
  overall_rating: number;
  goals_achieved: number;
  goals_total: number;
  strengths: string[];
  improvements: string[];
  status: 'DRAFT' | 'SELF_REVIEW' | 'MANAGER_REVIEW' | 'COMPLETED' | 'ACKNOWLEDGED';
}

const PerformanceReviews: React.FC = () => {
  const [reviews, setReviews] = useState<PerformanceReview[]>([
    { id: 1, employee: 'John Smith', employee_id: 'EMP-001', department: 'IT', reviewer: 'Tom Wilson', review_period: 'H2 2025', review_date: '2026-01-15', overall_rating: 4.2, goals_achieved: 8, goals_total: 10, strengths: ['Technical skills', 'Team collaboration'], improvements: ['Time management'], status: 'COMPLETED' },
    { id: 2, employee: 'Sarah Johnson', employee_id: 'EMP-002', department: 'Finance', reviewer: 'Mary Johnson', review_period: 'H2 2025', review_date: '2026-01-18', overall_rating: 4.5, goals_achieved: 9, goals_total: 10, strengths: ['Attention to detail', 'Leadership'], improvements: ['Delegation'], status: 'ACKNOWLEDGED' },
    { id: 3, employee: 'Mike Brown', employee_id: 'EMP-003', department: 'Sales', reviewer: 'Lisa Davis', review_period: 'H2 2025', review_date: '2026-01-20', overall_rating: 3.8, goals_achieved: 7, goals_total: 10, strengths: ['Client relationships'], improvements: ['Reporting', 'Follow-up'], status: 'MANAGER_REVIEW' },
    { id: 4, employee: 'Anna Lee', employee_id: 'EMP-004', department: 'IT', reviewer: 'Tom Wilson', review_period: 'H2 2025', review_date: '2026-01-22', overall_rating: 0, goals_achieved: 0, goals_total: 8, strengths: [], improvements: [], status: 'SELF_REVIEW' },
    { id: 5, employee: 'Peter Williams', employee_id: 'EMP-005', department: 'Operations', reviewer: 'Mary Johnson', review_period: 'H2 2025', review_date: '2026-01-25', overall_rating: 0, goals_achieved: 0, goals_total: 12, strengths: [], improvements: [], status: 'DRAFT' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee: '', department: '', reviewer: '', review_period: '', goals_total: '' });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151' },
      SELF_REVIEW: { bg: '#dbeafe', text: '#1e40af' },
      MANAGER_REVIEW: { bg: '#fef3c7', text: '#92400e' },
      COMPLETED: { bg: '#dcfce7', text: '#166534' },
      ACKNOWLEDGED: { bg: '#e0e7ff', text: '#3730a3' }
    };
    const c = config[status] || config.DRAFT;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status.replace('_', ' ')}</span>;
  };

  const renderStars = (rating: number) => {
    if (rating === 0) return <span style={{ color: '#9ca3af', fontSize: '12px' }}>Not rated</span>;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <Star key={star} size={16} fill={star <= Math.round(rating) ? '#f59e0b' : 'none'} color={star <= Math.round(rating) ? '#f59e0b' : '#d1d5db'} />
        ))}
        <span style={{ marginLeft: '4px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{rating.toFixed(1)}</span>
      </div>
    );
  };

  const handleCreate = () => {
    setForm({ employee: '', department: '', reviewer: '', review_period: '', goals_total: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newReview: PerformanceReview = {
      id: Date.now(),
      employee: form.employee,
      employee_id: `EMP-${String(reviews.length + 1).padStart(3, '0')}`,
      department: form.department,
      reviewer: form.reviewer,
      review_period: form.review_period,
      review_date: new Date().toISOString().split('T')[0],
      overall_rating: 0,
      goals_achieved: 0,
      goals_total: parseInt(form.goals_total) || 10,
      strengths: [],
      improvements: [],
      status: 'DRAFT'
    };
    setReviews([newReview, ...reviews]);
    setShowModal(false);
  };

  const completed = reviews.filter(r => r.status === 'COMPLETED' || r.status === 'ACKNOWLEDGED').length;
  const pending = reviews.filter(r => r.status === 'SELF_REVIEW' || r.status === 'MANAGER_REVIEW').length;
  const avgRating = reviews.filter(r => r.overall_rating > 0).reduce((acc, r, _, arr) => acc + r.overall_rating / arr.length, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Performance Reviews</h1>
        <p style={{ color: '#6b7280' }}>Manage employee performance evaluations</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><User size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Reviews</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{reviews.length}</div>
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
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Calendar size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{pending}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><TrendingUp size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Avg Rating</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{avgRating.toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Review List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Review
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Employee</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Period</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reviewer</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Goals</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Rating</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{review.employee}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{review.department} | {review.employee_id}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{review.review_period}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{review.reviewer}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {review.goals_achieved > 0 ? (
                    <span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>{review.goals_achieved}</span>
                      <span style={{ color: '#6b7280' }}> / </span>
                      <span style={{ color: '#111827', fontWeight: 600 }}>{review.goals_total}</span>
                    </span>
                  ) : (
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>{review.goals_total} goals</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>{renderStars(review.overall_rating)}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(review.status)}</td>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Performance Review</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Employee *</label>
                  <input type="text" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
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
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Reviewer *</label>
                  <input type="text" value={form.reviewer} onChange={(e) => setForm({ ...form, reviewer: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Review Period *</label>
                  <select value={form.review_period} onChange={(e) => setForm({ ...form, review_period: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Period</option>
                    <option value="H1 2026">H1 2026</option>
                    <option value="H2 2025">H2 2025</option>
                    <option value="Q1 2026">Q1 2026</option>
                    <option value="Annual 2025">Annual 2025</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Number of Goals</label>
                <input type="number" value={form.goals_total} onChange={(e) => setForm({ ...form, goals_total: e.target.value })} placeholder="10" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
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

export default PerformanceReviews;
