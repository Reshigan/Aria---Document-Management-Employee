import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Tenant {
  id: number;
  name: string;
  code: string;
}

export const TenantSwitcher: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const response = await axios.get('/api/tenants');
      setTenants(response.data.tenants || []);
      
      const savedTenantId = localStorage.getItem('current_tenant_id');
      if (savedTenantId) {
        const tenant = response.data.tenants.find((t: Tenant) => t.id === parseInt(savedTenantId));
        setCurrentTenant(tenant || response.data.tenants[0]);
      } else if (response.data.tenants.length > 0) {
        setCurrentTenant(response.data.tenants[0]);
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
    }
  };

  const switchTenant = (tenant: Tenant) => {
    setCurrentTenant(tenant);
    localStorage.setItem('current_tenant_id', tenant.id.toString());
    setShowDropdown(false);
    window.location.reload();
  };

  if (tenants.length <= 1) {
    return null; // Don't show switcher if only one company
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          backgroundColor: 'var(--gray-100)',
          border: '1px solid var(--gray-300)',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>🏢</span>
        <span>{currentTenant?.name || 'Select Company'}</span>
        <span style={{ marginLeft: '0.5rem' }}>▼</span>
      </button>

      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.5rem',
          backgroundColor: 'white',
          border: '1px solid var(--gray-300)',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          minWidth: '250px',
          zIndex: 50
        }}>
          <div style={{ padding: '0.5rem' }}>
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>
              Switch Company
            </div>
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => switchTenant(tenant)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: currentTenant?.id === tenant.id ? 'var(--primary-50)' : 'transparent',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (currentTenant?.id !== tenant.id) {
                    e.currentTarget.style.backgroundColor = 'var(--gray-50)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentTenant?.id !== tenant.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>🏢</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{tenant.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>{tenant.code}</div>
                </div>
                {currentTenant?.id === tenant.id && (
                  <span style={{ marginLeft: 'auto', color: 'var(--primary-600)', fontWeight: 600 }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantSwitcher;
