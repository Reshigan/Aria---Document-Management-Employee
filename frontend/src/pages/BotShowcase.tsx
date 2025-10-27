/**
 * Bot Showcase - Clean, Professional Design
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot, DollarSign, TrendingUp, Package, Shield, Users, MessageSquare,
  ArrowRight, CheckCircle, Sparkles, FileText, BarChart
} from 'lucide-react';

interface Bot {
  id: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  icon: any;
}

const BOTS_DATA: Bot[] = [
  // Financial
  {
    id: 'invoice-rec',
    name: 'Invoice Reconciliation',
    category: 'Financial',
    description: 'Automatically match invoices to payments with 95% accuracy. 3-way matching, duplicate detection, and aging analysis.',
    features: ['3-way matching', 'Duplicate detection', '95% accuracy', 'Aging analysis'],
    icon: FileText
  },
  {
    id: 'ap-bot',
    name: 'Accounts Payable',
    category: 'Financial',
    description: 'Automate supplier invoice processing from capture to payment with OCR and approval routing.',
    features: ['Invoice OCR', 'Approval routing', 'Payment scheduling', 'Vendor management'],
    icon: DollarSign
  },
  {
    id: 'ar-bot',
    name: 'AR Collections',
    category: 'Financial',
    description: 'Automate accounts receivable and reduce DSO by 15-20 days with smart collection workflows.',
    features: ['Aging analysis', 'Auto-reminders', 'Escalation workflows', 'Payment prediction'],
    icon: TrendingUp
  },
  {
    id: 'bank-rec',
    name: 'Bank Reconciliation',
    category: 'Financial',
    description: 'Automatically reconcile bank statements with general ledger entries. Daily automation ready.',
    features: ['Auto-matching', 'Multi-bank support', 'Exception handling', 'Audit trails'],
    icon: DollarSign
  },
  {
    id: 'gl-bot',
    name: 'General Ledger',
    category: 'Financial',
    description: 'Automate journal entries, account reconciliations, and GL maintenance tasks.',
    features: ['Auto journal entries', 'Account reconciliation', 'Balance validation', 'Month-end automation'],
    icon: BarChart
  },
  
  // Compliance
  {
    id: 'bbbee-bot',
    name: 'BBBEE Compliance',
    category: 'Compliance',
    description: 'Track and report on BBBEE compliance requirements. The only bot of its kind globally.',
    features: ['Scorecard tracking', 'Supplier verification', 'Automated reporting', 'Audit preparation'],
    icon: Shield
  },
  {
    id: 'compliance-audit',
    name: 'Compliance Audit',
    category: 'Compliance',
    description: 'Continuous compliance monitoring across SARS, UIF, SDL, PAYE, and other SA requirements.',
    features: ['SARS integration', 'UIF/SDL monitoring', 'PAYE validation', 'Audit logging'],
    icon: Shield
  },
  
  // Sales & CRM
  {
    id: 'lead-qual',
    name: 'Lead Qualification',
    category: 'Sales',
    description: 'Score and qualify leads automatically using AI-powered analysis and CRM integration.',
    features: ['Lead scoring', 'Auto-qualification', 'CRM sync', 'Follow-up automation'],
    icon: TrendingUp
  },
  {
    id: 'quote-gen',
    name: 'Quote Generation',
    category: 'Sales',
    description: 'Generate professional quotes and proposals automatically from CRM opportunities.',
    features: ['Template generation', 'Pricing rules', 'Approval workflows', 'E-signature integration'],
    icon: FileText
  },
  {
    id: 'sales-order',
    name: 'Sales Order Processing',
    category: 'Sales',
    description: 'Automate sales order creation, validation, and fulfillment processes end-to-end.',
    features: ['Order validation', 'Inventory check', 'Fulfillment routing', 'Customer notifications'],
    icon: Package
  },
  
  // Operations
  {
    id: 'inventory',
    name: 'Inventory Reorder',
    category: 'Operations',
    description: 'Smart inventory management with predictive reordering and supplier integration.',
    features: ['Stock monitoring', 'Reorder point alerts', 'Supplier automation', 'Demand forecasting'],
    icon: Package
  },
  {
    id: 'purchasing',
    name: 'Purchasing',
    category: 'Operations',
    description: 'Automate purchase requisitions, PO creation, and supplier management.',
    features: ['PR approval', 'PO generation', 'Supplier portal', '3-way matching'],
    icon: Package
  },
  
  // HR
  {
    id: 'payroll',
    name: 'Payroll Processing',
    category: 'HR',
    description: 'Automate payroll calculations, tax deductions, and compliance reporting for SA.',
    features: ['SA payroll compliance', 'PAYE/UIF/SDL', 'Leave integration', 'Bank file generation'],
    icon: Users
  },
  {
    id: 'leave-mgmt',
    name: 'Leave Management',
    category: 'HR',
    description: 'Streamline leave requests, approvals, and balance tracking across your organization.',
    features: ['Leave requests', 'Approval workflows', 'Balance tracking', 'Calendar integration'],
    icon: Users
  },
  {
    id: 'recruitment',
    name: 'Recruitment',
    category: 'HR',
    description: 'Automate job postings, candidate screening, and interview scheduling.',
    features: ['CV screening', 'Interview scheduling', 'Candidate tracking', 'Offer letter generation'],
    icon: Users
  },
  
  // Support & Admin
  {
    id: 'helpdesk',
    name: 'Helpdesk Automation',
    category: 'Support',
    description: 'AI-powered helpdesk with ticket routing, auto-responses, and knowledge base integration.',
    features: ['Ticket routing', 'Auto-responses', 'Knowledge base', 'SLA monitoring'],
    icon: MessageSquare
  },
  {
    id: 'report-dist',
    name: 'Report Distribution',
    category: 'Support',
    description: 'Automate report generation and distribution across email, Slack, and Teams.',
    features: ['Schedule automation', 'Multi-channel delivery', 'Template management', 'Recipient management'],
    icon: FileText
  }
];

const BotShowcase: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const categories = ['All', 'Financial', 'Compliance', 'Sales', 'Operations', 'HR', 'Support'];
  
  const filteredBots = selectedCategory === 'All' 
    ? BOTS_DATA 
    : BOTS_DATA.filter(bot => bot.category === selectedCategory);
  
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-gray-900 tracking-tight">Aria</span>
          </Link>
          
          <div className="flex items-center space-x-8">
            <Link to="/bots" className="text-sm font-medium text-gray-900">
              Platform
            </Link>
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
              Sign In
            </Link>
            <Link 
              to="/signup" 
              className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>27 Production-Ready AI Bots</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-8 leading-none tracking-tight">
              Automation that
              <br />
              just works
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto font-light">
              Pre-built AI bots for every business function. From invoice reconciliation to BBBEE compliance, deploy in hours.
            </p>
            
            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mb-16">
              <div>
                <div className="text-4xl font-bold text-gray-900 mb-2">27</div>
                <div className="text-sm text-gray-600">Production Bots</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-gray-900 mb-2">155K+</div>
                <div className="text-sm text-gray-600">Lines of Code</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-gray-900 mb-2">24hrs</div>
                <div className="text-sm text-gray-600">To Deployment</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="pb-12 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center space-x-2 flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-3 rounded-lg font-medium text-sm transition-all ${
                  selectedCategory === cat
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Bots Grid */}
      <section className="pb-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBots.map((bot, index) => (
              <motion.div
                key={bot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="group p-8 bg-white rounded-2xl border border-gray-200 hover:border-gray-900 transition-all hover:shadow-lg"
              >
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-black rounded-lg flex items-center justify-center mb-6 transition-colors">
                  <bot.icon className="w-6 h-6 text-gray-700 group-hover:text-white transition-colors" />
                </div>
                
                <div className="mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {bot.category}
                  </span>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-black">
                  {bot.name}
                </h3>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {bot.description}
                </p>
                
                <div className="space-y-2 mb-6">
                  {bot.features.slice(0, 3).map((feature, i) => (
                    <div key={i} className="flex items-center space-x-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                <button className="w-full py-3 bg-gray-100 group-hover:bg-black text-gray-900 group-hover:text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center space-x-2">
                  <span>Learn more</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Start your 14-day free trial. No credit card required.
          </p>
          <Link
            to="/signup"
            className="group inline-flex items-center space-x-2 px-10 py-5 bg-black hover:bg-gray-800 text-white rounded-lg font-semibold text-xl transition-all"
          >
            <span>Get started for free</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-500">&copy; 2025 Vanta X Pty Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default BotShowcase;
