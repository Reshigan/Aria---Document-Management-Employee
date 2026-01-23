import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, X, Mail, Eye, Copy, Send, FileText } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';

interface EmailTemplate {
  id: string;
  name: string;
  template_type: string;
  subject: string;
  body_html: string;
  body_text: string;
  is_active: boolean;
  variables: string[];
}

const templateTypes = [
  { value: 'invoice', label: 'Invoice', icon: '📄' },
  { value: 'invoice_reminder', label: 'Invoice Reminder', icon: '⏰' },
  { value: 'quote', label: 'Quote', icon: '📋' },
  { value: 'purchase_order', label: 'Purchase Order', icon: '🛒' },
  { value: 'payment_receipt', label: 'Payment Receipt', icon: '💳' },
  { value: 'statement', label: 'Statement', icon: '📊' },
  { value: 'welcome', label: 'Welcome', icon: '👋' },
];

const availableVariables = [
  { name: '{{customer_name}}', desc: 'Customer full name' },
  { name: '{{company_name}}', desc: 'Your company name' },
  { name: '{{invoice_number}}', desc: 'Invoice number' },
  { name: '{{invoice_date}}', desc: 'Invoice date' },
  { name: '{{due_date}}', desc: 'Payment due date' },
  { name: '{{total_amount}}', desc: 'Total amount due' },
  { name: '{{currency}}', desc: 'Currency code' },
  { name: '{{payment_link}}', desc: 'Online payment link' },
  { name: '{{portal_link}}', desc: 'Customer portal link' },
];

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [formData, setFormData] = useState({
    name: '', template_type: 'invoice', subject: '', body_html: '', body_text: '', is_active: true
  });

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/admin-config/email-templates`);
      const data = await response.json();
      if (data.success) setTemplates(data.data || []);
    } catch (error) {
      setTemplates([
        { id: '1', name: 'Invoice Email', template_type: 'invoice', subject: 'Invoice {{invoice_number}} from {{company_name}}', body_html: '<p>Dear {{customer_name}},</p><p>Please find attached invoice {{invoice_number}} for {{total_amount}}.</p><p>Due date: {{due_date}}</p><p><a href="{{payment_link}}">Pay Now</a></p>', body_text: 'Dear {{customer_name}}, Please find attached invoice {{invoice_number}} for {{total_amount}}. Due date: {{due_date}}', is_active: true, variables: ['customer_name', 'company_name', 'invoice_number', 'total_amount', 'due_date', 'payment_link'] },
        { id: '2', name: 'Payment Reminder', template_type: 'invoice_reminder', subject: 'Reminder: Invoice {{invoice_number}} is overdue', body_html: '<p>Dear {{customer_name}},</p><p>This is a friendly reminder that invoice {{invoice_number}} for {{total_amount}} is now overdue.</p><p><a href="{{payment_link}}">Pay Now</a></p>', body_text: 'Dear {{customer_name}}, This is a friendly reminder that invoice {{invoice_number}} for {{total_amount}} is now overdue.', is_active: true, variables: ['customer_name', 'invoice_number', 'total_amount', 'payment_link'] },
        { id: '3', name: 'Quote Email', template_type: 'quote', subject: 'Quote from {{company_name}}', body_html: '<p>Dear {{customer_name}},</p><p>Thank you for your interest. Please find attached our quote.</p>', body_text: 'Dear {{customer_name}}, Thank you for your interest. Please find attached our quote.', is_active: true, variables: ['customer_name', 'company_name'] },
      ]);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const url = editingTemplate ? `${API_BASE}/api/admin-config/email-templates/${editingTemplate.id}` : `${API_BASE}/api/admin-config/email-templates`;
      const response = await fetch(url, { method: editingTemplate ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await response.json();
      if (data.success) { alert(editingTemplate ? 'Template updated' : 'Template created'); setShowModal(false); setEditingTemplate(null); fetchTemplates(); }
      else alert(data.error || 'Failed to save');
    } catch (error) { alert('Failed to save template'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this email template?')) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin-config/email-templates/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) { alert('Template deleted'); fetchTemplates(); } else alert(data.error || 'Failed to delete');
    } catch (error) { alert('Failed to delete'); }
  };

  const openEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, template_type: template.template_type, subject: template.subject, body_html: template.body_html, body_text: template.body_text, is_active: template.is_active });
    setShowModal(true);
  };

  const insertVariable = (variable: string) => {
    setFormData({ ...formData, body_html: formData.body_html + variable });
  };

  const getTypeConfig = (type: string) => templateTypes.find(t => t.value === type) || { label: type, icon: '📧' };

  const previewHtml = formData.body_html
    .replace(/\{\{customer_name\}\}/g, 'John Smith')
    .replace(/\{\{company_name\}\}/g, 'ARIA ERP')
    .replace(/\{\{invoice_number\}\}/g, 'INV-001')
    .replace(/\{\{invoice_date\}\}/g, 'Jan 15, 2026')
    .replace(/\{\{due_date\}\}/g, 'Feb 15, 2026')
    .replace(/\{\{total_amount\}\}/g, 'R1,150.00')
    .replace(/\{\{currency\}\}/g, 'ZAR')
    .replace(/\{\{payment_link\}\}/g, '#')
    .replace(/\{\{portal_link\}\}/g, '#');

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Email Templates</h1>
          <p className="text-gray-500 mt-1">Customize automated email communications</p>
        </div>
        <button onClick={() => { setEditingTemplate(null); setFormData({ name: '', template_type: 'invoice', subject: '', body_html: '', body_text: '', is_active: true }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-medium"><Plus className="h-4 w-4" />New Template</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg"><Mail className="h-5 w-5 text-indigo-600" /></div><div><p className="text-2xl font-bold">{templates.length}</p><p className="text-sm text-gray-500">Total Templates</p></div></div></div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg"><Send className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{templates.filter(t => t.is_active).length}</p><p className="text-sm text-gray-500">Active</p></div></div></div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg"><FileText className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{templateTypes.length}</p><p className="text-sm text-gray-500">Template Types</p></div></div></div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => {
            const typeConfig = getTypeConfig(template.template_type);
            return (
              <div key={template.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{typeConfig.icon}</span>
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-xs text-gray-500">{typeConfig.label}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${template.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{template.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-3">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Subject:</p>
                    <p className="text-sm truncate">{template.subject}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.variables?.slice(0, 4).map(v => (<span key={v} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded">{`{{${v}}}`}</span>))}
                    {template.variables?.length > 4 && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">+{template.variables.length - 4}</span>}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(template)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-100 text-indigo-600 rounded-lg text-sm"><Edit2 className="h-4 w-4" />Edit</button>
                    <button className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"><Eye className="h-4 w-4" /></button>
                    <button className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"><Copy className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(template.id)} className="flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">{editingTemplate ? 'Edit Email Template' : 'New Email Template'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button onClick={() => setActiveTab('edit')} className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'edit' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}>Edit</button>
              <button onClick={() => setActiveTab('preview')} className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'preview' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}>Preview</button>
            </div>
            <div className="p-6">
              {activeTab === 'edit' ? (
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Template Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
                      <div><label className="block text-sm font-medium mb-1">Template Type</label><select value={formData.template_type} onChange={(e) => setFormData({ ...formData, template_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">{templateTypes.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}</select></div>
                    </div>
                    <div><label className="block text-sm font-medium mb-1">Subject Line</label><input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" placeholder="e.g., Invoice {{invoice_number}} from {{company_name}}" /></div>
                    <div><label className="block text-sm font-medium mb-1">Email Body (HTML)</label><textarea value={formData.body_html} onChange={(e) => setFormData({ ...formData, body_html: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono text-sm" rows={12} /></div>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer"><input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 rounded" /><span>Template is Active</span></label>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <h4 className="font-medium text-indigo-800 dark:text-indigo-200 mb-3">Available Variables</h4>
                      <div className="space-y-2">
                        {availableVariables.map(v => (
                          <button key={v.name} onClick={() => insertVariable(v.name)} className="w-full text-left p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded text-sm">
                            <span className="font-mono text-indigo-600">{v.name}</span>
                            <p className="text-xs text-gray-500">{v.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Subject:</p>
                    <p className="font-medium">{formData.subject.replace(/\{\{customer_name\}\}/g, 'John Smith').replace(/\{\{company_name\}\}/g, 'ARIA ERP').replace(/\{\{invoice_number\}\}/g, 'INV-001')}</p>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} className="prose dark:prose-invert max-w-none" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg">Save Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
