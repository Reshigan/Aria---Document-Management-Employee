import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, TrendingUp, DollarSign, FileText, Shield, Users,
  Package, BarChart, Clock, CheckCircle, ArrowRight, Play,
  Activity, Target, Briefcase, Calendar, MessageSquare, Search
} from 'lucide-react';
import { api } from '../services/api';

interface Bot {
  id: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  roi: string;
  timeSaved: string;
  moneySaved: string;
  icon: any;
  status: 'active' | 'coming_soon';
  complexity: 'basic' | 'standard' | 'advanced';
  pricing: number;
  linesOfCode: number;
}

const BOT_CATEGORIES = {
  financial: { name: 'Financial Bots', icon: DollarSign, color: 'text-green-600 bg-green-100' },
  sales: { name: 'Sales & CRM', icon: TrendingUp, color: 'text-blue-600 bg-blue-100' },
  operations: { name: 'Operations', icon: Package, color: 'text-purple-600 bg-purple-100' },
  compliance: { name: 'Compliance', icon: Shield, color: 'text-red-600 bg-red-100' },
  hr: { name: 'Human Resources', icon: Users, color: 'text-indigo-600 bg-indigo-100' },
  support: { name: 'Support & Admin', icon: MessageSquare, color: 'text-orange-600 bg-orange-100' }
};

