/**
 * Landing Page - Clean, Professional, Premium
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, ArrowRight, CheckCircle, Sparkles, Zap, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-800">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center">
              <Agent className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Aria</span>
          </div>
          
          <div className="flex items-center space-x-8">
            <Link to="/agents" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition">
              Platform
            </Link>
            <Link to="/login" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition">
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

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Enterprise AI Platform for South Africa</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-gray-900 dark:text-white mb-8 leading-none tracking-tight">
              Intelligence that
              <br />
              works for you
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto font-light">
              67 AI-powered automation agents and 11 complete ERP modules ready to transform your business operations.
              From invoices to compliance, manufacturing to retail, SAP integration to master data management, we handle it all.
            </p>
            
            <div className="flex items-center justify-center space-x-4 mb-16">
              <Link
                to="/signup"
                className="group px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium text-lg transition-all flex items-center space-x-2"
              >
                <span>Start free trial</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link
                to="/agents"
                className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-lg transition-all"
              >
                Explore platform
              </Link>
            </div>
            
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              Built for enterprise,
              <br />
              priced for growth
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              A complete AI platform that replaces multiple systems and saves you millions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: '67 Specialized Agents + 11 ERP Modules',
                description: 'Pre-built automation for finance, HR, sales, operations, compliance, manufacturing, procurement, retail, master data, order-to-cash, and SAP integration. Deploy in hours, not months.'
              },
              {
                icon: Zap,
                title: 'SAP Integration + Intelligent Automation',
                description: 'Works standalone OR integrates with SAP ECC/S/4HANA. 95% accuracy on invoice reconciliation. Auto-matching, duplicate detection, and 3-way matching built-in.'
              },
              {
                icon: CheckCircle,
                title: 'South African DNA',
                description: 'ONLY ERP with automated BBBEE scorecard calculation (109 points). SARS integration, UIF, SDL, and PAYE automation. Built specifically for SA businesses.'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 transition-all"
              >
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-5xl md:text-6xl font-bold text-white mb-3">93%</div>
              <div className="text-gray-400 text-lg">Cost savings vs SAP</div>
            </div>
            <div>
              <div className="text-5xl md:text-6xl font-bold text-white mb-3">24hrs</div>
              <div className="text-gray-400 text-lg">Time to deployment</div>
            </div>
            <div>
              <div className="text-5xl md:text-6xl font-bold text-white mb-3">20+hrs</div>
              <div className="text-gray-400 text-lg">Saved per month per agent</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-8 leading-tight tracking-tight">
            Ready to automate
            <br />
            your business?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Start your 14-day free trial today. No credit card required.
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
      <footer className="py-16 px-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center">
                  <Agent className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-semibold text-gray-900 dark:text-white">Aria</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Enterprise AI automation for South African businesses
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li><Link to="/agents" className="hover:text-gray-900 dark:text-white">Platform</Link></li>
                <li><a href="#" className="hover:text-gray-900 dark:text-white">Features</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:text-white">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-gray-900 dark:text-white">About</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-gray-900 dark:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">&copy; 2025 Vanta X Pty Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
