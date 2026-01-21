import React, { useState } from 'react';
import { Plus, Edit2, MapPin, Truck, Clock, CheckCircle, Navigation } from 'lucide-react';

interface Route {
  id: number;
  reference: string;
  technician: string;
  date: string;
  stops_count: number;
  total_distance: number;
  estimated_time: number;
  start_location: string;
  end_location: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

const RoutePlanning: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([
    { id: 1, reference: 'RT-2026-001', technician: 'John Smith', date: '2026-01-21', stops_count: 5, total_distance: 85, estimated_time: 6, start_location: 'Johannesburg Office', end_location: 'Sandton', status: 'IN_PROGRESS' },
    { id: 2, reference: 'RT-2026-002', technician: 'Mike Brown', date: '2026-01-21', stops_count: 4, total_distance: 62, estimated_time: 5, start_location: 'Pretoria Office', end_location: 'Centurion', status: 'PLANNED' },
    { id: 3, reference: 'RT-2026-003', technician: 'Sarah Johnson', date: '2026-01-20', stops_count: 6, total_distance: 95, estimated_time: 7, start_location: 'Cape Town Office', end_location: 'Stellenbosch', status: 'COMPLETED' },
    { id: 4, reference: 'RT-2026-004', technician: 'Tom Wilson', date: '2026-01-22', stops_count: 3, total_distance: 45, estimated_time: 4, start_location: 'Durban Office', end_location: 'Umhlanga', status: 'PLANNED' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ technician: '', date: '', start_location: '', end_location: '' });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      PLANNED: { bg: '#dbeafe', text: '#1e40af', icon: <Clock size={14} /> },
      IN_PROGRESS: { bg: '#fef3c7', text: '#92400e', icon: <Truck size={14} /> },
      COMPLETED: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> },
      CANCELLED: { bg: '#fee2e2', text: '#991b1b', icon: <Clock size={14} /> }
    };
    const c = config[status] || config.PLANNED;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status.replace('_', ' ')}</span>;
  };

  const handleCreate = () => {
    setForm({ technician: '', date: '', start_location: '', end_location: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newRoute: Route = {
      id: Date.now(),
      reference: `RT-2026-${String(routes.length + 1).padStart(3, '0')}`,
      technician: form.technician,
      date: form.date,
      stops_count: 0,
      total_distance: 0,
      estimated_time: 0,
      start_location: form.start_location,
      end_location: form.end_location,
      status: 'PLANNED'
    };
    setRoutes([newRoute, ...routes]);
    setShowModal(false);
  };

  const handleStart = (id: number) => setRoutes(routes.map(r => r.id === id ? { ...r, status: 'IN_PROGRESS' as const } : r));
  const handleComplete = (id: number) => setRoutes(routes.map(r => r.id === id ? { ...r, status: 'COMPLETED' as const } : r));

  const totalDistance = routes.reduce((acc, r) => acc + r.total_distance, 0);
  const totalStops = routes.reduce((acc, r) => acc + r.stops_count, 0);
  const inProgress = routes.filter(r => r.status === 'IN_PROGRESS').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Route Planning</h1>
        <p style={{ color: '#6b7280' }}>Plan and optimize service routes for field technicians</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Navigation size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Routes</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{routes.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Truck size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>In Progress</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{inProgress}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><MapPin size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Stops</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{totalStops}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><Navigation size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Distance</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{totalDistance} km</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Route List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Route
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Route</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Technician</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Stops</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Distance</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Est. Time</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route) => (
              <tr key={route.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{route.reference}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{route.start_location} → {route.end_location}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>{route.technician}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{route.date}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'center' }}>{route.stops_count}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{route.total_distance} km</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{route.estimated_time}h</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(route.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                  {route.status === 'PLANNED' && (
                    <button onClick={() => handleStart(route.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}>Start</button>
                  )}
                  {route.status === 'IN_PROGRESS' && (
                    <button onClick={() => handleComplete(route.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Complete</button>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Route</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Technician *</label>
                  <select value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Technician</option>
                    <option value="John Smith">John Smith</option>
                    <option value="Mike Brown">Mike Brown</option>
                    <option value="Sarah Johnson">Sarah Johnson</option>
                    <option value="Tom Wilson">Tom Wilson</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Date *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Start Location *</label>
                  <input type="text" value={form.start_location} onChange={(e) => setForm({ ...form, start_location: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>End Location *</label>
                  <input type="text" value={form.end_location} onChange={(e) => setForm({ ...form, end_location: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
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

export default RoutePlanning;
