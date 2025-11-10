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
      
      const response = await fetch('https://aria.vantax.co.za/api/erp/rbac/companies');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch companies: ${response.statusText}`);
      }
      
      const data = await response.json();
      const companiesList = data.companies || [];
      
      if (companiesList.length === 0) {
        throw new Error('No companies found');
      }
      
      const companiesWithCode = companiesList.map((c: any) => ({
        ...c,
        code: c.code || c.name.substring(0, 3).toUpperCase()
      }));
      
      setCompanies(companiesWithCode);
      
      const savedCompanyId = localStorage.getItem('aria_company_id');
      let company = companiesWithCode.find((c: Company) => c.id === savedCompanyId);
      
      if (!company) {
        company = companiesWithCode[0];
      }
      
      setCurrentCompanyState(company);
      api.setCompanyId(company.id);
      localStorage.setItem('aria_company_id', company.id);
    } catch (error) {
      console.error('Error loading companies:', error);
      const defaultCompany: Company = {
        id: 'b0598135-52fd-4f67-ac56-8f0237e6355e',
        name: 'ARIA Demo Company',
        code: 'ARIA',
      };
      setCompanies([defaultCompany]);
      setCurrentCompanyState(defaultCompany);
      api.setCompanyId(defaultCompany.id);
      localStorage.setItem('aria_company_id', defaultCompany.id);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentCompany = (company: Company) => {
    setCurrentCompanyState(company);
    api.setCompanyId(company.id);
    localStorage.setItem('aria_company_id', company.id);
    
    window.dispatchEvent(new CustomEvent('companyChanged', { detail: company }));
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
