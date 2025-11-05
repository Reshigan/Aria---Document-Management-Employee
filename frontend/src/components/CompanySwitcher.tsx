import React from 'react';
import { useCompany } from '../lib/company';
import { Building2, ChevronDown } from 'lucide-react';

export function CompanySwitcher() {
  const { currentCompany, companies, setCurrentCompany, loading } = useCompany();

  if (loading || !currentCompany) {
    return (
      <div style={{ padding: '0.5rem 1rem', color: 'var(--gray-600)', fontSize: '0.875rem' }}>
        Loading...
      </div>
    );
  }

  if (companies.length === 1) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        backgroundColor: 'var(--gray-100)',
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        fontWeight: 500
      }}>
        <Building2 size={16} />
        <span>{currentCompany.name}</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <select
        value={currentCompany.id}
        onChange={(e) => {
          const company = companies.find(c => c.id === e.target.value);
          if (company) {
            setCurrentCompany(company);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 2rem 0.5rem 1rem',
          backgroundColor: 'var(--gray-100)',
          border: '1px solid var(--gray-300)',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.5rem center',
          backgroundSize: '1rem',
        }}
      >
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name} ({company.code})
          </option>
        ))}
      </select>
    </div>
  );
}
