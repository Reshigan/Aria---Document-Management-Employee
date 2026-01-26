import { useState, useEffect } from 'react';
import { Sliders, Plus, Search, Edit, Trash2, Tag } from 'lucide-react';
import api from '../../lib/api';

interface Attribute {
  id: string;
  name: string;
  display_type: string;
  create_variant: string;
  sequence: number;
  is_active: boolean;
  value_count?: number;
  created_at: string;
}

interface AttributeValue {
  id: string;
  attribute_id: string;
  name: string;
  html_color?: string;
  sequence: number;
  is_active: boolean;
}

export default function ProductAttributes() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [values, setValues] = useState<AttributeValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAttrForm, setShowAttrForm] = useState(false);
  const [showValueForm, setShowValueForm] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [editingValue, setEditingValue] = useState<AttributeValue | null>(null);
  const [attrFormData, setAttrFormData] = useState({
    name: '',
    display_type: 'select',
    create_variant: 'always',
    sequence: 0,
    is_active: true
  });
  const [valueFormData, setValueFormData] = useState({
    name: '',
    html_color: '',
    sequence: 0,
    is_active: true
  });

  useEffect(() => {
    loadAttributes();
  }, []);

  useEffect(() => {
    if (selectedAttribute) {
      loadValues(selectedAttribute.id);
    }
  }, [selectedAttribute]);

  const loadAttributes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/odoo/products/attributes');
      const data = response.data.data || response.data || [];
      setAttributes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading attributes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadValues = async (attributeId: string) => {
    try {
      const response = await api.get(`/odoo/products/attributes/${attributeId}/values`);
      const data = response.data.data || response.data || [];
      setValues(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading values:', error);
    }
  };

  const handleAttrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAttribute) {
        await api.put(`/odoo/products/attributes/${editingAttribute.id}`, attrFormData);
      } else {
        await api.post('/odoo/products/attributes', attrFormData);
      }
      setShowAttrForm(false);
      setEditingAttribute(null);
      resetAttrForm();
      loadAttributes();
    } catch (error) {
      console.error('Error saving attribute:', error);
      alert('Error saving attribute. Please try again.');
    }
  };

  const handleValueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttribute) return;
    try {
      if (editingValue) {
        await api.put(`/odoo/products/attributes/${selectedAttribute.id}/values/${editingValue.id}`, valueFormData);
      } else {
        await api.post(`/odoo/products/attributes/${selectedAttribute.id}/values`, valueFormData);
      }
      setShowValueForm(false);
      setEditingValue(null);
      resetValueForm();
      loadValues(selectedAttribute.id);
      loadAttributes();
    } catch (error) {
      console.error('Error saving value:', error);
      alert('Error saving value. Please try again.');
    }
  };

  const handleDeleteAttribute = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attribute?')) return;
    try {
      await api.delete(`/odoo/products/attributes/${id}`);
      if (selectedAttribute?.id === id) {
        setSelectedAttribute(null);
        setValues([]);
      }
      loadAttributes();
    } catch (error) {
      console.error('Error deleting attribute:', error);
      alert('Error deleting attribute. Please try again.');
    }
  };

  const handleDeleteValue = async (valueId: string) => {
    if (!selectedAttribute) return;
    if (!confirm('Are you sure you want to delete this value?')) return;
    try {
      await api.delete(`/odoo/products/attributes/${selectedAttribute.id}/values/${valueId}`);
      loadValues(selectedAttribute.id);
      loadAttributes();
    } catch (error) {
      console.error('Error deleting value:', error);
      alert('Error deleting value. Please try again.');
    }
  };

  const resetAttrForm = () => {
    setAttrFormData({
      name: '',
      display_type: 'select',
      create_variant: 'always',
      sequence: 0,
      is_active: true
    });
  };

  const resetValueForm = () => {
    setValueFormData({
      name: '',
      html_color: '',
      sequence: 0,
      is_active: true
    });
  };

  const filteredAttributes = attributes.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayTypeLabels: Record<string, string> = {
    radio: 'Radio Buttons',
    select: 'Dropdown',
    color: 'Color Picker',
    pills: 'Pills'
  };

  const variantLabels: Record<string, string> = {
    always: 'Always Create',
    dynamic: 'Dynamic',
    no_variant: 'Never Create'
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Sliders size={28} className="text-purple-500" />
          Product Attributes
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Define product attributes like Size, Color, Material for variant generation</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Attributes List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b flex gap-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search attributes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={() => { setEditingAttribute(null); resetAttrForm(); setShowAttrForm(true); }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading attributes...</div>
          ) : filteredAttributes.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No attributes found' : 'No attributes yet. Create your first one!'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredAttributes.map((attr) => (
                <div
                  key={attr.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedAttribute?.id === attr.id ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                  }`}
                  onClick={() => setSelectedAttribute(attr)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{attr.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {displayTypeLabels[attr.display_type]} | {variantLabels[attr.create_variant]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs rounded-full">
                        {attr.value_count || 0} values
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingAttribute(attr); setAttrFormData({
                          name: attr.name,
                          display_type: attr.display_type,
                          create_variant: attr.create_variant,
                          sequence: attr.sequence,
                          is_active: attr.is_active
                        }); setShowAttrForm(true); }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAttribute(attr.id); }}
                        className="text-red-600 dark:text-red-400 hover:text-red-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attribute Values */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {selectedAttribute ? `Values for "${selectedAttribute.name}"` : 'Select an Attribute'}
            </h2>
            {selectedAttribute && (
              <button
                onClick={() => { setEditingValue(null); resetValueForm(); setShowValueForm(true); }}
                className="px-3 py-1 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700 text-sm"
              >
                <Plus size={14} />
                Add Value
              </button>
            )}
          </div>

          {!selectedAttribute ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Select an attribute to view and manage its values
            </div>
          ) : values.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No values yet. Add values to this attribute.
            </div>
          ) : (
            <div className="divide-y">
              {values.map((value) => (
                <div key={value.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                  <div className="flex items-center gap-3">
                    {value.html_color && (
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: value.html_color }}
                      />
                    )}
                    <Tag size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">{value.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      value.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {value.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => { setEditingValue(value); setValueFormData({
                        name: value.name,
                        html_color: value.html_color || '',
                        sequence: value.sequence,
                        is_active: value.is_active
                      }); setShowValueForm(true); }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteValue(value.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attribute Form Modal */}
      {showAttrForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingAttribute ? 'Edit Attribute' : 'Add Attribute'}
            </h2>
            <form onSubmit={handleAttrSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={attrFormData.name}
                  onChange={(e) => setAttrFormData({ ...attrFormData, name: e.target.value })}
                  placeholder="e.g., Size, Color, Material"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Type</label>
                <select
                  value={attrFormData.display_type}
                  onChange={(e) => setAttrFormData({ ...attrFormData, display_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="select">Dropdown</option>
                  <option value="radio">Radio Buttons</option>
                  <option value="color">Color Picker</option>
                  <option value="pills">Pills</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Variant Creation</label>
                <select
                  value={attrFormData.create_variant}
                  onChange={(e) => setAttrFormData({ ...attrFormData, create_variant: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="always">Always Create Variant</option>
                  <option value="dynamic">Dynamic (On Demand)</option>
                  <option value="no_variant">Never Create Variant</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sequence</label>
                <input
                  type="number"
                  value={attrFormData.sequence}
                  onChange={(e) => setAttrFormData({ ...attrFormData, sequence: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={attrFormData.is_active}
                  onChange={(e) => setAttrFormData({ ...attrFormData, is_active: e.target.checked })}
                  className="h-4 w-4 text-purple-600 dark:text-purple-400 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label className="ml-2 text-sm text-gray-900 dark:text-white">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAttrForm(false); setEditingAttribute(null); resetAttrForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Value Form Modal */}
      {showValueForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingValue ? 'Edit Value' : 'Add Value'}
            </h2>
            <form onSubmit={handleValueSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value Name *</label>
                <input
                  type="text"
                  required
                  value={valueFormData.name}
                  onChange={(e) => setValueFormData({ ...valueFormData, name: e.target.value })}
                  placeholder="e.g., Small, Red, Cotton"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              {selectedAttribute?.display_type === 'color' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={valueFormData.html_color || '#000000'}
                      onChange={(e) => setValueFormData({ ...valueFormData, html_color: e.target.value })}
                      className="h-10 w-20 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={valueFormData.html_color}
                      onChange={(e) => setValueFormData({ ...valueFormData, html_color: e.target.value })}
                      placeholder="#FF0000"
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sequence</label>
                <input
                  type="number"
                  value={valueFormData.sequence}
                  onChange={(e) => setValueFormData({ ...valueFormData, sequence: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={valueFormData.is_active}
                  onChange={(e) => setValueFormData({ ...valueFormData, is_active: e.target.checked })}
                  className="h-4 w-4 text-purple-600 dark:text-purple-400 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label className="ml-2 text-sm text-gray-900 dark:text-white">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowValueForm(false); setEditingValue(null); resetValueForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