const BOTS_DATA: Bot[] = [
  // FINANCIAL BOTS
  {
    id: 'invoice-reconciliation',
    name: 'Invoice Reconciliation Bot',
    category: 'financial',
    description: 'Automatically match invoices to payments and bank transactions with 95% accuracy',
    features: ['3-way matching (PO, Invoice, Receipt)', 'Duplicate detection', 'Currency conversion', 'Aging analysis', 'Exception handling'],
    roi: '95% accuracy, 20-30 hours/month saved',
    timeSaved: '20-30 hours/month',
    moneySaved: 'R15,000-R25,000/month',
    icon: FileText,
    status: 'active',
    complexity: 'advanced',
    pricing: 3500,
    linesOfCode: 23098
  },
  {
    id: 'accounts-payable',
    name: 'Accounts Payable Bot',
    category: 'financial',
    description: 'Automate supplier invoice processing from capture to payment',
    features: ['Invoice OCR capture', 'Approval routing', 'Payment scheduling', 'Vendor master data management', 'Duplicate checking'],
    roi: '15-20 hours/month saved',
    timeSaved: '15-20 hours/month',
    moneySaved: 'R12,000-R18,000/month',
    icon: DollarSign,
    status: 'active',
    complexity: 'standard',
    pricing: 2500,
    linesOfCode: 3688
  },
  {
    id: 'ar-collections',
    name: 'AR Collections Bot',
    category: 'financial',
    description: 'Automate accounts receivable and collections processes',
    features: ['Aging analysis', 'Auto-reminder emails', 'Escalation workflows', 'Payment prediction', 'Customer portal'],
    roi: 'Reduces DSO by 15-20 days',
    timeSaved: '15-20 hours/month',
    moneySaved: '15-20 day DSO reduction',
    icon: TrendingUp,
    status: 'active',
    complexity: 'advanced',
    pricing: 3500,
    linesOfCode: 23385
  },
  {
    id: 'bank-reconciliation',
    name: 'Bank Reconciliation Bot',
    category: 'financial',
    description: 'Auto-reconcile bank statements with accounting records',
    features: ['Bank statement import', 'Transaction matching', 'Discrepancy detection', 'Multi-currency support', 'Reporting'],
    roi: '10-15 hours/month saved',
    timeSaved: '10-15 hours/month',
    moneySaved: 'R8,000-R12,000/month',
    icon: BarChart,
    status: 'active',
    complexity: 'advanced',
    pricing: 3500,
    linesOfCode: 22620
  },
  {
    id: 'general-ledger',
    name: 'General Ledger Bot',
    category: 'financial',
    description: 'Automate GL posting and maintenance',
    features: ['Auto-posting from subledgers', 'Journal entry validation', 'Account reconciliation', 'Period close automation', 'Audit trail'],
    roi: '15-20 hours/month saved',
    timeSaved: '15-20 hours/month',
    moneySaved: 'R12,000-R18,000/month',
    icon: FileText,
    status: 'active',
    complexity: 'advanced',
    pricing: 3500,
    linesOfCode: 20742
  },
  {
    id: 'financial-close',
    name: 'Financial Close Bot',
    category: 'financial',
    description: 'Automate month-end close process',
    features: ['Checklist automation', 'Accrual posting', 'Reconciliation tracking', 'Close dashboard', 'Variance analysis'],
    roi: 'Reduces close time by 40-50%',
    timeSaved: '30-40 hours/month',
    moneySaved: '40-50% faster closes',
    icon: Calendar,
    status: 'active',
    complexity: 'advanced',
    pricing: 3500,
    linesOfCode: 19374
  },
  {
    id: 'expense-approval',
    name: 'Expense Approval Bot',
    category: 'financial',
    description: 'Automate expense claim processing',
    features: ['Receipt OCR', 'Policy compliance checking', '90% auto-coding', 'Approval workflows', 'Reimbursement processing'],
    roi: '10-15 hours/month saved, 90% auto-coding',
    timeSaved: '10-15 hours/month',
    moneySaved: 'R8,000-R12,000/month',
    icon: DollarSign,
    status: 'active',
    complexity: 'standard',
    pricing: 2500,
    linesOfCode: 15298
  },
  {
    id: 'analytics',
    name: 'Analytics Bot',
    category: 'financial',
    description: 'AI-powered financial analysis and insights',
    features: ['Trend analysis', 'Variance explanation', 'Forecasting', 'Natural language queries', 'Custom dashboards'],
    roi: 'Better decision-making, predictive insights',
    timeSaved: '10-15 hours/month',
    moneySaved: 'Qualitative (better decisions)',
    icon: BarChart,
    status: 'active',
    complexity: 'advanced',
    pricing: 3500,
    linesOfCode: 13272
  },
  {
    id: 'sap-document',
    name: 'SAP Document Bot',
    category: 'financial',
    description: 'SAP integration and document processing',
    features: ['SAP data extraction', 'Document migration', 'Real-time sync', 'Format conversion', 'Error handling'],
    roi: 'Seamless SAP integration',
    timeSaved: '20-30 hours/month',
    moneySaved: 'R15,000-R25,000/month',
    icon: Zap,
    status: 'active',
    complexity: 'advanced',
    pricing: 3500,
    linesOfCode: 14098
  },

  // COMPLIANCE BOTS
  {
    id: 'bbbee-compliance',
    name: 'BBBEE Compliance Bot',
    category: 'compliance',
    description: 'Automate BBBEE compliance tracking and reporting',
    features: ['Certificate verification', 'Scorecard calculation', 'Spend tracking by ownership', 'Audit trail', 'Reporting'],
    roi: 'Saves R15K-50K/year on verification costs',
    timeSaved: '10-15 hours/month',
    moneySaved: 'R15,000-R50,000/year',
    icon: Shield,
    status: 'active',
    complexity: 'advanced',
    pricing: 3500,
    linesOfCode: 15752
  },
  {
    id: 'compliance-audit',
    name: 'Compliance Audit Bot',
    category: 'compliance',
    description: 'Continuous compliance monitoring',
    features: ['Policy compliance checks', 'Audit log analysis', 'Risk scoring', 'Alert generation', 'Remediation tracking'],
    roi: 'Reduces audit time by 50%',
    timeSaved: '15-20 hours/month',
    moneySaved: '50% faster audits',
    icon: Shield,
    status: 'active',
    complexity: 'standard',
    pricing: 2500,
    linesOfCode: 4758
  },

  // SALES & CRM BOTS
  {
    id: 'lead-qualification',
    name: 'Lead Qualification Bot',
    category: 'sales',
    description: 'Automate lead scoring and qualification',
    features: ['Lead scoring algorithm', 'Auto-follow-up emails', 'CRM integration', 'Conversion prediction', 'Segmentation'],
    roi: 'Increases conversion by 20-30%',
    timeSaved: '10-15 hours/week',
    moneySaved: '20-30% conversion increase',
    icon: Target,
    status: 'active',
    complexity: 'advanced',
    pricing: 3500,
    linesOfCode: 25645
  },
  {
    id: 'quote-generation',
    name: 'Quote Generation Bot',
    category: 'sales',
    description: 'Automate quote creation and sending',
    features: ['Dynamic pricing', 'Quote templates', 'Approval workflows', 'Win/loss tracking', 'Customer portal'],
    roi: 'Saves 5-10 hours/week',
    timeSaved: '5-10 hours/week',
    moneySaved: 'R6,000-R12,000/month',
    icon: FileText,
    status: 'active',
    complexity: 'standard',
    pricing: 2500,
    linesOfCode: 23715
  },
  {
    id: 'sales-order',
    name: 'Sales Order Bot',
    category: 'sales',
    description: 'Automate sales order processing',
    features: ['Order capture', 'Credit checks', 'Inventory allocation', 'Delivery scheduling', 'Invoice generation'],
    roi: 'Saves 10-15 hours/week',
    timeSaved: '10-15 hours/week',
    moneySaved: 'R12,000-R18,000/month',
    icon: Briefcase,
    status: 'active',
    complexity: 'standard',
    pricing: 2500,
    linesOfCode: 17370
  },

  // OPERATIONS BOTS
  {
    id: 'inventory-reorder',
    name: 'Inventory Reorder Bot',
    category: 'operations',
    description: 'Automate inventory replenishment',
    features: ['Demand forecasting', 'Reorder point calculation', 'Auto PO generation', 'Supplier selection', 'Stock optimization'],
    roi: 'Reduces stockouts by 70%, excess by 30%',
    timeSaved: '15-20 hours/week',
    moneySaved: '70% fewer stockouts',
    icon: Package,
    status: 'active',
    complexity: 'advanced',
    pricing: 3500,
    linesOfCode: 25734
  },
  {
    id: 'purchasing',
    name: 'Purchasing Bot',
    category: 'operations',
    description: 'Automate procurement process',
    features: ['RFQ generation', 'Supplier comparison', 'PO creation', 'Receipt matching', 'Vendor performance'],
    roi: 'Saves 10-15 hours/week',
    timeSaved: '10-15 hours/week',
    moneySaved: 'R12,000-R18,000/month',
    icon: Briefcase,
    status: 'active',
    complexity: 'standard',
    pricing: 2500,
    linesOfCode: 2517
  },
  {
    id: 'warehouse-management',
    name: 'Warehouse Management Bot',
    category: 'operations',
    description: 'Automate warehouse operations',
    features: ['Pick list optimization', 'Bin location management', 'Cycle count scheduling', 'Shipping label generation', 'KPI tracking'],
    roi: 'Increases efficiency by 25%',
    timeSaved: '15-20 hours/week',
    moneySaved: '25% efficiency gain',
    icon: Package,
    status: 'active',
    complexity: 'standard',
    pricing: 2500,
    linesOfCode: 6280
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing Bot',
    category: 'operations',
    description: 'Automate production planning',
    features: ['Production scheduling', 'Material requirements planning', 'Capacity planning', 'Shop floor control', 'Quality tracking'],
    roi: 'Optimizes production flow',
    timeSaved: '10-15 hours/week',
    moneySaved: 'Qualitative (optimization)',
    icon: Activity,
    status: 'active',
    complexity: 'standard',
    pricing: 2500,
    linesOfCode: 2344
  },
  {
    id: 'asset-tracking',
    name: 'Asset Tracking Bot',
    category: 'operations',
    description: 'Automate asset management',
    features: ['Asset registry', 'Depreciation calculation', 'Maintenance scheduling', 'Disposal workflow', 'Compliance tracking'],
    roi: 'Prevents asset loss, optimizes replacement',
    timeSaved: '5-10 hours/month',
    moneySaved: 'R5,000-R10,000/month',
    icon: BarChart,
    status: 'active',
    complexity: 'basic',
    pricing: 1500,
    linesOfCode: 5000
  },

  // HR BOTS
  {
    id: 'payroll',
    name: 'Payroll Bot',
    category: 'hr',
    description: 'Automate payroll calculation and processing',
    features: ['Auto payroll calculation', 'PAYE/UIF/SDL', 'Bank file generation', 'Payslip distribution', 'Year-end reconciliation'],
    roi: 'Saves 10-20 hours/month',
    timeSaved: '10-20 hours/month',
    moneySaved: 'R10,000-R20,000/month',
    icon: DollarSign,
    status: 'active',
    complexity: 'advanced',
    pricing: 3500,
    linesOfCode: 15000
  },
  {
    id: 'leave-management',
    name: 'Leave Management Bot',
    category: 'hr',
    description: 'Automate leave requests and approvals',
    features: ['Leave requests', 'Approval routing', 'Balance tracking', 'Leave accrual calculation', 'Calendar integration'],
    roi: 'Saves 5-10 hours/month',
    timeSaved: '5-10 hours/month',
    moneySaved: 'R5,000-R10,000/month',
    icon: Calendar,
    status: 'active',
    complexity: 'basic',
    pricing: 1500,
    linesOfCode: 8000
  },
  {
    id: 'recruitment',
    name: 'Recruitment Bot',
    category: 'hr',
    description: 'Automate candidate screening and hiring',
    features: ['Job posting', 'CV screening', 'Interview scheduling', 'Candidate scoring', 'Offer letter generation'],
    roi: 'Reduces time-to-hire by 30%',
    timeSaved: '15-20 hours/month',
    moneySaved: '30% faster hiring',
    icon: Users,
    status: 'active',
    complexity: 'advanced',
    pricing: 3500,
    linesOfCode: 12000
  },
  {
    id: 'performance-review',
    name: 'Performance Review Bot',
    category: 'hr',
    description: 'Automate performance management',
    features: ['Review scheduling', '360-degree feedback', 'Goal tracking', 'Ratings compilation', 'Development planning'],
    roi: 'Ensures consistent performance management',
    timeSaved: '10-15 hours/month',
    moneySaved: 'Qualitative (consistency)',
    icon: Target,
    status: 'active',
    complexity: 'advanced',
    pricing: 3500,
    linesOfCode: 10000
  },
  {
    id: 'time-attendance',
    name: 'Time & Attendance Bot',
    category: 'hr',
    description: 'Automate time tracking and attendance',
    features: ['Clock in/out', 'Timesheet approval', 'Overtime calculation', 'Absence tracking', 'Biometric integration'],
    roi: 'Eliminates timesheet fraud, saves 5-10 hours/month',
    timeSaved: '5-10 hours/month',
    moneySaved: 'R5,000-R10,000/month',
    icon: Clock,
    status: 'active',
    complexity: 'standard',
    pricing: 2500,
    linesOfCode: 9000
  },

  // SUPPORT & ADMIN BOTS
  {
    id: 'contractor-management',
    name: 'Contractor Management Bot',
    category: 'support',
    description: 'Automate contractor administration',
    features: ['Contractor onboarding', 'Contract tracking', 'Invoice matching', 'Compliance verification', 'Performance tracking'],
    roi: 'Reduces contractor admin by 60%',
    timeSaved: '10-15 hours/month',
    moneySaved: '60% admin reduction',
    icon: Users,
    status: 'active',
    complexity: 'standard',
    pricing: 2500,
    linesOfCode: 7000
  },
  {
    id: 'helpdesk',
    name: 'Helpdesk Bot',
    category: 'support',
    description: 'Automate IT support and ticketing',
    features: ['Ticket creation', 'Auto-routing', 'SLA tracking', 'Knowledge base search', 'Escalation management'],
    roi: 'Reduces support burden by 40%',
    timeSaved: '15-20 hours/week',
    moneySaved: '40% support reduction',
    icon: MessageSquare,
    status: 'active',
    complexity: 'basic',
    pricing: 1500,
    linesOfCode: 6000
  },
  {
    id: 'report-distribution',
    name: 'Report Distribution Bot',
    category: 'support',
    description: 'Automate report generation and distribution',
    features: ['Scheduled report generation', 'PDF/Excel export', 'Email distribution', 'Dashboard creation', 'Data refresh'],
    roi: 'Saves 5-10 hours/month',
    timeSaved: '5-10 hours/month',
    moneySaved: 'R5,000-R10,000/month',
    icon: BarChart,
    status: 'active',
    complexity: 'basic',
    pricing: 1500,
    linesOfCode: 5000
  }
];

