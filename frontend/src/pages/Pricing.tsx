import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check, Zap, Users, Building, Crown, ArrowRight, Calculator,
  TrendingUp, Shield, Clock, DollarSign, Package, Star
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  minUsers: number;
  maxUsers: number;
  icon: any;
  color: string;
  features: string[];
  agents: number;
  storage: string;
  support: string;
  sla: string;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Perfect for small teams getting started',
    price: 150,
    minUsers: 10,
    maxUsers: 25,
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    agents: 5,
    storage: '10GB',
    support: 'Email support',
    sla: 'Best effort',
    features: [
      'Basic ERP (Accounting, Invoicing, Expenses)',
      '5 Essential Agents (Invoice, AP, Bank Rec, Expense, Report Distribution)',
      '10GB cloud storage',
      'Email support (24-48h response)',
      'Mobile app access',
      'Standard reports',
      'Data export (Excel, PDF)',
      'BBBEE compliance tracking'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'Most popular for growing businesses',
    price: 300,
    minUsers: 26,
    maxUsers: 50,
    icon: Building,
    color: 'from-purple-500 to-pink-500',
    agents: 15,
    storage: '100GB',
    support: 'Chat + Email',
    sla: '99.5% uptime',
    popular: true,
    features: [
      'Full ERP (Accounting, CRM, Inventory, Projects)',
      '15 Powerful Agents (All Financial + CRM + Basic Operations)',
      '100GB cloud storage',
      'Priority chat + email support',
      'Custom dashboards',
      'Advanced analytics',
      'API access (100 calls/min)',
      'Workflow automation',
      'Multi-currency support',
      'Role-based permissions',
      'BBBEE + Compliance automation'
    ]
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Advanced features for larger teams',
    price: 450,
    minUsers: 51,
    maxUsers: 100,
    icon: Package,
    color: 'from-green-500 to-emerald-500',
    agents: 22,
    storage: '500GB',
    support: 'Phone + Chat + Email',
    sla: '99.9% uptime',
    features: [
      'Full ERP + Advanced Features',
      '22 Advanced Agents (Exclude Manufacturing, Warehouse, Asset, Contractor, Payroll)',
      '500GB cloud storage',
      'Priority phone + chat + email support',
      'Custom agent configuration',
      'Advanced workflow builder',
      'API access (1000 calls/min)',
      'SSO integration',
      'Audit trail',
      'Custom reports',
      'Data warehouse access',
      'Dedicated onboarding'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Everything you need at scale',
    price: 600,
    minUsers: 101,
    maxUsers: 200,
    icon: Crown,
    color: 'from-orange-500 to-red-500',
    agents: 27,
    storage: 'Unlimited',
    support: 'Dedicated Account Manager',
    sla: '99.99% uptime + SLA guarantee',
    features: [
      'Full ERP + All Advanced Features',
      'All 27 AI Agents (Complete automation suite)',
      'Unlimited cloud storage',
      'Dedicated account manager',
      '24/7 priority support',
      'Custom agent development (1 agent/year included)',
      'White-labeling',
      'On-premise deployment option',
      'Advanced security (SOC 2, ISO 27001)',
      'Custom SLA',
      'Implementation support',
      'Quarterly strategy review',
      'Training sessions'
    ]
  }
];

const COMPETITORS = [
  { name: 'SAP Business One', price: 50000, users: 50, savings: 0.93 },
  { name: 'Oracle NetSuite', price: 56000, users: 50, savings: 0.87 },
  { name: 'Microsoft Dynamics 365', price: 30000, users: 50, savings: 0.76 },
  { name: 'Syspro ERP', price: 24000, users: 50, savings: 0.70 },
  { name: 'Odoo', price: 6000, users: 50, savings: 0.55 },
  { name: 'Sage Business Cloud', price: 8000, users: 50, savings: 0.63 }
];

