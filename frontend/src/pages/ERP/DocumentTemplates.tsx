import React, { useState, useEffect } from 'react';
import { FileText, Plus, Download, Eye, Edit, Trash2 } from 'lucide-react';
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

export default function DocumentTemplates() {
  const { currentCompany } = useCompany();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

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
          onClick={() => alert('Create template functionality coming soon')}
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
            onClick={() => alert('Create template functionality coming soon')}
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
                  onClick={() => alert('Preview functionality coming soon')}
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
                  onClick={() => alert('Edit functionality coming soon')}
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
