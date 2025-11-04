import { useState, useEffect } from 'react';
import axios from 'axios';

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

interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

export default function WMSStock() {
  const [stock, setStock] = useState<StockOnHand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, [warehouseFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (warehouseFilter) params.warehouse_id = warehouseFilter;
      
      const [stockRes, productsRes, warehousesRes] = await Promise.all([
        axios.get('/api/erp/order-to-cash/stock-on-hand', { params }),
        axios.get('/api/erp/order-to-cash/products'),
        axios.get('/api/erp/order-to-cash/warehouses')
      ]);
      
      setStock(stockRes.data);
      setProducts(productsRes.data);
      setWarehouses(warehousesRes.data);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
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

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>WMS - Stock Management</h1>
        <p style={{ color: '#6b7280' }}>Monitor inventory levels and stock movements</p>
      </div>

      {/* Summary Cards */}
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

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
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
        <button
          onClick={fetchData}
          style={{
            padding: '0.5rem 1.5rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      {/* Stock Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading stock data...</div>
      ) : stock.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6b7280' }}>No stock found</p>
        </div>
      ) : (
        <div style={{ 
          background: 'white', 
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
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
  );
}
