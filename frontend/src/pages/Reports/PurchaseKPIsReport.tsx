import React, { useEffect, useState } from 'react';
import { TrendingDown, DollarSign, Package, Users } from 'lucide-react';

interface PurchaseKPI {
  total_spend: number;
  total_orders: number;
  avg_order_value: number;
  total_suppliers: number;
  top_suppliers: Array<{ supplier: string; orders: number; spend: number }>;
  spend_by_month: Array<{ month: string; spend: number }>;
}

export const PurchaseKPIsReport: React.FC = () => {
  const [data, setData] = useState<PurchaseKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const companyId = localStorage.getItem('company_id') || '1';
        
        const response = await fetch(
          `/api/reports/purchase-kpis?company_id=${companyId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch purchase KPIs');
        }

        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading purchase KPIs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', color: '#991b1b' }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No purchase data available</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Purchase KPIs</h1>
        <p style={{ color: '#6b7280' }}>Key performance indicators for procurement operations</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#fee2e2', borderRadius: '8px', padding: '0.5rem' }}>
              <DollarSign size={24} color="#dc2626" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Spend</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                ${data.total_spend.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#dbeafe', borderRadius: '8px', padding: '0.5rem' }}>
              <Package size={24} color="#1e40af" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Orders</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                {data.total_orders.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '0.5rem' }}>
              <TrendingDown size={24} color="#d97706" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Avg Order Value</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                ${data.avg_order_value.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#e0e7ff', borderRadius: '8px', padding: '0.5rem' }}>
              <Users size={24} color="#4f46e5" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Suppliers</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                {data.total_suppliers.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {data.top_suppliers && data.top_suppliers.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Top Suppliers</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Supplier</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Orders</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Total Spend</th>
                </tr>
              </thead>
              <tbody>
                {data.top_suppliers.map((supplier, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{supplier.supplier}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>{supplier.orders}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>
                      ${supplier.spend.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseKPIsReport;
