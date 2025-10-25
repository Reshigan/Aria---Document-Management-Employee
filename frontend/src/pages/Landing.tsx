/**
 * Landing Page - Modern, Beautiful, Converts
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Zap, TrendingUp, Users, Shield, Sparkles, ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Aria</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link to="/login" className="text-gray-300 hover:text-white transition">
              Login
            </Link>
            <Link 
              to="/signup" 
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block mb-6">
              <span className="px-4 py-2 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-medium border border-indigo-500/30">
                🚀 Introducing Aria 2.0 - The AI Orchestrator
              </span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Your AI Operating
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                System for Business
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
              Meet Aria: The central AI controller that orchestrates specialized bots,
              executes processes, and embeds deeply across your organization.
            </p>
            
            <div className="flex items-center justify-center space-x-4 mb-12">
              <Link
                to="/signup"
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-lg transition-all hover:scale-105 flex items-center space-x-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              
              <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-lg transition-all backdrop-blur-sm">
                Watch Demo
              </button>
            </div>
            
            <p className="text-sm text-gray-400">
              ✨ No credit card required • 14-day free trial • Cancel anytime
            </p>
          </motion.div>

          {/* Hero Image/Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="mt-16"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 blur-3xl" />
              <div className="relative bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
                <div className="aspect-video bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-24 h-24 text-indigo-400 animate-pulse" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              One AI to Rule Them All
            </h2>
            <p className="text-xl text-gray-300">
              Aria orchestrates everything. You focus on what matters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Bot,
                title: 'Multi-Bot Orchestration',
                description: 'Aria delegates to 10+ specialized bots (Sales, Legal, HR, Finance) and synthesizes results'
              },
              {
                icon: Zap,
                title: 'Voice + Avatar Interface',
                description: 'Talk to Aria naturally. Realistic avatar with speech-to-text and text-to-speech'
              },
              {
                icon: TrendingUp,
                title: 'Deep Business Embedding',
                description: 'Grow within accounts. Track embedding score and expand across departments'
              },
              {
                icon: Users,
                title: 'Multi-Tenant SaaS',
                description: 'Organizations, subscriptions, usage tracking, and flexible billing out of the box'
              },
              {
                icon: Shield,
                title: 'Enterprise Security',
                description: 'Complete data isolation, API keys, role-based access, and audit logging'
              },
              {
                icon: Sparkles,
                title: 'Process Automation',
                description: 'Execute complex multi-step workflows with human-in-the-loop when needed'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all hover:scale-105"
              >
                <feature.icon className="w-12 h-12 text-indigo-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-300">
              Start free, grow as you expand
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                name: 'Free',
                price: '$0',
                features: ['1 bot template', '1 user', '100 API calls/mo', 'Email support']
              },
              {
                name: 'Starter',
                price: '$29',
                features: ['3 bot templates', '5 users', '1,000 API calls/mo', 'Chat support'],
                popular: false
              },
              {
                name: 'Professional',
                price: '$99',
                features: ['5 bot templates', '15 users', '10,000 API calls/mo', 'Priority support'],
                popular: true
              },
              {
                name: 'Enterprise',
                price: '$999',
                features: ['All templates', 'Unlimited users', 'Unlimited calls', 'Dedicated support']
              }
            ].map((plan, i) => (
              <div
                key={i}
                className={`p-8 rounded-2xl border ${
                  plan.popular
                    ? 'bg-indigo-600/20 border-indigo-500 scale-105'
                    : 'bg-white/5 border-white/10'
                } backdrop-blur-sm`}
              >
                {plan.popular && (
                  <span className="inline-block px-3 py-1 rounded-full bg-indigo-500 text-white text-xs font-medium mb-4">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center space-x-2 text-gray-300">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`block w-full py-3 rounded-lg font-semibold text-center transition ${
                    plan.popular
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Join 500+ companies that have embedded Aria across their operations
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center space-x-2 px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xl transition-all hover:scale-105"
          >
            <span>Start Your Free Trial</span>
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <p>&copy; 2025 Vanta X Pty Ltd. All rights reserved.</p>
          <p className="mt-2 text-sm">Built with ❤️ for the future of work</p>
        </div>
      </footer>
    </div>
  );
};
