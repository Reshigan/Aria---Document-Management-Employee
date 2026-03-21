/**
 * Company Setup Wizard
 * Multi-step wizard for first-time company configuration
 * Covers: Company Info, Financial Settings, Chart of Accounts, Tax Rates, 
 * Payment Terms, Bank Accounts, Users, Email Templates
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Calendar, BookOpen, Receipt, CreditCard, Landmark,
  Users, Mail, CheckCircle, ChevronRight, ChevronLeft, Loader2,
  Globe, Phone, MapPin, FileText, Shield, Sparkles, ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/button';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';

// Step configuration
const WIZARD_STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles, description: 'Get started with ARIA' },
  { id: 'company', title: 'Company Info', icon: Building2, description: 'Basic company details' },
  { id: 'financial', title: 'Financial Year', icon: Calendar, description: 'Financial settings' },
  { id: 'accounts', title: 'Chart of Accounts', icon: BookOpen, description: 'Account structure' },
  { id: 'tax', title: 'Tax Rates', icon: Receipt, description: 'VAT and tax settings' },
  { id: 'terms', title: 'Payment Terms', icon: CreditCard, description: 'Invoice payment terms' },
  { id: 'banking', title: 'Bank Accounts', icon: Landmark, description: 'Banking details' },
  { id: 'users', title: 'Users & Roles', icon: Users, description: 'Team members' },
  { id: 'email', title: 'Email Templates', icon: Mail, description: 'Communication templates' },
  { id: 'complete', title: 'Complete', icon: CheckCircle, description: 'Review and finish' },
];

// Chart of Accounts templates
const COA_TEMPLATES = [
  { id: 'standard', name: 'Standard Business', description: 'General business chart of accounts suitable for most companies', accounts: 45 },
  { id: 'retail', name: 'Retail & Commerce', description: 'Optimized for retail businesses with inventory tracking', accounts: 52 },
  { id: 'services', name: 'Professional Services', description: 'For consulting, legal, and professional service firms', accounts: 38 },
  { id: 'manufacturing', name: 'Manufacturing', description: 'Includes cost of goods, WIP, and production accounts', accounts: 65 },
  { id: 'nonprofit', name: 'Non-Profit', description: 'Fund accounting structure for non-profit organizations', accounts: 42 },
  { id: 'custom', name: 'Start from Scratch', description: 'Create your own chart of accounts from the ground up', accounts: 0 },
];

// Default tax rates for South Africa
const DEFAULT_TAX_RATES = [
  { name: 'Standard VAT', rate: 15, type: 'output', description: 'Standard VAT rate for goods and services' },
  { name: 'Zero Rated', rate: 0, type: 'output', description: 'Zero-rated supplies (exports, basic food)' },
  { name: 'Exempt', rate: 0, type: 'exempt', description: 'VAT exempt supplies' },
  { name: 'Input VAT', rate: 15, type: 'input', description: 'VAT on purchases' },
];

// Default payment terms
const DEFAULT_PAYMENT_TERMS = [
  { name: 'Due on Receipt', days: 0, description: 'Payment due immediately' },
  { name: 'Net 7', days: 7, description: 'Payment due within 7 days' },
  { name: 'Net 14', days: 14, description: 'Payment due within 14 days' },
  { name: 'Net 30', days: 30, description: 'Payment due within 30 days' },
  { name: 'Net 60', days: 60, description: 'Payment due within 60 days' },
];

// User roles
const USER_ROLES = [
  { id: 'admin', name: 'Administrator', description: 'Full system access', permissions: 'all' },
  { id: 'accountant', name: 'Accountant', description: 'Financial module access', permissions: 'financial' },
  { id: 'sales', name: 'Sales', description: 'Sales and CRM access', permissions: 'sales' },
  { id: 'hr', name: 'HR Manager', description: 'HR and payroll access', permissions: 'hr' },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access', permissions: 'read' },
];

interface WizardData {
  // Company Info
  companyName: string;
  registrationNumber: string;
  vatNumber: string;
  taxNumber: string;
  industry: string;
  employeeCount: string;
  // Address
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  // Contact
  phone: string;
  email: string;
  website: string;
  // Financial
  financialYearEnd: string;
  currency: string;
  vatRate: number;
  // Chart of Accounts
  coaTemplate: string;
  // Tax Rates
  taxRates: typeof DEFAULT_TAX_RATES;
  // Payment Terms
  paymentTerms: typeof DEFAULT_PAYMENT_TERMS;
  defaultPaymentTerm: string;
  // Banking
  bankAccounts: Array<{
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchCode: string;
    accountType: string;
    swiftCode: string;
  }>;
  // Users
  users: Array<{
    name: string;
    email: string;
    role: string;
  }>;
  // Email Templates
  emailTemplates: {
    invoiceSubject: string;
    invoiceBody: string;
    reminderSubject: string;
    reminderBody: string;
  };
}

const initialWizardData: WizardData = {
  companyName: '',
  registrationNumber: '',
  vatNumber: '',
  taxNumber: '',
  industry: '',
  employeeCount: '1-10',
  street: '',
  city: '',
  province: 'Gauteng',
  postalCode: '',
  country: 'South Africa',
  phone: '',
  email: '',
  website: '',
  financialYearEnd: '02',
  currency: 'ZAR',
  vatRate: 15,
  coaTemplate: 'standard',
  taxRates: DEFAULT_TAX_RATES,
  paymentTerms: DEFAULT_PAYMENT_TERMS,
  defaultPaymentTerm: 'Net 30',
  bankAccounts: [{
    bankName: '',
    accountName: '',
    accountNumber: '',
    branchCode: '',
    accountType: 'Current',
    swiftCode: '',
  }],
  users: [],
  emailTemplates: {
    invoiceSubject: 'Invoice #{invoice_number} from {company_name}',
    invoiceBody: 'Dear {customer_name},\n\nPlease find attached invoice #{invoice_number} for {amount}.\n\nPayment is due by {due_date}.\n\nThank you for your business.\n\nBest regards,\n{company_name}',
    reminderSubject: 'Payment Reminder: Invoice #{invoice_number}',
    reminderBody: 'Dear {customer_name},\n\nThis is a friendly reminder that invoice #{invoice_number} for {amount} is now {days_overdue} days overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\n{company_name}',
  },
};

export default function SetupWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>(initialWizardData);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateData = (updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
    setErrors({});
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (WIZARD_STEPS[currentStep].id) {
      case 'company':
        if (!data.companyName) newErrors.companyName = 'Company name is required';
        if (!data.email) newErrors.email = 'Email is required';
        break;
      case 'financial':
        if (!data.financialYearEnd) newErrors.financialYearEnd = 'Financial year end is required';
        break;
      case 'banking':
        if (data.bankAccounts.length > 0 && data.bankAccounts[0].bankName && !data.bankAccounts[0].accountNumber) {
          newErrors.accountNumber = 'Account number is required';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const completeSetup = async () => {
    setSaving(true);
    try {
      // Save company settings
      await fetch(`${API_BASE}/api/admin/company`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.companyName,
          registration_number: data.registrationNumber,
          vat_number: data.vatNumber,
          tax_number: data.taxNumber,
          financial_year_end: data.financialYearEnd,
          currency: data.currency,
          vat_rate: data.vatRate,
          address: {
            street: data.street,
            city: data.city,
            province: data.province,
            postal_code: data.postalCode,
            country: data.country,
          },
          contact: {
            phone: data.phone,
            email: data.email,
            website: data.website,
          },
          bank_details: data.bankAccounts[0] ? {
            bank_name: data.bankAccounts[0].bankName,
            account_holder: data.bankAccounts[0].accountName,
            account_number: data.bankAccounts[0].accountNumber,
            branch_code: data.bankAccounts[0].branchCode,
            account_type: data.bankAccounts[0].accountType,
            swift_code: data.bankAccounts[0].swiftCode,
          } : undefined,
        }),
      });

      // Save chart of accounts template selection
      if (data.coaTemplate !== 'custom') {
        await fetch(`${API_BASE}/api/admin-config/chart-of-accounts/template`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: data.coaTemplate }),
        });
      }

      // Save tax rates
      for (const taxRate of data.taxRates) {
        await fetch(`${API_BASE}/api/admin-config/tax-rates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taxRate),
        });
      }

      // Save payment terms
      for (const term of data.paymentTerms) {
        await fetch(`${API_BASE}/api/admin-config/payment-terms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(term),
        });
      }

      // Save users
      for (const user of data.users) {
        await fetch(`${API_BASE}/api/admin/users/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
      }

      // Mark setup as complete
      localStorage.setItem('aria_setup_complete', 'true');
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing setup:', error);
      alert('There was an error saving your settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    const step = WIZARD_STEPS[currentStep];
    
    switch (step.id) {
      case 'welcome':
        return <WelcomeStep />;
      case 'company':
        return <CompanyInfoStep data={data} updateData={updateData} errors={errors} />;
      case 'financial':
        return <FinancialStep data={data} updateData={updateData} errors={errors} />;
      case 'accounts':
        return <ChartOfAccountsStep data={data} updateData={updateData} />;
      case 'tax':
        return <TaxRatesStep data={data} updateData={updateData} />;
      case 'terms':
        return <PaymentTermsStep data={data} updateData={updateData} />;
      case 'banking':
        return <BankingStep data={data} updateData={updateData} errors={errors} />;
      case 'users':
        return <UsersStep data={data} updateData={updateData} />;
      case 'email':
        return <EmailTemplatesStep data={data} updateData={updateData} />;
      case 'complete':
        return <CompleteStep data={data} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">ARIA Setup Wizard</h1>
                <p className="text-xs text-gray-500 dark:text-gray-300">Configure your business in minutes</p>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-300">
              Step {currentStep + 1} of {WIZARD_STEPS.length}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-2">
          {WIZARD_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${index < WIZARD_STEPS.length - 1 ? 'flex-1' : ''}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-4 ring-indigo-200 dark:ring-indigo-800'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-300 mt-2">
          {WIZARD_STEPS.map((step, index) => (
            <span
              key={step.id}
              className={`${index === currentStep ? 'text-indigo-600 dark:text-indigo-400 font-medium' : ''}`}
              style={{ width: index === WIZARD_STEPS.length - 1 ? 'auto' : `${100 / WIZARD_STEPS.length}%` }}
            >
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          {renderStepContent()}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          {currentStep === WIZARD_STEPS.length - 1 ? (
            <Button
              onClick={completeSetup}
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Complete Setup
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              {currentStep === 0 ? 'Get Started' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components

function WelcomeStep() {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome to ARIA
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
        Let's set up your business in ARIA. This wizard will guide you through configuring 
        your company details, financial settings, chart of accounts, and more.
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-8">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
          <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Company Setup</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Configure your business details and contact information</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
          <BookOpen className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Financial Structure</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Set up your chart of accounts and tax rates</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
          <Users className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Team & Templates</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Invite team members and customize templates</p>
        </div>
      </div>
      
      <p className="text-xs text-gray-500 dark:text-gray-300 mt-8">
        This will take approximately 5-10 minutes to complete
      </p>
    </div>
  );
}

function CompanyInfoStep({ data, updateData, errors }: { data: WizardData; updateData: (updates: Partial<WizardData>) => void; errors: Record<string, string> }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Company Information</h2>
        <p className="text-gray-600 dark:text-gray-300">Enter your company's basic details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            value={data.companyName}
            onChange={(e) => updateData({ companyName: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 ${
              errors.companyName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your company name"
          />
          {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Registration Number
          </label>
          <input
            type="text"
            value={data.registrationNumber}
            onChange={(e) => updateData({ registrationNumber: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
            placeholder="e.g., 2020/123456/07"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            VAT Number
          </label>
          <input
            type="text"
            value={data.vatNumber}
            onChange={(e) => updateData({ vatNumber: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
            placeholder="e.g., 4123456789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Industry
          </label>
          <select
            value={data.industry}
            onChange={(e) => updateData({ industry: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
          >
            <option value="">Select industry</option>
            <option value="retail">Retail & Commerce</option>
            <option value="services">Professional Services</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="technology">Technology</option>
            <option value="construction">Construction</option>
            <option value="healthcare">Healthcare</option>
            <option value="hospitality">Hospitality</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Employees
          </label>
          <select
            value={data.employeeCount}
            onChange={(e) => updateData({ employeeCount: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
          >
            <option value="1-10">1-10</option>
            <option value="11-50">11-50</option>
            <option value="51-200">51-200</option>
            <option value="201-500">201-500</option>
            <option value="500+">500+</option>
          </select>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Address
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Street Address
            </label>
            <input
              type="text"
              value={data.street}
              onChange={(e) => updateData({ street: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
              placeholder="123 Business Park"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              City
            </label>
            <input
              type="text"
              value={data.city}
              onChange={(e) => updateData({ city: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
              placeholder="Johannesburg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Province
            </label>
            <select
              value={data.province}
              onChange={(e) => updateData({ province: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
            >
              <option>Gauteng</option>
              <option>Western Cape</option>
              <option>KwaZulu-Natal</option>
              <option>Eastern Cape</option>
              <option>Free State</option>
              <option>Limpopo</option>
              <option>Mpumalanga</option>
              <option>Northern Cape</option>
              <option>North West</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Postal Code
            </label>
            <input
              type="text"
              value={data.postalCode}
              onChange={(e) => updateData({ postalCode: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
              placeholder="2000"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Contact Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => updateData({ phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
              placeholder="+27 11 123 4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => updateData({ email: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="info@company.co.za"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Website
            </label>
            <input
              type="url"
              value={data.website}
              onChange={(e) => updateData({ website: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
              placeholder="https://www.company.co.za"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FinancialStep({ data, updateData, errors }: { data: WizardData; updateData: (updates: Partial<WizardData>) => void; errors: Record<string, string> }) {
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const currencies = [
    { value: 'ZAR', label: 'South African Rand (ZAR)', symbol: 'R' },
    { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
    { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
    { value: 'GBP', label: 'British Pound (GBP)', symbol: '£' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Financial Settings</h2>
        <p className="text-gray-600 dark:text-gray-300">Configure your financial year and currency settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Financial Year End Month *
          </label>
          <select
            value={data.financialYearEnd}
            onChange={(e) => updateData({ financialYearEnd: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
            Most South African companies use February
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Base Currency
          </label>
          <select
            value={data.currency}
            onChange={(e) => updateData({ currency: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
          >
            {currencies.map(currency => (
              <option key={currency.value} value={currency.value}>{currency.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Standard VAT Rate (%)
          </label>
          <input
            type="number"
            value={data.vatRate}
            onChange={(e) => updateData({ vatRate: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
            min="0"
            max="100"
            step="0.5"
          />
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
            South Africa standard VAT is 15%
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tax Number (SARS)
          </label>
          <input
            type="text"
            value={data.taxNumber}
            onChange={(e) => updateData({ taxNumber: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
            placeholder="Enter your SARS tax number"
          />
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Financial Year Information</h3>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          Your financial year will run from {months.find(m => m.value === String(parseInt(data.financialYearEnd) + 1).padStart(2, '0'))?.label || 'March'} to {months.find(m => m.value === data.financialYearEnd)?.label}.
          This affects your reporting periods and tax submissions.
        </p>
      </div>
    </div>
  );
}

function ChartOfAccountsStep({ data, updateData }: { data: WizardData; updateData: (updates: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Chart of Accounts</h2>
        <p className="text-gray-600 dark:text-gray-300">Select a template that best fits your business type</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {COA_TEMPLATES.map(template => (
          <div
            key={template.id}
            onClick={() => updateData({ coaTemplate: template.id })}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              data.coaTemplate === template.id
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{template.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{template.description}</p>
                {template.accounts > 0 && (
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    {template.accounts} pre-configured accounts
                  </span>
                )}
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                data.coaTemplate === template.id
                  ? 'border-indigo-500 bg-indigo-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {data.coaTemplate === template.id && (
                  <CheckCircle className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
        <h3 className="font-semibold text-amber-900 dark:text-amber-300 mb-2">Note</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          You can customize your chart of accounts after setup is complete. The template provides a starting point 
          that you can modify to suit your specific needs.
        </p>
      </div>
    </div>
  );
}

function TaxRatesStep({ data, updateData }: { data: WizardData; updateData: (updates: Partial<WizardData>) => void }) {
  const addTaxRate = () => {
    updateData({
      taxRates: [...data.taxRates, { name: '', rate: 0, type: 'output', description: '' }]
    });
  };

  const updateTaxRate = (index: number, field: string, value: string | number) => {
    const newRates = [...data.taxRates];
    newRates[index] = { ...newRates[index], [field]: value };
    updateData({ taxRates: newRates });
  };

  const removeTaxRate = (index: number) => {
    updateData({ taxRates: data.taxRates.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tax Rates</h2>
        <p className="text-gray-600 dark:text-gray-300">Configure your VAT and tax rates</p>
      </div>

      <div className="space-y-4">
        {data.taxRates.map((rate, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={rate.name}
                  onChange={(e) => updateTaxRate(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate (%)</label>
                <input
                  type="number"
                  value={rate.rate}
                  onChange={(e) => updateTaxRate(index, 'rate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                  min="0"
                  max="100"
                  step="0.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={rate.type}
                  onChange={(e) => updateTaxRate(index, 'type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                >
                  <option value="output">Output (Sales)</option>
                  <option value="input">Input (Purchases)</option>
                  <option value="exempt">Exempt</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => removeTaxRate(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addTaxRate} className="w-full">
        + Add Tax Rate
      </Button>
    </div>
  );
}

function PaymentTermsStep({ data, updateData }: { data: WizardData; updateData: (updates: Partial<WizardData>) => void }) {
  const addTerm = () => {
    updateData({
      paymentTerms: [...data.paymentTerms, { name: '', days: 0, description: '' }]
    });
  };

  const updateTerm = (index: number, field: string, value: string | number) => {
    const newTerms = [...data.paymentTerms];
    newTerms[index] = { ...newTerms[index], [field]: value };
    updateData({ paymentTerms: newTerms });
  };

  const removeTerm = (index: number) => {
    updateData({ paymentTerms: data.paymentTerms.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Terms</h2>
        <p className="text-gray-600 dark:text-gray-300">Configure your invoice payment terms</p>
      </div>

      <div className="space-y-4">
        {data.paymentTerms.map((term, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={term.name}
                  onChange={(e) => updateTerm(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Days</label>
                <input
                  type="number"
                  value={term.days}
                  onChange={(e) => updateTerm(index, 'days', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={term.description}
                  onChange={(e) => updateTerm(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => removeTerm(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addTerm} className="w-full">
        + Add Payment Term
      </Button>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Default Payment Term
        </label>
        <select
          value={data.defaultPaymentTerm}
          onChange={(e) => updateData({ defaultPaymentTerm: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
        >
          {data.paymentTerms.map(term => (
            <option key={term.name} value={term.name}>{term.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function BankingStep({ data, updateData, errors }: { data: WizardData; updateData: (updates: Partial<WizardData>) => void; errors: Record<string, string> }) {
  const updateBankAccount = (index: number, field: string, value: string) => {
    const newAccounts = [...data.bankAccounts];
    newAccounts[index] = { ...newAccounts[index], [field]: value };
    updateData({ bankAccounts: newAccounts });
  };

  const addBankAccount = () => {
    updateData({
      bankAccounts: [...data.bankAccounts, {
        bankName: '',
        accountName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'Current',
        swiftCode: '',
      }]
    });
  };

  const removeBankAccount = (index: number) => {
    updateData({ bankAccounts: data.bankAccounts.filter((_, i) => i !== index) });
  };

  const banks = [
    'ABSA Bank',
    'Capitec Bank',
    'First National Bank (FNB)',
    'Investec',
    'Nedbank',
    'Standard Bank',
    'African Bank',
    'Bidvest Bank',
    'Discovery Bank',
    'TymeBank',
    'Other',
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Bank Accounts</h2>
        <p className="text-gray-600 dark:text-gray-300">Add your company bank accounts for payments and reconciliation</p>
      </div>

      {data.bankAccounts.map((account, index) => (
        <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Bank Account {index + 1}</h3>
            {data.bankAccounts.length > 1 && (
              <button
                onClick={() => removeBankAccount(index)}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
              <select
                value={account.bankName}
                onChange={(e) => updateBankAccount(index, 'bankName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              >
                <option value="">Select bank</option>
                {banks.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Name</label>
              <input
                type="text"
                value={account.accountName}
                onChange={(e) => updateBankAccount(index, 'accountName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                placeholder="Account holder name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Number</label>
              <input
                type="text"
                value={account.accountNumber}
                onChange={(e) => updateBankAccount(index, 'accountNumber', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 ${
                  errors.accountNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Account number"
              />
              {errors.accountNumber && <p className="text-red-500 text-sm mt-1">{errors.accountNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch Code</label>
              <input
                type="text"
                value={account.branchCode}
                onChange={(e) => updateBankAccount(index, 'branchCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                placeholder="e.g., 051001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Type</label>
              <select
                value={account.accountType}
                onChange={(e) => updateBankAccount(index, 'accountType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              >
                <option value="Current">Current / Cheque</option>
                <option value="Savings">Savings</option>
                <option value="Transmission">Transmission</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SWIFT Code (Optional)</label>
              <input
                type="text"
                value={account.swiftCode}
                onChange={(e) => updateBankAccount(index, 'swiftCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                placeholder="e.g., SBZAZAJJ"
              />
            </div>
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addBankAccount} className="w-full">
        + Add Another Bank Account
      </Button>
    </div>
  );
}

function UsersStep({ data, updateData }: { data: WizardData; updateData: (updates: Partial<WizardData>) => void }) {
  const addUser = () => {
    updateData({
      users: [...data.users, { name: '', email: '', role: 'viewer' }]
    });
  };

  const updateUser = (index: number, field: string, value: string) => {
    const newUsers = [...data.users];
    newUsers[index] = { ...newUsers[index], [field]: value };
    updateData({ users: newUsers });
  };

  const removeUser = (index: number) => {
    updateData({ users: data.users.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Users & Roles</h2>
        <p className="text-gray-600 dark:text-gray-300">Invite team members to your ARIA workspace</p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Available Roles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {USER_ROLES.map(role => (
            <div key={role.id} className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-800 dark:text-blue-300">{role.name}:</span>
              <span className="text-blue-700 dark:text-blue-400">{role.description}</span>
            </div>
          ))}
        </div>
      </div>

      {data.users.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 mb-4">No team members added yet</p>
          <Button onClick={addUser}>
            + Invite Team Member
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {data.users.map((user, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={user.name}
                    onChange={(e) => updateUser(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={user.email}
                    onChange={(e) => updateUser(index, 'email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                    placeholder="email@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select
                    value={user.role}
                    onChange={(e) => updateUser(index, 'role', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                  >
                    {USER_ROLES.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => removeUser(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addUser} className="w-full">
            + Add Another Team Member
          </Button>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-300">
        Team members will receive an email invitation to join your ARIA workspace.
        You can also add more users later from the Admin settings.
      </p>
    </div>
  );
}

function EmailTemplatesStep({ data, updateData }: { data: WizardData; updateData: (updates: Partial<WizardData>) => void }) {
  const updateTemplate = (field: string, value: string) => {
    updateData({
      emailTemplates: { ...data.emailTemplates, [field]: value }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Email Templates</h2>
        <p className="text-gray-600 dark:text-gray-300">Customize your invoice and reminder email templates</p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Available Variables</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          {['{company_name}', '{customer_name}', '{invoice_number}', '{amount}', '{due_date}', '{days_overdue}'].map(variable => (
            <code key={variable} className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded">
              {variable}
            </code>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Invoice Email</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
              <input
                type="text"
                value={data.emailTemplates.invoiceSubject}
                onChange={(e) => updateTemplate('invoiceSubject', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
              <textarea
                value={data.emailTemplates.invoiceBody}
                onChange={(e) => updateTemplate('invoiceBody', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                rows={6}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Payment Reminder Email</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
              <input
                type="text"
                value={data.emailTemplates.reminderSubject}
                onChange={(e) => updateTemplate('reminderSubject', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
              <textarea
                value={data.emailTemplates.reminderBody}
                onChange={(e) => updateTemplate('reminderBody', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                rows={6}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompleteStep({ data }: { data: WizardData }) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ready to Go!</h2>
        <p className="text-gray-600 dark:text-gray-300">Review your settings and complete the setup</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" />
            Company
          </h3>
          <p className="text-gray-600 dark:text-gray-300">{data.companyName || 'Not set'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">{data.city}, {data.province}</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            Financial Year
          </h3>
          <p className="text-gray-600 dark:text-gray-300">Ends in month {data.financialYearEnd}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">Currency: {data.currency}</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Chart of Accounts
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {COA_TEMPLATES.find(t => t.id === data.coaTemplate)?.name || 'Custom'}
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-500" />
            Tax Rates
          </h3>
          <p className="text-gray-600 dark:text-gray-300">{data.taxRates.length} tax rates configured</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-indigo-500" />
            Bank Accounts
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {data.bankAccounts.filter(a => a.bankName).length} bank account(s)
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Team Members
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {data.users.length} user(s) to invite
          </p>
        </div>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
        <p className="text-green-800 dark:text-green-300">
          Click "Complete Setup" to save your settings and start using ARIA.
          You can always modify these settings later from the Admin menu.
        </p>
      </div>
    </div>
  );
}
