/**
 * Data Seeding Service
 * Handles initial data setup and demo data generation for the ARIA ERP system
 */

import { apiClient } from '../utils/api';

export interface SeedingProgress {
  module: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  recordsCreated: number;
  totalRecords: number;
  error?: string;
}

export interface SeedingResult {
  success: boolean;
  modulesSeeded: string[];
  totalRecordsCreated: number;
  errors: Array<{ module: string; error: string }>;
  duration: number;
}

export interface CompanySetupData {
  companyName: string;
  registrationNumber?: string;
  vatNumber?: string;
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  industry?: string;
  financialYearEnd?: number; // Month (1-12)
  currency: string;
  timezone: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    branchCode: string;
    accountType: string;
  };
}

export interface SeedingOptions {
  includeDemoData?: boolean;
  demoDataSize?: 'small' | 'medium' | 'large';
  modules?: string[];
  skipExisting?: boolean;
}

class DataSeedingService {
  private baseUrl = '/api/seeding';

  /**
   * Initialize company with basic setup data
   */
  async initializeCompany(companyData: CompanySetupData): Promise<{
    success: boolean;
    companyId?: string;
    error?: string;
  }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/company`, companyData);
      return { success: true, companyId: response.data.companyId };
    } catch (error) {
      console.error('Error initializing company:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize company',
      };
    }
  }

  /**
   * Seed essential master data (chart of accounts, tax rates, payment terms, etc.)
   */
  async seedMasterData(options: SeedingOptions = {}): Promise<SeedingResult> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/master-data`, options);
      return response.data;
    } catch (error) {
      console.error('Error seeding master data:', error);
      return this.createMasterDataLocally(options);
    }
  }

  /**
   * Seed demo data for testing and training
   */
  async seedDemoData(
    options: SeedingOptions = { demoDataSize: 'medium' }
  ): Promise<SeedingResult> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/demo-data`, options);
      return response.data;
    } catch (error) {
      console.error('Error seeding demo data:', error);
      return this.createDemoDataLocally(options);
    }
  }

  /**
   * Get seeding progress
   */
  async getSeedingProgress(): Promise<SeedingProgress[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/progress`);
      return response.data;
    } catch (error) {
      console.error('Error fetching seeding progress:', error);
      return [];
    }
  }

  /**
   * Reset all data (dangerous - requires confirmation)
   */
  async resetAllData(confirmationCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/reset`, { confirmationCode });
      return { success: response.data.success };
    } catch (error) {
      console.error('Error resetting data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset data',
      };
    }
  }

  /**
   * Check if initial setup is required
   */
  async isSetupRequired(): Promise<boolean> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/status`);
      return response.data.setupRequired;
    } catch (error) {
      console.error('Error checking setup status:', error);
      return true; // Assume setup is required if we can't check
    }
  }

  /**
   * Get available seed data templates
   */
  async getAvailableTemplates(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    industry: string;
    modules: string[];
  }>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/templates`);
      return response.data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      return this.getDefaultTemplates();
    }
  }

  /**
   * Apply a seed data template
   */
  async applyTemplate(templateId: string): Promise<SeedingResult> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/templates/${templateId}/apply`);
      return response.data;
    } catch (error) {
      console.error('Error applying template:', error);
      throw error;
    }
  }

  /**
   * Create master data locally (fallback)
   */
  private async createMasterDataLocally(options: SeedingOptions): Promise<SeedingResult> {
    const startTime = Date.now();
    const errors: Array<{ module: string; error: string }> = [];
    const modulesSeeded: string[] = [];
    let totalRecordsCreated = 0;

    // Chart of Accounts
    try {
      const accounts = this.getDefaultChartOfAccounts();
      for (const account of accounts) {
        await apiClient.post('/api/chart-of-accounts', account);
        totalRecordsCreated++;
      }
      modulesSeeded.push('chart_of_accounts');
    } catch (error) {
      errors.push({ module: 'chart_of_accounts', error: String(error) });
    }

    // Tax Rates
    try {
      const taxRates = this.getDefaultTaxRates();
      for (const rate of taxRates) {
        await apiClient.post('/api/tax-rates', rate);
        totalRecordsCreated++;
      }
      modulesSeeded.push('tax_rates');
    } catch (error) {
      errors.push({ module: 'tax_rates', error: String(error) });
    }

    // Payment Terms
    try {
      const terms = this.getDefaultPaymentTerms();
      for (const term of terms) {
        await apiClient.post('/api/payment-terms', term);
        totalRecordsCreated++;
      }
      modulesSeeded.push('payment_terms');
    } catch (error) {
      errors.push({ module: 'payment_terms', error: String(error) });
    }

    // Currencies
    try {
      const currencies = this.getDefaultCurrencies();
      for (const currency of currencies) {
        await apiClient.post('/api/currencies', currency);
        totalRecordsCreated++;
      }
      modulesSeeded.push('currencies');
    } catch (error) {
      errors.push({ module: 'currencies', error: String(error) });
    }

    return {
      success: errors.length === 0,
      modulesSeeded,
      totalRecordsCreated,
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Create demo data locally (fallback)
   */
  private async createDemoDataLocally(options: SeedingOptions): Promise<SeedingResult> {
    const startTime = Date.now();
    const errors: Array<{ module: string; error: string }> = [];
    const modulesSeeded: string[] = [];
    let totalRecordsCreated = 0;

    const size = options.demoDataSize || 'medium';
    const counts = {
      small: { customers: 5, suppliers: 3, products: 10, invoices: 5 },
      medium: { customers: 20, suppliers: 10, products: 50, invoices: 20 },
      large: { customers: 100, suppliers: 50, products: 200, invoices: 100 },
    };

    const count = counts[size];

    // Demo Customers
    try {
      const customers = this.generateDemoCustomers(count.customers);
      for (const customer of customers) {
        await apiClient.post('/erp/master-data/customers', customer);
        totalRecordsCreated++;
      }
      modulesSeeded.push('customers');
    } catch (error) {
      errors.push({ module: 'customers', error: String(error) });
    }

    // Demo Suppliers
    try {
      const suppliers = this.generateDemoSuppliers(count.suppliers);
      for (const supplier of suppliers) {
        await apiClient.post('/erp/master-data/suppliers', supplier);
        totalRecordsCreated++;
      }
      modulesSeeded.push('suppliers');
    } catch (error) {
      errors.push({ module: 'suppliers', error: String(error) });
    }

    // Demo Products
    try {
      const products = this.generateDemoProducts(count.products);
      for (const product of products) {
        await apiClient.post('/erp/order-to-cash/products', product);
        totalRecordsCreated++;
      }
      modulesSeeded.push('products');
    } catch (error) {
      errors.push({ module: 'products', error: String(error) });
    }

    return {
      success: errors.length === 0,
      modulesSeeded,
      totalRecordsCreated,
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get default chart of accounts
   */
  private getDefaultChartOfAccounts(): Array<{
    code: string;
    name: string;
    type: string;
    category: string;
  }> {
    return [
      // Assets
      { code: '1000', name: 'Cash on Hand', type: 'asset', category: 'current_asset' },
      { code: '1010', name: 'Bank Account - Current', type: 'asset', category: 'current_asset' },
      { code: '1020', name: 'Bank Account - Savings', type: 'asset', category: 'current_asset' },
      { code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'current_asset' },
      { code: '1200', name: 'Inventory', type: 'asset', category: 'current_asset' },
      { code: '1300', name: 'Prepaid Expenses', type: 'asset', category: 'current_asset' },
      { code: '1500', name: 'Fixed Assets', type: 'asset', category: 'fixed_asset' },
      { code: '1510', name: 'Accumulated Depreciation', type: 'asset', category: 'fixed_asset' },
      // Liabilities
      { code: '2000', name: 'Accounts Payable', type: 'liability', category: 'current_liability' },
      { code: '2100', name: 'VAT Payable', type: 'liability', category: 'current_liability' },
      { code: '2200', name: 'PAYE Payable', type: 'liability', category: 'current_liability' },
      { code: '2300', name: 'UIF Payable', type: 'liability', category: 'current_liability' },
      { code: '2400', name: 'Accrued Expenses', type: 'liability', category: 'current_liability' },
      { code: '2500', name: 'Short-term Loans', type: 'liability', category: 'current_liability' },
      { code: '2600', name: 'Long-term Loans', type: 'liability', category: 'long_term_liability' },
      // Equity
      { code: '3000', name: 'Share Capital', type: 'equity', category: 'equity' },
      { code: '3100', name: 'Retained Earnings', type: 'equity', category: 'equity' },
      { code: '3200', name: 'Current Year Earnings', type: 'equity', category: 'equity' },
      // Revenue
      { code: '4000', name: 'Sales Revenue', type: 'revenue', category: 'operating_revenue' },
      { code: '4100', name: 'Service Revenue', type: 'revenue', category: 'operating_revenue' },
      { code: '4200', name: 'Interest Income', type: 'revenue', category: 'other_income' },
      { code: '4300', name: 'Other Income', type: 'revenue', category: 'other_income' },
      // Expenses
      { code: '5000', name: 'Cost of Goods Sold', type: 'expense', category: 'cost_of_sales' },
      { code: '5100', name: 'Direct Labour', type: 'expense', category: 'cost_of_sales' },
      { code: '6000', name: 'Salaries & Wages', type: 'expense', category: 'operating_expense' },
      { code: '6100', name: 'Rent Expense', type: 'expense', category: 'operating_expense' },
      { code: '6200', name: 'Utilities', type: 'expense', category: 'operating_expense' },
      { code: '6300', name: 'Insurance', type: 'expense', category: 'operating_expense' },
      { code: '6400', name: 'Office Supplies', type: 'expense', category: 'operating_expense' },
      { code: '6500', name: 'Marketing & Advertising', type: 'expense', category: 'operating_expense' },
      { code: '6600', name: 'Professional Fees', type: 'expense', category: 'operating_expense' },
      { code: '6700', name: 'Depreciation Expense', type: 'expense', category: 'operating_expense' },
      { code: '6800', name: 'Bank Charges', type: 'expense', category: 'operating_expense' },
      { code: '6900', name: 'Interest Expense', type: 'expense', category: 'finance_cost' },
    ];
  }

  /**
   * Get default tax rates (South Africa)
   */
  private getDefaultTaxRates(): Array<{
    name: string;
    rate: number;
    type: string;
    isDefault: boolean;
  }> {
    return [
      { name: 'Standard VAT', rate: 15, type: 'vat', isDefault: true },
      { name: 'Zero Rated', rate: 0, type: 'vat', isDefault: false },
      { name: 'Exempt', rate: 0, type: 'exempt', isDefault: false },
    ];
  }

  /**
   * Get default payment terms
   */
  private getDefaultPaymentTerms(): Array<{
    name: string;
    days: number;
    description: string;
    isDefault: boolean;
  }> {
    return [
      { name: 'Due on Receipt', days: 0, description: 'Payment due immediately', isDefault: false },
      { name: 'Net 7', days: 7, description: 'Payment due in 7 days', isDefault: false },
      { name: 'Net 14', days: 14, description: 'Payment due in 14 days', isDefault: false },
      { name: 'Net 30', days: 30, description: 'Payment due in 30 days', isDefault: true },
      { name: 'Net 60', days: 60, description: 'Payment due in 60 days', isDefault: false },
      { name: 'Net 90', days: 90, description: 'Payment due in 90 days', isDefault: false },
    ];
  }

  /**
   * Get default currencies
   */
  private getDefaultCurrencies(): Array<{
    code: string;
    name: string;
    symbol: string;
    isDefault: boolean;
  }> {
    return [
      { code: 'ZAR', name: 'South African Rand', symbol: 'R', isDefault: true },
      { code: 'USD', name: 'US Dollar', symbol: '$', isDefault: false },
      { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false },
      { code: 'GBP', name: 'British Pound', symbol: '£', isDefault: false },
    ];
  }

  /**
   * Generate demo customers
   */
  private generateDemoCustomers(count: number): Array<Record<string, unknown>> {
    const customers: Array<Record<string, unknown>> = [];
    const industries = ['Retail', 'Manufacturing', 'Services', 'Technology', 'Healthcare'];
    const cities = ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth'];

    for (let i = 1; i <= count; i++) {
      customers.push({
        name: `Demo Customer ${i}`,
        email: `customer${i}@demo.com`,
        phone: `+27 11 ${String(i).padStart(3, '0')} ${String(i * 11).padStart(4, '0')}`,
        address: `${i * 10} Demo Street, ${cities[i % cities.length]}, South Africa`,
        industry: industries[i % industries.length],
        vatNumber: i % 3 === 0 ? `VAT${String(i).padStart(10, '0')}` : undefined,
        creditLimit: (i % 5 + 1) * 50000,
        paymentTerms: 'Net 30',
      });
    }

    return customers;
  }

  /**
   * Generate demo suppliers
   */
  private generateDemoSuppliers(count: number): Array<Record<string, unknown>> {
    const suppliers: Array<Record<string, unknown>> = [];
    const categories = ['Raw Materials', 'Office Supplies', 'Equipment', 'Services', 'Packaging'];

    for (let i = 1; i <= count; i++) {
      suppliers.push({
        name: `Demo Supplier ${i}`,
        email: `supplier${i}@demo.com`,
        phone: `+27 21 ${String(i).padStart(3, '0')} ${String(i * 22).padStart(4, '0')}`,
        address: `${i * 5} Supplier Road, Industrial Area, South Africa`,
        category: categories[i % categories.length],
        vatNumber: `VAT${String(i + 1000).padStart(10, '0')}`,
        paymentTerms: 'Net 30',
        bankName: 'Demo Bank',
        accountNumber: `${String(i).padStart(10, '0')}`,
        branchCode: '250655',
      });
    }

    return suppliers;
  }

  /**
   * Generate demo products
   */
  private generateDemoProducts(count: number): Array<Record<string, unknown>> {
    const products: Array<Record<string, unknown>> = [];
    const categories = ['Electronics', 'Office', 'Industrial', 'Consumables', 'Services'];
    const units = ['Each', 'Box', 'Pack', 'Kg', 'Hour'];

    for (let i = 1; i <= count; i++) {
      const isService = i % 10 === 0;
      products.push({
        sku: `PROD-${String(i).padStart(5, '0')}`,
        name: isService ? `Demo Service ${i}` : `Demo Product ${i}`,
        description: `This is a demo ${isService ? 'service' : 'product'} for testing purposes`,
        category: categories[i % categories.length],
        unit: units[i % units.length],
        costPrice: Math.round((i * 10 + Math.random() * 100) * 100) / 100,
        sellingPrice: Math.round((i * 15 + Math.random() * 150) * 100) / 100,
        taxRate: 15,
        isService,
        trackInventory: !isService,
        reorderLevel: isService ? 0 : Math.floor(i / 2) + 5,
        reorderQuantity: isService ? 0 : Math.floor(i / 2) + 10,
      });
    }

    return products;
  }

  /**
   * Get default templates
   */
  private getDefaultTemplates(): Array<{
    id: string;
    name: string;
    description: string;
    industry: string;
    modules: string[];
  }> {
    return [
      {
        id: 'retail',
        name: 'Retail Business',
        description: 'Template for retail businesses with inventory management',
        industry: 'Retail',
        modules: ['inventory', 'sales', 'purchasing', 'pos'],
      },
      {
        id: 'services',
        name: 'Professional Services',
        description: 'Template for service-based businesses',
        industry: 'Services',
        modules: ['projects', 'timesheets', 'invoicing', 'crm'],
      },
      {
        id: 'manufacturing',
        name: 'Manufacturing',
        description: 'Template for manufacturing businesses',
        industry: 'Manufacturing',
        modules: ['inventory', 'bom', 'production', 'quality'],
      },
      {
        id: 'distribution',
        name: 'Distribution',
        description: 'Template for wholesale and distribution',
        industry: 'Distribution',
        modules: ['inventory', 'warehousing', 'sales', 'purchasing'],
      },
    ];
  }
}

export const dataSeedingService = new DataSeedingService();
export default dataSeedingService;
