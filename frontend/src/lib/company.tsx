import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';

interface Company {
  id: string;
  name: string;
  code: string;
  vat_number?: string;
  logo_url?: string;
}

interface CompanyContextType {
  currentCompany: Company | null;
  companies: Company[];
  setCurrentCompany: (company: Company) => void;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const defaultCompany: Company = {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Default Company',
        code: 'DEFAULT',
      };
      
      setCompanies([defaultCompany]);
      
      const savedCompanyId = localStorage.getItem('aria_company_id');
      if (savedCompanyId === defaultCompany.id) {
        setCurrentCompanyState(defaultCompany);
      } else {
        setCurrentCompanyState(defaultCompany);
        api.setCompanyId(defaultCompany.id);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      const defaultCompany: Company = {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Default Company',
        code: 'DEFAULT',
      };
      setCompanies([defaultCompany]);
      setCurrentCompanyState(defaultCompany);
      api.setCompanyId(defaultCompany.id);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentCompany = (company: Company) => {
    setCurrentCompanyState(company);
    api.setCompanyId(company.id);
  };

  return (
    <CompanyContext.Provider value={{ currentCompany, companies, setCurrentCompany, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
