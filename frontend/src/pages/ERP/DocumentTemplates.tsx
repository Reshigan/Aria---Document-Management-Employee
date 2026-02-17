import { useState, useEffect } from 'react';
import { useCompany } from '../../lib/company';
import { FileText, Plus, Download, Eye, Edit, X, RefreshCw, AlertCircle, Check, File, Layers } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev/api';

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
    name: '', type: 'invoice', template_format: 'html', is_active: true, is_default: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (currentCompany) loadTemplates();
  }, [currentCompany, selectedType]);

  const loadTemplates = async () => {
    if (!currentCompany) return;
    try {
      setLoading(true);
      const typeParam = selectedType !== 'all' ? `&document_type=${selectedType}` : '';
      const response = await fetch(`${API_BASE}/erp/documents/templates?company_id=${currentCompany.id}${typeParam}`);
      const ct = response.headers.get('content-type');
      if (!response.ok || !ct?.includes('application/json')) { setTemplates([]); setError(null); setLoading(false); return; }
      const data = await response.json();
      setTemplates(data.templates || []);
      setError(null);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates');
    } finally { setLoading(false); }
  };

  const generateDocument = async (templateId: string, type: string) => {
    if (!currentCompany) return;
    try {
      const response = await fetch(`${API_BASE}/erp/documents/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: currentCompany.id, document_type: type,
          source_id: '00000000-0000-0000-0000-000000000001', source_table: 'invoices', template_id: templateId,
        }),
      });
      if (!response.ok) throw new Error('Failed to generate document');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error generating document:', err);
      setError('Failed to generate document');
    }
  };

  const handleCreate = () => {
    setFormData({ name: '', type: 'invoice', template_format: 'html', is_active: true, is_default: false });
    setShowCreateModal(true);
  };

  const handleEdit = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setFormData({ name: template.name, type: template.type, template_format: template.template_format, is_active: template.is_active, is_default: template.is_default });
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
      const response = await fetch(`${API_BASE}/erp/documents/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: currentCompany.id, ...formData }),
      });
      if (!response.ok) throw new Error('Failed to create template');
      setShowCreateModal(false);
      loadTemplates();
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Failed to create template');
    } finally { setSaving(false); }
  };

  const handleSubmitEdit = async () => {
    if (!currentCompany || !selectedTemplate || !formData.name) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/erp/documents/templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: currentCompany.id, ...formData }),
      });
      if (!response.ok) throw new Error('Failed to update template');
      setShowEditModal(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (err) {
      console.error('Error updating template:', err);
      setError('Failed to update template');
    } finally { setSaving(false); }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      invoice: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      delivery_note: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      quote: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      sales_order: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      purchase_order: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      credit_note: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
  };

  const stats = {
    total: templates.length,
    active: templates.filter(t => t.is_active).length,
    defaults: templates.filter(t => t.is_default).length,
    types: new Set(templates.map(t => t.type)).size
  };

  const renderFormModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    const onClose = () => isEdit ? setShowEditModal(false) : setShowCreateModal(false);
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><FileText className="h-6 w-6" /></div>
                <div><h2 className="text-xl font-semibold">{isEdit ? 'Edit Template' : 'Create Template'}</h2><p className="text-white/80 text-sm">Document template settings</p></div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p></div>)}
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Template Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Standard Invoice Template" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Document Type *</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all">{documentTypes.filter(t => t.value !== 'all').map((type) => (<option key={type.value} value={type.value}>{type.label}</option>))}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Format</label><select value={formData.template_format} onChange={(e) => setFormData({ ...formData, template_format: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"><option value="html">HTML</option><option value="pdf">PDF</option></select></div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.is_default} onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Set as Default</span></label>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button onClick={isEdit ? handleSubmitEdit : handleSubmitCreate} disabled={saving || !formData.name} className={`px-4 py-2 rounded-xl font-medium transition-all shadow-lg ${saving || !formData.name ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-violet-500/30'}`}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}</button>
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewModal = () => {
    if (!showPreviewModal || !selectedTemplate) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowPreviewModal(false); setSelectedTemplate(null); }}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Eye className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Preview: {selectedTemplate.name}</h2><p className="text-white/80 text-sm">{selectedTemplate.type.replace('_', ' ').toUpperCase()}</p></div></div>
              <button onClick={() => { setShowPreviewModal(false); setSelectedTemplate(null); }} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
                <div className="text-center mb-8"><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedTemplate.type.replace('_', ' ').toUpperCase()}</h3><p className="text-gray-500 dark:text-gray-300">Template: {selectedTemplate.name}</p></div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-3">
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Document Type:</span> {selectedTemplate.type.replace('_', ' ')}</p>
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Format:</span> {selectedTemplate.template_format.toUpperCase()}</p>
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Status:</span> <span className={selectedTemplate.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>{selectedTemplate.is_active ? 'Active' : 'Inactive'}</span></p>
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Default:</span> {selectedTemplate.is_default ? 'Yes' : 'No'}</p>
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Created:</span> {(selectedTemplate.created_at ? new Date(selectedTemplate.created_at).toLocaleDateString() : "-")}</p>
                </div>
                <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl"><p className="text-gray-500 dark:text-gray-300 text-sm text-center">This is a preview of the template metadata. Click "Generate Sample" to create a sample document.</p></div>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
            <button onClick={() => { setShowPreviewModal(false); setSelectedTemplate(null); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Close</button>
            <button onClick={() => { generateDocument(selectedTemplate.id, selectedTemplate.type); setShowPreviewModal(false); setSelectedTemplate(null); }} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all ">Generate Sample</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-violet-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Document Templates</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Manage document templates with QR codes and company branding</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadTemplates} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all "><Plus className="h-5 w-5" />New Template</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl "><FileText className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Templates</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><Check className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.active}</p><p className="text-xs text-gray-500 dark:text-gray-300">Active</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><File className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.defaults}</p><p className="text-xs text-gray-500 dark:text-gray-300">Defaults</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Layers className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.types}</p><p className="text-xs text-gray-500 dark:text-gray-300">Document Types</p></div></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Type</label><select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all min-w-[200px]">{documentTypes.map((type) => (<option key={type.value} value={type.value}>{type.label}</option>))}</select></div>
          </div>

          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading templates...</p></div>
          ) : templates.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileText className="h-8 w-8 text-gray-300" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No templates found</h3><p className="text-gray-500 dark:text-gray-300 mb-6">Create your first document template to get started</p><button onClick={handleCreate} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all">Create Template</button></div>
          ) : (
            <div className="p-4 grid grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm ">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl"><FileText className="h-6 w-6 text-violet-600 dark:text-violet-400" /></div>
                      <div><h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getTypeBadge(template.type)}`}>{template.type.replace('_', ' ')}</span></div>
                    </div>
                    {template.is_default && (<span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-lg border border-green-200 dark:border-green-800">Default</span>)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300 mb-4">
                    <span className={`w-2 h-2 rounded-full ${template.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    <span>{template.is_active ? 'Active' : 'Inactive'}</span>
                    <span className="mx-2">|</span>
                    <span>{template.template_format.toUpperCase()}</span>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={() => generateDocument(template.id, template.type)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-violet-700 hover:to-purple-700 transition-all"><Download className="h-4 w-4" />Generate</button>
                    <button onClick={() => handlePreview(template)} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><Eye className="h-4 w-4" /></button>
                    <button onClick={() => handleEdit(template)} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><Edit className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderPreviewModal()}
    </div>
  );
}
