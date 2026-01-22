import React, { useState, useEffect } from 'react';
import { FileText, Plus, Download, Eye, Edit, Trash2, X } from 'lucide-react';
import { useCompany } from '../../lib/company';

interface DocumentTemplate {
  id: string;
  company_id: string;
  type: string;
  name: string;
  template_format: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

interface TemplateFormData {
  name: string;
  type: string;
  template_format: string;
  is_active: boolean;
  is_default: boolean;
}

export default function DocumentTemplates() {
  const { currentCompany } = useCompany();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    type: 'invoice',
    template_format: 'html',
    is_active: true,
    is_default: false,
  });
  const [saving, setSaving] = useState(false);

  const documentTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'delivery_note', label: 'Delivery Note' },
    { value: 'quote', label: 'Quote' },
    { value: 'sales_order', label: 'Sales Order' },
    { value: 'purchase_order', label: 'Purchase Order' },
    { value: 'credit_note', label: 'Credit Note' },
  ];

  useEffect(() => {
    if (currentCompany) {
      loadTemplates();
    }
  }, [currentCompany, selectedType]);

  const loadTemplates = async () => {
    if (!currentCompany) return;
    
    try {
      setLoading(true);
      const typeParam = selectedType !== 'all' ? `&document_type=${selectedType}` : '';
      const response = await fetch(
        `https://aria.vantax.co.za/api/erp/documents/templates?company_id=${currentCompany.id}${typeParam}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDocument = async (templateId: string, type: string) => {
    if (!currentCompany) return;
    
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: currentCompany.id,
          document_type: type,
          source_id: '00000000-0000-0000-0000-000000000001',
          source_table: 'invoices',
          template_id: templateId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate document');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Failed to generate document. Please try again.');
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      type: 'invoice',
      template_format: 'html',
      is_active: true,
      is_default: false,
    });
    setShowCreateModal(true);
  };

  const handleEdit = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      template_format: template.template_format,
      is_active: template.is_active,
      is_default: template.is_default,
    });
    setShowEditModal(true);
  };

  const handlePreview = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const handleSubmitCreate = async () => {
    if (!currentCompany || !formData.name) return;
    
    setSaving(true);
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/documents/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: currentCompany.id,
          ...formData,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create template');
      
      setShowCreateModal(false);
      loadTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to create template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!currentCompany || !selectedTemplate || !formData.name) return;
    
    setSaving(true);
    try {
      const response = await fetch(`https://aria.vantax.co.za/api/erp/documents/templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: currentCompany.id,
          ...formData,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update template');
      
      setShowEditModal(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Failed to update template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Document Templates
          </h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Manage document templates with QR codes and company branding
          </p>
        </div>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--primary-600)',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
          onClick={handleCreate}
        >
          <Plus size={20} />
          New Template
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '0.5rem',
          fontWeight: 500,
          color: 'var(--gray-700)'
        }}>
          Filter by Type:
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid var(--gray-300)',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            minWidth: '200px',
          }}
        >
          {documentTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
          Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: 'var(--gray-50)',
          borderRadius: '0.5rem',
          border: '1px dashed var(--gray-300)',
        }}>
          <FileText size={48} style={{ color: 'var(--gray-400)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No templates found
          </h3>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            Create your first document template to get started
          </p>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--primary-600)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
            onClick={handleCreate}
          >
            Create Template
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}>
          {templates.map((template) => (
            <div
              key={template.id}
              style={{
                backgroundColor: 'white',
                border: '1px solid var(--gray-200)',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--primary-50)',
                    borderRadius: '0.5rem',
                  }}>
                    <FileText size={24} style={{ color: 'var(--primary-600)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      {template.name}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      {template.type.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                </div>
                {template.is_default && (
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'var(--green-100)',
                    color: 'var(--green-700)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    borderRadius: '0.25rem',
                  }}>
                    Default
                  </span>
                )}
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '0.5rem',
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--gray-200)',
              }}>
                <button
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: 'var(--primary-600)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                  onClick={() => generateDocument(template.id, template.type)}
                  title="Generate PDF"
                >
                  <Download size={16} />
                  Generate
                </button>
                <button
                  style={{
                    padding: '0.5rem',
                    backgroundColor: 'var(--gray-100)',
                    color: 'var(--gray-700)',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => handlePreview(template)}
                  title="Preview"
                >
                  <Eye size={16} />
                </button>
                <button
                  style={{
                    padding: '0.5rem',
                    backgroundColor: 'var(--gray-100)',
                    color: 'var(--gray-700)',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleEdit(template)}
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Create New Template</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Template Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: '0.375rem' }}
                  placeholder="e.g., Standard Invoice Template"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Document Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: '0.375rem' }}
                >
                  {documentTypes.filter(t => t.value !== 'all').map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Format</label>
                <select
                  value={formData.template_format}
                  onChange={(e) => setFormData({ ...formData, template_format: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: '0.375rem' }}
                >
                  <option value="html">HTML</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Active
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  />
                  Set as Default
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '0.5rem 1rem', border: '1px solid var(--gray-300)', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCreate}
                disabled={saving || !formData.name}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--primary-600)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving || !formData.name ? 0.5 : 1,
                }}
              >
                {saving ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTemplate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Edit Template</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedTemplate(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Template Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: '0.375rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Document Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: '0.375rem' }}
                >
                  {documentTypes.filter(t => t.value !== 'all').map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Format</label>
                <select
                  value={formData.template_format}
                  onChange={(e) => setFormData({ ...formData, template_format: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: '0.375rem' }}
                >
                  <option value="html">HTML</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Active
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  />
                  Set as Default
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => { setShowEditModal(false); setSelectedTemplate(null); }}
                style={{ padding: '0.5rem 1rem', border: '1px solid var(--gray-300)', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEdit}
                disabled={saving || !formData.name}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--primary-600)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving || !formData.name ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Preview: {selectedTemplate.name}</h2>
              <button onClick={() => { setShowPreviewModal(false); setSelectedTemplate(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ backgroundColor: 'var(--gray-50)', padding: '1.5rem', borderRadius: '0.5rem', minHeight: '400px' }}>
              <div style={{ backgroundColor: 'white', padding: '2rem', border: '1px solid var(--gray-200)', borderRadius: '0.25rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {selectedTemplate.type.replace('_', ' ').toUpperCase()}
                  </h3>
                  <p style={{ color: 'var(--gray-600)' }}>Template: {selectedTemplate.name}</p>
                </div>
                <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1rem' }}>
                  <p style={{ marginBottom: '0.5rem' }}><strong>Document Type:</strong> {selectedTemplate.type.replace('_', ' ')}</p>
                  <p style={{ marginBottom: '0.5rem' }}><strong>Format:</strong> {selectedTemplate.template_format.toUpperCase()}</p>
                  <p style={{ marginBottom: '0.5rem' }}><strong>Status:</strong> {selectedTemplate.is_active ? 'Active' : 'Inactive'}</p>
                  <p style={{ marginBottom: '0.5rem' }}><strong>Default:</strong> {selectedTemplate.is_default ? 'Yes' : 'No'}</p>
                  <p style={{ marginBottom: '0.5rem' }}><strong>Created:</strong> {new Date(selectedTemplate.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--gray-50)', borderRadius: '0.25rem' }}>
                  <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', textAlign: 'center' }}>
                    This is a preview of the template metadata. Click "Generate" on the template card to create a sample document.
                  </p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => { setShowPreviewModal(false); setSelectedTemplate(null); }}
                style={{ padding: '0.5rem 1rem', border: '1px solid var(--gray-300)', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => { generateDocument(selectedTemplate.id, selectedTemplate.type); setShowPreviewModal(false); setSelectedTemplate(null); }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--primary-600)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                }}
              >
                Generate Sample
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
