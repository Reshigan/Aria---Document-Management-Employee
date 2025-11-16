import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './FieldService.css';

interface Technician {
  id: string;
  technician_code: string;
  technician_name: string;
  email: string;
  phone: string;
  specialization: string;
  status: string;
  created_at: string;
}

export const TechniciansList: React.FC = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    fetchTechnicians();
  }, [statusFilter]);

  const fetchTechnicians = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `/api/field-service/technicians?company_id=${user?.company_id}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTechnicians(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this technician?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/field-service/technicians/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchTechnicians();
      }
    } catch (error) {
      console.error('Error deleting technician:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading technicians...</div>;
  }

  return (
    <div className="work-orders-list">
      <div className="page-header">
        <h1>Technicians</h1>
        <div className="header-actions">
          <Link to="/field-service/technicians/new" className="btn btn-primary">
            <Plus size={20} />
            <span>New Technician</span>
          </Link>
        </div>
      </div>

      <div className="filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="data-table">
        {technicians.length === 0 ? (
          <div className="empty-state">
            <p>No technicians found</p>
            <Link to="/field-service/technicians/new" className="btn btn-primary">
              Add your first technician
            </Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Specialization</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {technicians.map((tech) => (
                <tr key={tech.id}>
                  <td>
                    <Link to={`/field-service/technicians/${tech.id}`} className="link">
                      {tech.technician_code}
                    </Link>
                  </td>
                  <td>{tech.technician_name}</td>
                  <td>{tech.email || '-'}</td>
                  <td>{tech.phone || '-'}</td>
                  <td>{tech.specialization || '-'}</td>
                  <td>
                    <span className={`status-badge ${tech.status}`}>
                      {tech.status}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/field-service/technicians/${tech.id}`} className="btn-icon" title="View">
                        <Eye size={18} />
                      </Link>
                      <Link to={`/field-service/technicians/${tech.id}/edit`} className="btn-icon" title="Edit">
                        <Edit size={18} />
                      </Link>
                      <button onClick={() => handleDelete(tech.id)} className="btn-icon" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TechniciansList;