export const Pricing: React.FC = () => {
  const [userCount, setUserCount] = useState(50);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');
  const [showCalculator, setShowCalculator] = useState(false);

  const selectedPlan = PLANS.find(p => userCount >= p.minUsers && userCount <= p.maxUsers) || PLANS[1];
  const monthlyPrice = selectedPlan.price * userCount;
  const annualPrice = monthlyPrice * 12 * 0.9; // 10% discount
  const displayPrice = billingPeriod === 'annual' ? annualPrice / 12 : monthlyPrice;

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
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-indigo-100 mb-8">
              60-95% cheaper than SAP, Oracle, or Dynamics 365
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={`text-lg ${billingPeriod === 'monthly' ? 'font-bold' : 'opacity-70'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                className="relative w-16 h-8 bg-white dark:bg-gray-800/20 rounded-full transition"
              >
                <div className={`absolute top-1 ${billingPeriod === 'annual' ? 'right-1' : 'left-1'} w-6 h-6 bg-white rounded-full transition-all`} />
              </button>
              <span className={`text-lg ${billingPeriod === 'annual' ? 'font-bold' : 'opacity-70'}`}>
                Annual
                <span className="ml-2 text-sm bg-green-400 text-green-900 px-2 py-1 rounded-full">
                  Save 10%
                </span>
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Pricing Calculator */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calculator size={32} className="text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Calculate Your Price</h2>
            </div>
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 font-medium"
            >
              {showCalculator ? 'Hide' : 'Show'} Calculator
            </button>
          </div>

          {showCalculator && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Users: {userCount}
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={userCount}
                  onChange={(e) => setUserCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>10 users</span>
                  <span>200 users</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl">
                  <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-2">Your Plan</div>
                  <div className="text-3xl font-bold text-indigo-900">{selectedPlan.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">{selectedPlan.agents} AI Agents Included</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl">
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-2">Monthly Cost</div>
                  <div className="text-3xl font-bold text-green-900">
                    R{displayPrice.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {billingPeriod === 'annual' ? 'Billed annually' : 'Billed monthly'}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">Per User/Month</div>
                  <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                    R{selectedPlan.price}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {billingPeriod === 'annual' ? 'R' + (selectedPlan.price * 0.9).toFixed(0) + ' with annual' : 'Save 10% annually'}
                  </div>
                </div>
              </div>

              {/* Savings Comparison */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">💰 Your Savings vs Competitors</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {COMPETITORS.slice(0, 3).map((comp, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{comp.name}</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white line-through">
                        R{comp.price.toLocaleString()}/mo
                      </div>
                      <div className="text-green-600 dark:text-green-400 font-bold text-sm mt-1">
                        Save {(comp.savings * 100).toFixed(0)}% (R{(comp.price - displayPrice).toLocaleString()}/mo)
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button className="flex-1 bg-indigo-600 text-white py-4 px-6 rounded-xl hover:bg-indigo-700 transition text-lg font-bold flex items-center justify-center gap-2">
                  Start Free Trial
                  <ArrowRight size={20} />
                </button>
                <button className="flex-1 bg-white dark:bg-gray-800 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 py-4 px-6 rounded-xl hover:bg-indigo-50 dark:bg-indigo-900/30 transition text-lg font-bold">
                  Schedule Demo
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {PLANS.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-2xl shadow-xl overflow-hidden ${
                  plan.popular ? 'ring-4 ring-indigo-500 relative' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-indigo-50 dark:bg-indigo-900/300 text-white px-4 py-1 text-sm font-bold flex items-center gap-1">
                    <Star size={14} fill="currentColor" />
                    MOST POPULAR
                  </div>
                )}

                <div className={`bg-gradient-to-r ${plan.color} p-6 text-white`}>
                  <Icon size={40} className="mb-3" />
                  <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm opacity-90">{plan.tagline}</p>
                  <div className="mt-6">
                    <div className="text-4xl font-bold">
                      R{plan.price}
                    </div>
                    <div className="text-sm opacity-90 mt-1">per user/month</div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <Users size={16} className="text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{plan.minUsers}-{plan.maxUsers} users</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap size={16} className="text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{plan.agents} AI Agents</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Package size={16} className="text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{plan.storage} storage</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{plan.support}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield size={16} className="text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{plan.sla}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <ul className="space-y-2">
                      {plan.features.slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-600 dark:text-gray-400">{feature}</span>
                        </li>
                      ))}
                      {plan.features.length > 5 && (
                        <li className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                          +{plan.features.length - 5} more features
                        </li>
                      )}
                    </ul>
                  </div>

                  <button className={`w-full py-3 px-4 rounded-lg font-bold transition ${
                    plan.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                    Get Started
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Agent Packages */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Individual Agent Packages</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Already have an ERP? Add AI automation with individual agents or bundles
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">Finance Pack</h3>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-3">R10,000<span className="text-lg">/mo</span></div>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>• Invoice Reconciliation Agent</li>
                <li>• Accounts Payable Agent</li>
                <li>• Bank Reconciliation Agent</li>
                <li>• General Ledger Agent</li>
                <li>• Expense Approval Agent</li>
              </ul>
              <button className="w-full mt-4 bg-blue-600 dark:bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                Add to Cart
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-green-900 mb-2">Sales Pack</h3>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-3">R7,500<span className="text-lg">/mo</span></div>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>• Lead Qualification Agent</li>
                <li>• Quote Generation Agent</li>
                <li>• Sales Order Agent</li>
              </ul>
              <button className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">
                Add to Cart
              </button>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-purple-900 mb-2">Operations Pack</h3>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-3">R8,500<span className="text-lg">/mo</span></div>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>• Inventory Reorder Agent</li>
                <li>• Purchasing Agent</li>
                <li>• Warehouse Management Agent</li>
              </ul>
              <button className="w-full mt-4 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition">
                Add to Cart
              </button>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-orange-900 mb-2">HR Pack</h3>
              <div className="text-3xl font-bold text-orange-600 mb-3">R12,000<span className="text-lg">/mo</span></div>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>• Payroll Agent</li>
                <li>• Leave Management Agent</li>
                <li>• Recruitment Agent</li>
                <li>• Performance Review Agent</li>
                <li>• Time & Attendance Agent</li>
              </ul>
              <button className="w-full mt-4 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition">
                Add to Cart
              </button>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">What's included in the free trial?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                14-day free trial with full access to your plan's features. No credit card required to start.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Can I change plans later?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Yes! Upgrade or downgrade anytime. Changes take effect immediately, and we'll prorate the difference.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">What if I need more than 200 users?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Contact our sales team for custom enterprise pricing. We support organizations of any size.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">How does billing work?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Monthly or annual billing. Annual plans get 10% discount. Add or remove users anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
