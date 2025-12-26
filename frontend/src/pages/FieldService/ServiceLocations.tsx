import { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Edit, Trash2, Phone, Building, Globe } from 'lucide-react';
import api from '../../lib/api';

interface ServiceLocation {
  id: string;
  name: string;
  customer_id?: string;
  customer_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
  is_active: boolean;
  work_order_count?: number;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
}

export default function ServiceLocations() {
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ServiceLocation | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    customer_id: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'South Africa',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    notes: '',
    is_active: true
  });

  useEffect(() => {
    loadLocations();
    loadCustomers();
  }, []);

  useEffect(() => {
    loadLocations();
  }, [filterCustomer]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      let url = '/odoo/field-service/locations';
      if (filterCustomer) url += `?customer_id=${filterCustomer}`;
      const response = await api.get(url);
      const data = response.data.data || response.data || [];
      setLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get('/erp/master-data/customers');
      const data = response.data.customers || response.data.data || response.data || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        customer_id: formData.customer_id || null
      };
      if (editingLocation) {
        await api.put(`/odoo/field-service/locations/${editingLocation.id}`, payload);
      } else {
        await api.post('/odoo/field-service/locations', payload);
      }
      setShowForm(false);
      setEditingLocation(null);
      resetForm();
      loadLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Error saving location. Please try again.');
    }
  };

  const handleEdit = (location: ServiceLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      customer_id: location.customer_id || '',
      address_line1: location.address_line1 || '',
      address_line2: location.address_line2 || '',
      city: location.city || '',
      state: location.state || '',
      postal_code: location.postal_code || '',
      country: location.country || 'South Africa',
      contact_name: location.contact_name || '',
      contact_phone: location.contact_phone || '',
      contact_email: location.contact_email || '',
      notes: location.notes || '',
      is_active: location.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await api.delete(`/odoo/field-service/locations/${id}`);
      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Error deleting location. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      customer_id: filterCustomer || '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'South Africa',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      notes: '',
      is_active: true
    });
  };

  const filteredLocations = locations.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.city && l.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (l.customer_name && l.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (l.address_line1 && l.address_line1.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getFullAddress = (location: ServiceLocation) => {
    const parts = [
      location.address_line1,
      location.address_line2,
      location.city,
      location.state,
      location.postal_code,
      location.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <MapPin size={28} className="text-orange-500" />
          Service Locations
        </h1>
        <p className="text-gray-600 mt-1">Manage customer service locations for field service dispatch</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Locations</div>
          <div className="text-2xl font-bold text-orange-600">{locations.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {locations.filter(l => l.is_active).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Unique Customers</div>
          <div className="text-2xl font-bold text-blue-600">
            {new Set(locations.map(l => l.customer_id).filter(Boolean)).size}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Work Orders</div>
          <div className="text-2xl font-bold text-purple-600">
            {locations.reduce((sum, l) => sum + (l.work_order_count || 0), 0)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Customers</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditingLocation(null); resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg flex items-center gap-2 hover:bg-orange-700"
          >
            <Plus size={16} />
            Add Location
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {filteredLocations.map((location) => (
            <div key={location.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${!location.is_active ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <MapPin size={20} className="text-orange-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{location.name}</div>
                    {location.customer_name && (
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Building size={12} />
                        {location.customer_name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(location)}
                    className="text-blue-600 hover:text-blue-900 p-1"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(location.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {(location.address_line1 || location.city) && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <Globe size={14} className="text-gray-400 mt-0.5" />
                    <span className="line-clamp-2">{getFullAddress(location)}</span>
                  </div>
                )}
                {location.contact_phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} className="text-gray-400" />
                    {location.contact_phone}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                <span className={`px-2 py-0.5 text-xs rounded-full ${location.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {location.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-sm text-gray-600">
                  {location.work_order_count || 0} work orders
                </span>
              </div>
            </div>
          ))}
        </div>
        {filteredLocations.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {searchTerm || filterCustomer 
              ? 'No locations found matching your criteria' 
              : 'No locations yet. Add your first one!'}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingLocation ? 'Edit Location' : 'Add Location'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Office, Warehouse A"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Address</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={formData.address_line1}
                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    placeholder="Address Line 1"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="text"
                    value={formData.address_line2}
                    onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                    placeholder="Address Line 2"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="Province/State"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      placeholder="Postal Code"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Country"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Contact</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="Contact Name"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="Phone"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <div className="col-span-2">
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="Email"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Access instructions, parking info, etc."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-900">Active</label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingLocation(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
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
