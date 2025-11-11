import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, Package, X } from 'lucide-react';

interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
  created_at?: string;
}

interface StockOnHand {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  storage_location_id: string;
  location_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  last_movement_date: string;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

export default function WMSStock() {
  const [activeTab, setActiveTab] = useState<'products' | 'stock' | 'movements'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockOnHand[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    code: '',
    name: '',
    description: '',
    unit_of_measure: 'EA',
    cost_price: 0,
    selling_price: 0,
    is_active: true
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'products') {
      loadProducts();
    } else if (activeTab === 'stock') {
      loadStock();
      loadWarehouses();
    }
  }, [activeTab, searchTerm, warehouseFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      
      const response = await api.get('/api/erp/order-to-cash/products', { params });
      setProducts(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError(err.response?.data?.detail || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadStock = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (warehouseFilter) params.warehouse_id = warehouseFilter;
      
      const response = await api.get('/api/erp/order-to-cash/stock-on-hand', { params });
      setStock(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading stock:', err);
      setError(err.response?.data?.detail || 'Failed to load stock');
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await api.get('/erp/order-to-cash/warehouses');
      setWarehouses(response.data);
    } catch (err) {
      console.error('Error loading warehouses:', err);
    }
  };

  const handleCreate = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      unit_of_measure: 'EA',
      cost_price: 0,
      selling_price: 0,
      is_active: true
    });
    setShowCreateModal(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      description: product.description,
      unit_of_measure: product.unit_of_measure,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      is_active: product.is_active
    });
    setShowEditModal(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;
    
    try {
      await api.delete(`/erp/order-to-cash/products/${selectedProduct.id}`);
      loadProducts();
      setSelectedProduct(null);
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setError(err.response?.data?.detail || 'Failed to delete product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (showEditModal && selectedProduct) {
        await api.put(`/erp/order-to-cash/products/${selectedProduct.id}`, formData);
      } else {
        await api.post('/erp/order-to-cash/products', formData);
      }

      loadProducts();
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedProduct(null);
      setError(null);
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.response?.data?.detail || 'Failed to save product');
    }
  };

  const getTotalValue = () => {
    return stock.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      return sum + (item.quantity_on_hand * (product?.selling_price || 0));
    }, 0);
  };

  const getLowStockCount = () => {
    return stock.filter(item => item.quantity_available < 10).length;
  };

  const renderFormModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    const onClose = () => isEdit ? setShowEditModal(false) : setShowCreateModal(false);

    if (!isOpen) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflow: 'auto'
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            width: '95%',
            maxHeight: '95vh',
            overflow: 'auto',
            margin: '2rem'
          }}
        >
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'white',
            zIndex: 10
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
              {isEdit ? 'Edit Product' : 'Create Product'}
            </h2>
            <button
              onClick={onClose}
              style={{
                padding: '0.25rem',
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ padding: '1.5rem' }}>
              {error && (
                <div style={{
                  padding: '1rem',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.375rem',
                  color: '#991b1b',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Product Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Unit of Measure *
                  </label>
                  <select
                    value={formData.unit_of_measure || 'EA'}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="EA">Each (EA)</option>
                    <option value="KG">Kilogram (KG)</option>
                    <option value="L">Liter (L)</option>
                    <option value="M">Meter (M)</option>
                    <option value="BOX">Box</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Cost Price
                  </label>
                  <input
                    type="number"
                    value={formData.cost_price || 0}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Selling Price *
                  </label>
                  <input
                    type="number"
                    value={formData.selling_price || 0}
                    onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active || false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ width: '1rem', height: '1rem' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Active</span>
                </label>
              </div>
            </div>

            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              position: 'sticky',
              bottom: 0,
              background: 'white'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {isEdit ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>WMS - Inventory Management</h1>
          <p style={{ color: '#6b7280' }}>Manage products, stock levels, and inventory movements</p>
        </div>
        {activeTab === 'products' && (
          <button
            onClick={handleCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Plus size={20} />
            New Product
          </button>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <button
              onClick={() => setActiveTab('products')}
              style={{
                padding: '1rem 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'products' ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === 'products' ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              style={{
                padding: '1rem 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'stock' ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === 'stock' ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Stock on Hand
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              style={{
                padding: '1rem 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'movements' ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === 'movements' ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Stock Movements
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'products' && (
        <>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
                  <Search
                    size={20}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search by code or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                Loading products...
              </div>
            ) : products.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Package size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No products found</h3>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                  {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first product'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleCreate}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Create Product
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Code</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>UOM</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Cost Price</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Selling Price</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{product.code}</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{product.name}</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>{product.description || '-'}</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>{product.unit_of_measure}</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right' }}>
                          R {product.cost_price.toFixed(2)}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                          R {product.selling_price.toFixed(2)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            background: product.is_active ? '#d1fae5' : '#f3f4f6',
                            color: product.is_active ? '#065f46' : '#6b7280'
                          }}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleEdit(product)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: 'transparent',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.25rem',
                                color: '#6b7280',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: 'transparent',
                                border: '1px solid #fecaca',
                                borderRadius: '0.25rem',
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'stock' && (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Total SKUs
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {stock.length}
              </div>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Total Quantity
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {stock.reduce((sum, item) => sum + item.quantity_on_hand, 0).toLocaleString()}
              </div>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Inventory Value
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                R {getTotalValue().toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#ef4444', marginBottom: '0.5rem' }}>
                Low Stock Items
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                {getLowStockCount()}
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <select
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    minWidth: '200px'
                  }}
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                Loading stock data...
              </div>
            ) : stock.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: '#6b7280' }}>No stock found</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Product Code</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Product Name</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Warehouse</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Location</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>On Hand</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Reserved</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Available</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Last Movement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((item) => {
                      const isLowStock = item.quantity_available < 10;
                      return (
                        <tr key={item.id} style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          background: isLowStock ? '#fef2f2' : 'transparent'
                        }}>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{item.product_code}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{item.product_name}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{item.warehouse_name}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>{item.location_name || '-'}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                            {item.quantity_on_hand.toLocaleString()}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', color: '#6b7280' }}>
                            {item.quantity_reserved.toLocaleString()}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500', color: isLowStock ? '#ef4444' : '#10b981' }}>
                            {item.quantity_available.toLocaleString()}
                            {isLowStock && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>⚠️</span>}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                            {item.last_movement_date ? new Date(item.last_movement_date).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'movements' && (
        <div style={{
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <Package size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>Stock Movements</h3>
          <p style={{ color: '#6b7280' }}>Stock movement tracking coming soon</p>
        </div>
      )}

      {renderFormModal(false)}
      {renderFormModal(true)}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete product "${selectedProduct?.name}"? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
