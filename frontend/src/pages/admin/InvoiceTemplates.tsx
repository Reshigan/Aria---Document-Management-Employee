import React, { useState, useEffect } from 'react';
import { Plus, FileText, Palette, Eye, Copy, Trash2, RefreshCw, X, Check } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';

interface Template {
  id: string;
  name: string;
  is_default: boolean;
  template_type: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  show_logo: boolean;
  show_payment_advice: boolean;
  show_tax_summary: boolean;
}

const colorPresets = [
  { name: 'Professional Blue', primary: '#1e40af', secondary: '#64748b' },
  { name: 'Modern Green', primary: '#059669', secondary: '#6b7280' },
  { name: 'Corporate Purple', primary: '#7c3aed', secondary: '#9ca3af' },
  { name: 'Classic Red', primary: '#dc2626', secondary: '#4b5563' },
  { name: 'Elegant Gold', primary: '#d97706', secondary: '#78716c' },
  { name: 'Minimal Gray', primary: '#374151', secondary: '#9ca3af' },
];

const fonts = ['Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Roboto'];

export default function InvoiceTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState<'design' | 'layout' | 'preview'>('design');
  const [formData, setFormData] = useState({
    name: '', template_type: 'invoice', primary_color: '#1e40af', secondary_color: '#64748b',
    font_family: 'Inter', show_logo: true, show_payment_advice: true, show_tax_summary: true, is_default: false
  });

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/admin-config/invoice-templates`);
      const data = await response.json();
      if (data.success) setTemplates(data.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setTemplates([]);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const url = editingTemplate ? `${API_BASE}/api/admin-config/invoice-templates/${editingTemplate.id}` : `${API_BASE}/api/admin-config/invoice-templates`;
      const response = await fetch(url, { method: editingTemplate ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await response.json();
      if (data.success) { alert(editingTemplate ? 'Template updated' : 'Template created'); setShowModal(false); setEditingTemplate(null); fetchTemplates(); }
      else alert(data.error || 'Failed to save');
    } catch (error) { alert('Failed to save template'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin-config/invoice-templates/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) { alert('Template deleted'); fetchTemplates(); } else alert(data.error || 'Failed to delete');
    } catch (error) { alert('Failed to delete'); }
  };

  const openEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, template_type: template.template_type, primary_color: template.primary_color, secondary_color: template.secondary_color, font_family: template.font_family, show_logo: template.show_logo, show_payment_advice: template.show_payment_advice, show_tax_summary: template.show_tax_summary, is_default: template.is_default });
    setShowModal(true);
  };

  return (
    <div className="p-4 space-y-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Invoice Templates</h1>
          <p className="text-gray-500 mt-1">Design and customize your document templates</p>
        </div>
        <button onClick={() => { setEditingTemplate(null); setFormData({ name: '', template_type: 'invoice', primary_color: '#1e40af', secondary_color: '#64748b', font_family: 'Inter', show_logo: true, show_payment_advice: true, show_tax_summary: true, is_default: false }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium"><Plus className="h-4 w-4" />New Template</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-purple-500" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden group">
              <div className="h-32 relative" style={{ background: `linear-gradient(135deg, ${template.primary_color}, ${template.secondary_color})` }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="h-16 w-16 text-white/30" />
                </div>
                {template.is_default && <span className="absolute top-2 right-2 px-2 py-1 bg-white/20 text-white text-xs rounded-full flex items-center gap-1"><Check className="h-3 w-3" />Default</span>}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg">{template.name}</h3>
                <p className="text-xs text-gray-500 capitalize">{template.template_type}</p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: template.primary_color }} />
                  <div className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: template.secondary_color }} />
                  <span className="text-xs text-gray-500 ml-2">{template.font_family}</span>
                </div>
                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(template)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-100 text-purple-600 rounded-lg text-sm"><Palette className="h-4 w-4" />Edit</button>
                  <button className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"><Eye className="h-4 w-4" /></button>
                  <button className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"><Copy className="h-4 w-4" /></button>
                  {!template.is_default && <button onClick={() => handleDelete(template.id)} className="flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">{editingTemplate ? 'Edit Template' : 'New Template'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {(['design', 'layout', 'preview'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-3 text-sm font-medium capitalize ${activeTab === tab ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500'}`}>{tab}</button>
              ))}
            </div>
            <div className="p-6">
              {activeTab === 'design' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-sm font-medium mb-1">Template Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
                    <div><label className="block text-sm font-medium mb-1">Template Type</label><select value={formData.template_type} onChange={(e) => setFormData({ ...formData, template_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"><option value="invoice">Invoice</option><option value="quote">Quote</option><option value="credit_note">Credit Note</option><option value="purchase_order">Purchase Order</option></select></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Color Presets</label>
                    <div className="grid grid-cols-3 gap-2">
                      {colorPresets.map(preset => (
                        <button key={preset.name} onClick={() => setFormData({ ...formData, primary_color: preset.primary, secondary_color: preset.secondary })} className={`p-3 rounded-lg border-2 ${formData.primary_color === preset.primary ? 'border-purple-500' : 'border-gray-200'}`}>
                          <div className="flex gap-1 mb-1"><div className="w-4 h-4 rounded" style={{ backgroundColor: preset.primary }} /><div className="w-4 h-4 rounded" style={{ backgroundColor: preset.secondary }} /></div>
                          <span className="text-xs">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-sm font-medium mb-1">Primary Color</label><input type="color" value={formData.primary_color} onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer" /></div>
                    <div><label className="block text-sm font-medium mb-1">Secondary Color</label><input type="color" value={formData.secondary_color} onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer" /></div>
                  </div>
                  <div><label className="block text-sm font-medium mb-1">Font Family</label><select value={formData.font_family} onChange={(e) => setFormData({ ...formData, font_family: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">{fonts.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                </div>
              )}
              {activeTab === 'layout' && (
                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer"><input type="checkbox" checked={formData.show_logo} onChange={(e) => setFormData({ ...formData, show_logo: e.target.checked })} className="w-5 h-5 rounded" /><span>Show Company Logo</span></label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer"><input type="checkbox" checked={formData.show_payment_advice} onChange={(e) => setFormData({ ...formData, show_payment_advice: e.target.checked })} className="w-5 h-5 rounded" /><span>Show Payment Advice</span></label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer"><input type="checkbox" checked={formData.show_tax_summary} onChange={(e) => setFormData({ ...formData, show_tax_summary: e.target.checked })} className="w-5 h-5 rounded" /><span>Show Tax Summary</span></label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer"><input type="checkbox" checked={formData.is_default} onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })} className="w-5 h-5 rounded" /><span>Set as Default Template</span></label>
                </div>
              )}
              {activeTab === 'preview' && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4" style={{ fontFamily: formData.font_family }}>
                  <div className="flex justify-between items-start mb-6">
                    <div><div className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: formData.primary_color }}>LOGO</div></div>
                    <div className="text-right"><h2 className="text-2xl font-bold" style={{ color: formData.primary_color }}>INVOICE</h2><p className="text-gray-500">INV-001</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div><p className="text-sm font-medium" style={{ color: formData.secondary_color }}>Bill To:</p><p className="font-semibold">Customer Name</p><p className="text-xs text-gray-500">123 Street, City</p></div>
                    <div className="text-right"><p className="text-sm" style={{ color: formData.secondary_color }}>Date: Jan 15, 2026</p><p className="text-sm" style={{ color: formData.secondary_color }}>Due: Feb 15, 2026</p></div>
                  </div>
                  <table className="w-full mb-6">
                    <thead><tr style={{ backgroundColor: formData.primary_color }} className="text-white"><th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Total</th></tr></thead>
                    <tbody><tr className="border-b"><td className="p-2">Sample Item</td><td className="p-2 text-right">1</td><td className="p-2 text-right">R1,000.00</td><td className="p-2 text-right">R1,000.00</td></tr></tbody>
                  </table>
                  {formData.show_tax_summary && <div className="text-right mb-4"><p className="text-sm">Subtotal: R1,000.00</p><p className="text-sm">VAT (15%): R150.00</p><p className="font-bold text-lg" style={{ color: formData.primary_color }}>Total: R1,150.00</p></div>}
                  {formData.show_payment_advice && <div className="p-4 rounded-lg" style={{ backgroundColor: `${formData.primary_color}10` }}><p className="text-sm font-medium" style={{ color: formData.primary_color }}>Payment Details</p><p className="text-sm">Bank: First National Bank | Account: 1234567890</p></div>}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg">Save Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
