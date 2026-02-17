import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, LayoutDashboard, Search, Bot, FileText, Settings, CreditCard, Users, Package, ShieldCheck, BarChart3, HelpCircle } from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to ARIA ERP',
    description: 'ARIA is your complete AI-powered ERP platform built for South African businesses. Manage finance, sales, procurement, inventory, HR, payroll, manufacturing, and compliance all in one place. This quick tour will show you the essentials.',
    icon: <Sparkles className="h-8 w-8 text-blue-500" />,
  },
  {
    id: 'dashboard',
    title: 'Executive Dashboard',
    description: 'Your real-time business command centre. Track revenue, expenses, outstanding invoices, and cash flow at a glance. View pending approvals, overdue tasks, and alerts. Click any KPI card to drill down into the detail.',
    icon: <LayoutDashboard className="h-8 w-8 text-green-500" />,
    target: '[data-tour="dashboard"]',
  },
  {
    id: 'navigation',
    title: 'Mega Menu Navigation',
    description: 'The top navigation bar organises everything into five sections: Financial (GL, AR, AP, Banking), Operations (Sales, Inventory, Procurement, Manufacturing), People (HR, Payroll, Recruitment), Services (Field Service, Helpdesk, Projects), and Compliance (Tax, Audit, POPIA). Hover over any section to explore.',
    icon: <FileText className="h-8 w-8 text-orange-500" />,
    target: '[data-tour="menu"]',
  },
  {
    id: 'financial',
    title: 'Financial Management',
    description: 'Full double-entry accounting with General Ledger, Chart of Accounts, and Journal Entries. Manage Accounts Receivable (invoices, receipts, credit notes) and Accounts Payable (bills, payments, expense claims). Run bank reconciliation and generate financial statements.',
    icon: <CreditCard className="h-8 w-8 text-emerald-500" />,
    target: '[data-tour="menu"]',
  },
  {
    id: 'operations',
    title: 'Sales & Operations',
    description: 'Create quotes, convert to sales orders, generate delivery notes, and issue invoices in a seamless workflow. Manage inventory with real-time stock levels, warehouses, and reorder points. Handle procurement with purchase orders, goods receipts, and supplier management.',
    icon: <Package className="h-8 w-8 text-violet-500" />,
    target: '[data-tour="menu"]',
  },
  {
    id: 'people',
    title: 'People & Payroll',
    description: 'Full HR management: employee records, departments, leave management, attendance tracking, and performance reviews. Process payroll with PAYE, UIF, and SDL calculations. Manage recruitment, onboarding, and training programmes.',
    icon: <Users className="h-8 w-8 text-amber-500" />,
    target: '[data-tour="menu"]',
  },
  {
    id: 'search',
    title: 'Quick Search (Ctrl+K)',
    description: 'Press Ctrl+K anytime to open the command palette. Instantly search for customers, invoices, products, employees, or any record. Navigate to any page, run commands, or create new records without leaving your keyboard.',
    icon: <Search className="h-8 w-8 text-purple-500" />,
    target: '[data-tour="search"]',
  },
  {
    id: 'aria-ai',
    title: 'Ask ARIA - AI Assistant',
    description: 'Your intelligent business assistant. Ask questions in natural language like "Create a sales order for Customer X with 5 units of Product Y at R1,500 each." ARIA can generate reports, look up data, explain transactions, and execute multi-step workflows.',
    icon: <Bot className="h-8 w-8 text-indigo-500" />,
    target: '[data-tour="aria"]',
  },
  {
    id: 'automation',
    title: '67 Automation Bots',
    description: 'ARIA runs 67 intelligent bots that automate routine tasks around the clock: send payment reminders, reconcile bank transactions, flag overdue invoices, check inventory levels, process payroll deductions, and more. Monitor them all from the Bots dashboard.',
    icon: <Bot className="h-8 w-8 text-cyan-500" />,
    target: '[data-tour="bots"]',
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    description: 'Generate financial statements (P&L, Balance Sheet, Cash Flow, Trial Balance), sales analytics, inventory valuation, AR/AP aging, and HR metrics. Export to PDF or Excel. Every module includes built-in reporting with drill-down capability.',
    icon: <BarChart3 className="h-8 w-8 text-rose-500" />,
    target: '[data-tour="menu"]',
  },
  {
    id: 'compliance',
    title: 'SA Compliance & Tax',
    description: 'Stay compliant with South African regulations: VAT returns, PAYE submissions, UIF/SDL filings, B-BBEE reporting, and POPIA data protection. Built-in audit trails track every action for accountability and regulatory reporting.',
    icon: <ShieldCheck className="h-8 w-8 text-teal-500" />,
    target: '[data-tour="menu"]',
  },
  {
    id: 'help',
    title: 'Help & Training',
    description: 'Every menu section includes a Help & Training category with overviews, step-by-step guides, video tutorials, month-end checklists, and FAQs. Visit Settings to restart this tour anytime, or press Ctrl+K and search for help.',
    icon: <HelpCircle className="h-8 w-8 text-sky-500" />,
    target: '[data-tour="settings"]',
  },
  {
    id: 'settings',
    title: 'Customize Your Experience',
    description: 'Configure your profile, company details, notifications, security (2FA, session timeout), appearance (dark mode, language, timezone), and integrations. You can restart this tour anytime from Settings > Appearance. Enjoy using ARIA!',
    icon: <Settings className="h-8 w-8 text-gray-500" />,
    target: '[data-tour="settings"]',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('aria-onboarding-complete', 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('aria-onboarding-complete', 'true');
    setIsVisible(false);
    onSkip();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Tour Card */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="p-8 pt-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl">
              {step.icon}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-3">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-center text-gray-600 dark:text-gray-300 leading-relaxed">
            {step.description}
          </p>

          {/* Step Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-6 bg-blue-500' 
                    : index < currentStep 
                      ? 'bg-blue-300' 
                      : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-500/25"
            >
              {isLastStep ? 'Get Started' : 'Next'}
              {!isLastStep && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    try {
      const completed = localStorage.getItem('aria-onboarding-complete');
      if (completed === 'true') {
        setShowTour(false);
        return;
      }
      const timer = setTimeout(() => {
        const recheck = localStorage.getItem('aria-onboarding-complete');
        if (recheck !== 'true') {
          setShowTour(true);
        }
      }, 1500);
      return () => clearTimeout(timer);
    } catch {
      setShowTour(false);
    }
  }, []);

  const dismissTour = () => {
    try {
      localStorage.setItem('aria-onboarding-complete', 'true');
      document.cookie = 'aria-onboarding-complete=true;max-age=31536000;path=/';
    } catch {}
    setShowTour(false);
  };

  const resetTour = () => {
    try {
      localStorage.removeItem('aria-onboarding-complete');
    } catch {}
    setShowTour(true);
  };

  return { showTour, setShowTour, dismissTour, resetTour };
}
