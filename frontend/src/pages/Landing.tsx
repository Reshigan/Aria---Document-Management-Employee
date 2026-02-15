/**
 * Landing Page - Behance-inspired Clean UI with Dark Theme & Gold Accents
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Sparkles, Zap, Brain, BarChart3, Shield, Users, Package, Bot, Globe, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f1419 0%, #1a2332 100%)' }}>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-xl font-bold text-slate-900">A</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">ARIA</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition">
              Features
            </a>
            <a href="#modules" className="text-sm font-medium text-gray-400 hover:text-white transition">
              Modules
            </a>
            <a href="#pricing" className="text-sm font-medium text-gray-400 hover:text-white transition">
              Pricing
            </a>
            <Link to="/login" className="text-sm font-medium text-gray-400 hover:text-white transition">
              Sign In
            </Link>
            <Link 
              to="/login" 
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 text-sm font-semibold rounded-xl transition shadow-lg shadow-amber-500/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-40 left-1/4 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-amber-600 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>AI-Native Enterprise Resource Planning for South Africa</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight tracking-tight">
              The Future of
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Business Automation</span>
            </h1>
            
            <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              109 AI-powered automation agents and complete ERP modules ready to transform your business.
              Finance, HR, Inventory, CRM, Manufacturing, and full South African compliance built-in.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
              <Link
                to="/login"
                className="group px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 rounded-xl font-semibold text-lg transition-all flex items-center space-x-2 shadow-xl shadow-amber-500/25"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link
                to="/login"
                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-semibold text-lg transition-all"
              >
                Watch Demo
              </Link>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>
          
          {/* Dashboard Preview Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative"
          >
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-4 text-xs text-gray-500">ARIA Executive Dashboard</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                  <div className="text-xs text-gray-500 mb-1">Revenue (YTD)</div>
                  <div className="text-2xl font-bold text-white">R12.4M</div>
                  <div className="text-xs text-emerald-500">+12.5%</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                  <div className="text-xs text-gray-500 mb-1">Net Profit</div>
                  <div className="text-2xl font-bold text-white">R2.1M</div>
                  <div className="text-xs text-emerald-500">+8.3%</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                  <div className="text-xs text-gray-500 mb-1">Active Agents</div>
                  <div className="text-2xl font-bold text-amber-500">109</div>
                  <div className="text-xs text-gray-500">All operational</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                  <div className="text-xs text-gray-500 mb-1">Success Rate</div>
                  <div className="text-2xl font-bold text-white">99.8%</div>
                  <div className="text-xs text-emerald-500">Excellent</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Everything You Need to
              <br />
              <span className="text-amber-500">Run Your Business</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              A complete AI-powered platform that replaces multiple systems and saves you time and money
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: '109 AI Automation Agents',
                description: 'Pre-built automation for finance, HR, sales, operations, compliance, manufacturing, and procurement. Deploy in hours, not months.',
                color: 'from-purple-500 to-purple-600'
              },
              {
                icon: Zap,
                title: 'Intelligent Automation',
                description: '95% accuracy on invoice reconciliation. Auto-matching, duplicate detection, and 3-way matching built-in for seamless operations.',
                color: 'from-blue-500 to-blue-600'
              },
              {
                icon: Shield,
                title: 'South African Compliance',
                description: 'Automated B-BBEE scorecard calculation, SARS integration, UIF, SDL, and PAYE automation. Built specifically for SA businesses.',
                color: 'from-emerald-500 to-emerald-600'
              },
              {
                icon: BarChart3,
                title: 'Real-time Analytics',
                description: 'Executive dashboards, financial reports, and KPIs updated in real-time. Make data-driven decisions with confidence.',
                color: 'from-amber-500 to-amber-600'
              },
              {
                icon: Users,
                title: 'Complete HR & Payroll',
                description: 'Employee management, leave tracking, attendance, payroll processing with SA tax calculations, and performance reviews.',
                color: 'from-pink-500 to-pink-600'
              },
              {
                icon: Package,
                title: 'Inventory & Manufacturing',
                description: 'Multi-warehouse management, BOM, work orders, production planning, and quality control all in one place.',
                color: 'from-cyan-500 to-cyan-600'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all group"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-3xl border border-amber-500/20 p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl md:text-5xl font-bold text-amber-500 mb-2">93%</div>
                <div className="text-gray-400">Cost Savings vs SAP</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">24hrs</div>
                <div className="text-gray-400">Time to Deployment</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">109</div>
                <div className="text-gray-400">AI Automation Agents</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-emerald-500 mb-2">99.8%</div>
                <div className="text-gray-400">Uptime Guarantee</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight tracking-tight">
            Ready to Transform
            <br />
            <span className="text-amber-500">Your Business?</span>
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Start your 14-day free trial today. No credit card required. Full access to all features.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/login"
              className="group inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 rounded-xl font-semibold text-lg transition-all shadow-xl shadow-amber-500/25"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-semibold text-lg transition-all"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <span className="text-xl font-bold text-slate-900">A</span>
                </div>
                <span className="text-2xl font-bold text-white">ARIA</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                AI-Native Enterprise Resource Planning for South African businesses. Automate your operations with 109 intelligent agents.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3 text-xs text-gray-400">
                <li><a href="#features" className="hover:text-amber-500 transition">Features</a></li>
                <li><a href="#modules" className="hover:text-amber-500 transition">Modules</a></li>
                <li><a href="#pricing" className="hover:text-amber-500 transition">Pricing</a></li>
                <li><Link to="/login" className="hover:text-amber-500 transition">Platform</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3 text-xs text-gray-400">
                <li><a href="#" className="hover:text-amber-500 transition">About Us</a></li>
                <li><a href="#" className="hover:text-amber-500 transition">Contact</a></li>
                <li><a href="#" className="hover:text-amber-500 transition">Careers</a></li>
                <li><a href="#" className="hover:text-amber-500 transition">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3 text-xs text-gray-400">
                <li><a href="#" className="hover:text-amber-500 transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-amber-500 transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-amber-500 transition">Security</a></li>
                <li><a href="#" className="hover:text-amber-500 transition">POPIA Compliance</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">2025 VantaX Holdings (Pty) Ltd. All rights reserved.</p>
            <div className="flex items-center gap-6 text-xs text-gray-500">
              <span>Made with care in South Africa</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
