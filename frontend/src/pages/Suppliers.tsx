import { useEffect, useState } from 'react'
import api from '../services/api'
import { Plus, Edit, Trash2, Search } from 'lucide-react'

interface Supplier {
  id: string
  supplier_code: string
  supplier_name: string
  name?: string
  email?: string
  phone?: string
  address?: string
  tax_number?: string
  payment_terms?: number
  is_active?: boolean
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [hasCreatedSupplier, setHasCreatedSupplier] = useState(() => {
    return typeof window !== 'undefined' && window.sessionStorage.getItem('hasCreatedSupplier') === 'true'
  })

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      const response = await api.get('/erp/master-data/suppliers')
      const data = response.data.suppliers || response.data.data || response.data
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load suppliers:', error)
      setSuppliers([]) // Set empty array so UI still renders
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return
    try {
      await api.delete(`/erp/master-data/suppliers/${id}`)
      loadSuppliers()
    } catch (error) {
      console.error('Failed to delete supplier:', error)
    }
  }

  const filteredSuppliers = suppliers.filter(
    (s) =>
      (s.supplier_name || s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.supplier_code || s.supplier_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Suppliers</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your supplier relationships</p>
        </div>
        {!showModal && (
          <button
            onClick={() => { setEditingSupplier(null); setShowModal(true) }}
            className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
            data-testid="button-add-supplier"
          >
            <Plus className="h-5 w-5 mr-2" />
            {hasCreatedSupplier ? 'New Supplier' : 'Add Supplier'}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search suppliers..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" data-testid="supplier-table">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{supplier.supplier_code || supplier.supplier_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{supplier.supplier_name || supplier.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{supplier.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{supplier.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      supplier.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {supplier.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => { setEditingSupplier(supplier); setShowModal(true) }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100 mr-3"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSuppliers.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No suppliers found matching your search' : 'No suppliers yet. Create your first one!'}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => setShowModal(false)}
          onSave={() => { 
            setShowModal(false); 
            loadSuppliers(); 
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem('hasCreatedSupplier', 'true')
            }
            setHasCreatedSupplier(true)
          }}
        />
      )}
    </div>
  )
}

function SupplierModal({ supplier, onClose, onSave }: { supplier: Supplier | null, onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState({
    supplier_name: supplier?.supplier_name || supplier?.name || '',
    supplier_code: supplier?.supplier_code || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    tax_number: supplier?.tax_number || '',
    payment_terms: supplier?.payment_terms || 30,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (supplier) {
        await api.put(`/erp/master-data/suppliers/${supplier.id}`, formData)
      } else {
        await api.post('/erp/master-data/suppliers', formData)
      }
      onSave()
    } catch (error) {
      console.error('Failed to save supplier:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
            {supplier ? 'Edit Supplier' : 'Add Supplier'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier Code *</label>
                <input
                  type="text"
                  name="supplier_code"
                  required
                  value={formData.supplier_code}
                  onChange={(e) => setFormData({ ...formData, supplier_code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  disabled={!!supplier}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  name="supplier_name"
                  required
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax Number</label>
                <input
                  type="text"
                  name="tax_number"
                  value={formData.tax_number}
                  onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms (days)</label>
                <input
                  type="number"
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
