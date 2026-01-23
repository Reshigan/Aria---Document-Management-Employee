import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Search, X, Edit, Trash2 } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  client: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
  actual_cost: number;
  revenue: number;
}

interface FormData {
  name: string;
  client: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
}

export default function ProjectsDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    client: '',
    status: 'planning',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget: 0
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://aria.vantax.co.za/api/new-pages/projects');
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      client: '',
      status: 'planning',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      budget: 0
    });
    setEditingProject(null);
    setError(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      client: project.client,
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date || '',
      budget: project.budget
    });
    setShowModal(true);
  };

  const handleDelete = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await fetch(`https://aria.vantax.co.za/api/new-pages/projects/${projectId}`, {
        method: 'DELETE'
      });
      fetchProjects();
    } catch (error) {
      setError('Failed to delete project');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProject 
        ? `https://aria.vantax.co.za/api/new-pages/projects/${editingProject.id}`
        : 'https://aria.vantax.co.za/api/new-pages/projects';
      const method = editingProject ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      setShowModal(false);
      resetForm();
      fetchProjects();
    } catch (error) {
      setError('Failed to save project');
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = projects.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const totalCosts = projects.reduce((sum, p) => sum + (p.actual_cost || 0), 0);
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue * 100).toFixed(1) : '0';

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FolderOpen size={32} style={{ color: '#6366f1' }} />
          Projects
        </h1>
        <p style={{ color: '#6b7280' }}>Manage projects, track time, expenses, and profitability</p>
      </div>

      {/* Action Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 1rem 0.5rem 2.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          />
        </div>
        <button
          onClick={handleCreate}
          style={{
            padding: '0.5rem 1.5rem',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Active Projects</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6366f1' }}>{projects.filter(p => p.status === 'active').length}</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Revenue</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>R {totalRevenue.toLocaleString()}</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Costs</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>R {totalCosts.toLocaleString()}</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Profit Margin</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{profitMargin}%</div>
        </div>
      </div>

      {/* Projects Table or Empty State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem' }}>
          Loading...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <FolderOpen size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No projects yet</h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Create your first project to track time, expenses, and profitability
          </p>
          <button
            onClick={handleCreate}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Client</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Budget</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '500' }}>{project.name}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{project.client}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      background: project.status === 'active' ? '#dcfce7' : project.status === 'completed' ? '#dbeafe' : '#fef3c7',
                      color: project.status === 'active' ? '#166534' : project.status === 'completed' ? '#1e40af' : '#92400e'
                    }}>
                      {project.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>R {project.budget?.toLocaleString() || '0'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEdit(project)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(project.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '0.375rem' }}>
          {error}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '32rem', margin: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                {editingProject ? 'Edit Project' : 'New Project'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Client</label>
                <input
                  type="text"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Budget</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.5rem 1rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                >
                  {editingProject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