export const BotShowcase: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  const filteredBots = BOTS_DATA.filter(bot => {
    const matchesCategory = selectedCategory === 'all' || bot.category === selectedCategory;
    const matchesSearch = bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bot.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalBots = BOTS_DATA.length;
  const totalLinesOfCode = BOTS_DATA.reduce((sum, bot) => sum + bot.linesOfCode, 0);
  const averageROI = '20-30 hours/month saved per bot';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-5xl font-bold mb-4">
              🤖 27 AI-Powered Automation Bots
            </h1>
            <p className="text-xl text-indigo-100 mb-8">
              Pre-built, production-ready, and ready to transform your business
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
                <div className="text-4xl font-bold text-white">{totalBots}</div>
                <div className="text-indigo-100 mt-2">Production-Ready Bots</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
                <div className="text-4xl font-bold text-white">{(totalLinesOfCode / 1000).toFixed(0)}K+</div>
                <div className="text-indigo-100 mt-2">Lines of Code</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
                <div className="text-4xl font-bold text-white">R1.5M-R3M</div>
                <div className="text-indigo-100 mt-2">Value vs Building from Scratch</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search bots..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Bots ({totalBots})
            </button>
            {Object.entries(BOT_CATEGORIES).map(([key, cat]) => {
              const count = BOTS_DATA.filter(b => b.category === key).length;
              const Icon = cat.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                    selectedCategory === key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={16} />
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Bot Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBots.map((bot, index) => {
            const Icon = bot.icon;
            const category = BOT_CATEGORIES[bot.category as keyof typeof BOT_CATEGORIES];
            const CategoryIcon = category.icon;

            return (
              <motion.div
                key={bot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition overflow-hidden cursor-pointer group"
                onClick={() => setSelectedBot(bot)}
              >
                <div className={`${category.color} p-4 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg">
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{bot.name}</h3>
                      <div className="flex items-center gap-2 text-sm opacity-80">
                        <CategoryIcon size={14} />
                        <span>{category.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      bot.complexity === 'advanced' ? 'bg-red-100 text-red-700' :
                      bot.complexity === 'standard' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {bot.complexity.toUpperCase()}
                    </span>
                    <span className="text-sm font-bold mt-1">R{bot.pricing}/mo</span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-gray-600 text-sm mb-4">{bot.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock size={16} className="text-blue-500" />
                      <span>{bot.timeSaved} saved</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <DollarSign size={16} className="text-green-500" />
                      <span>{bot.moneySaved}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Activity size={16} className="text-purple-500" />
                      <span>{bot.linesOfCode.toLocaleString()} lines of code</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 group-hover:scale-105 transform">
                      <Play size={16} />
                      Try Demo
                    </button>
                    <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2">
                      Details
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredBots.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No bots found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Bot Detail Modal */}
      {selectedBot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => setSelectedBot(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedBot.name}</h2>
                  <p className="text-gray-600">{selectedBot.description}</p>
                </div>
                <button
                  onClick={() => setSelectedBot(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Time Saved</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">{selectedBot.timeSaved}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Money Saved</div>
                  <div className="text-2xl font-bold text-green-900 mt-1">{selectedBot.moneySaved}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Pricing</div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">R{selectedBot.pricing}/month</div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Key Features</h3>
                <ul className="space-y-2">
                  {selectedBot.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">ROI Impact</h3>
                <p className="text-gray-700 text-lg">{selectedBot.roi}</p>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition text-lg font-medium flex items-center justify-center gap-2">
                  <Play size={20} />
                  Try Live Demo
                </button>
                <button className="flex-1 bg-white border-2 border-indigo-600 text-indigo-600 py-3 px-6 rounded-lg hover:bg-indigo-50 transition text-lg font-medium">
                  Activate Bot
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BotShowcase;
