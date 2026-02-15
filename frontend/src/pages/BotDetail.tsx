/**
 * Agent Detail Page - Reusable template for all agent detail pages
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Agent, ArrowLeft, CheckCircle, TrendingUp, DollarSign, Clock, Users,
  Zap, Shield, Download, Play, Star, ArrowRight, Package
} from 'lucide-react';

interface BotFeature {
  title: string;
  description: string;
  icon: any;
}

interface BotUseCase {
  title: string;
  description: string;
  savingsTime: string;
  savingsCost: string;
}

interface BotData {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  isFunctional: boolean;
  roi: number;
  deploymentTime: string;
  pricing: {
    starter: string;
    professional: string;
    enterprise: string;
  };
  features: BotFeature[];
  useCases: BotUseCase[];
  integrations: string[];
  requirements: string[];
  testimonial?: {
    quote: string;
    author: string;
    company: string;
    role: string;
  };
}

const BotDetail: React.FC = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [botData, setBotData] = useState<BotData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch agent data from API
    const fetchBotData = async () => {
      try {
        const response = await fetch(`/api/agents/marketplace/${botId}`);
        if (response.ok) {
          const data = await response.json();
          setBotData(data);
        }
      } catch (error) {
        console.error('Error fetching agent data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBotData();
  }, [botId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Agent className="w-12 h-12 text-gray-400 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading agent details...</p>
        </div>
      </div>
    );
  }

  if (!botData) {
    return (
      <div className="bg-white dark:bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Agent not found</p>
          <Link to="/agents" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to Agent Showcase
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700">
        <div className="mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center">
              <Agent className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Aria</span>
          </Link>
          
          <div className="flex items-center space-x-8">
            <Link to="/agents" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition">
              ← All Agents
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
      <section className="pt-32 pb-16 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center space-x-3 mb-6">
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-full">
                {botData.category}
              </span>
              {botData.isFunctional ? (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>LIVE NOW</span>
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold rounded-full">
                  COMING SOON
                </span>
              )}
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              {botData.name}
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-8 font-light">
              {botData.tagline}
            </p>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-3" />
                <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">{botData.roi}%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">ROI</div>
              </div>
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">{botData.deploymentTime}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Deploy Time</div>
              </div>
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <Zap className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
                <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">95%+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3">
              {botData.isFunctional ? (
                <>
                  <button 
                    onClick={() => navigate('/signup')}
                    className="px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-semibold text-lg transition flex items-center space-x-2"
                  >
                    <span>Deploy Agent Now</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => navigate(`/demo/${botData.id}`)}
                    className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-900 rounded-lg font-semibold text-lg transition flex items-center space-x-2"
                  >
                    <Play className="w-5 h-5" />
                    <span>Try Demo</span>
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => navigate('/signup')}
                  className="px-8 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-lg transition flex items-center space-x-2"
                >
                  <span>Join Waitlist</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Description */}
      <section className="py-16 px-6 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
            {botData.description}
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-12 text-center">
            Key Features
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
            {botData.features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <feature.icon className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-6 bg-white dark:bg-gray-800">
        <div className="mx-auto">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-12 text-center">
            Use Cases & ROI
          </h2>
          <div className="space-y-8">
            {botData.useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                      {useCase.title}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      {useCase.description}
                    </p>
                  </div>
                  <div className="ml-8 text-right">
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time Saved</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{useCase.savingsTime}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cost Saved</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{useCase.savingsCost}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-8 text-center">
            Integrations
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {botData.integrations.map((integration, index) => (
              <div
                key={index}
                className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium"
              >
                {integration}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6 bg-white dark:bg-gray-800">
        <div className="mx-auto">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-12 text-center">
            Pricing
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="p-8 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Starter</h3>
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                  {botData.pricing.starter}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">per month</div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>5 users included</span>
                </li>
                <li className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>Basic features</span>
                </li>
                <li className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>Email support</span>
                </li>
              </ul>
              <button
                onClick={() => navigate('/signup?plan=starter')}
                className="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition"
              >
                Get Started
              </button>
            </div>

            {/* Professional */}
            <div className="p-8 bg-black text-white rounded-xl border-2 border-black relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="px-4 py-1 bg-green-50 dark:bg-green-900/300 text-white text-xs font-bold rounded-full">
                  POPULAR
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Professional</h3>
                <div className="text-4xl font-bold mb-1">
                  {botData.pricing.professional}
                </div>
                <div className="text-sm text-gray-300">per month</div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>20 users included</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>All features</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Advanced analytics</span>
                </li>
              </ul>
              <button
                onClick={() => navigate('/signup?plan=professional')}
                className="w-full py-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 text-black rounded-lg font-semibold transition"
              >
                Get Started
              </button>
            </div>

            {/* Enterprise */}
            <div className="p-8 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Enterprise</h3>
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                  {botData.pricing.enterprise}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">custom pricing</div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>Unlimited users</span>
                </li>
                <li className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>All features + custom</span>
                </li>
                <li className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>24/7 dedicated support</span>
                </li>
                <li className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>SLA guarantees</span>
                </li>
              </ul>
              <button
                onClick={() => navigate('/contact?plan=enterprise')}
                className="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      {botData.testimonial && (
        <section className="py-16 px-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <div className="p-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-2xl text-gray-900 dark:text-white font-light mb-8 italic">
                "{botData.testimonial.quote}"
              </p>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {botData.testimonial.author}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  {botData.testimonial.role}, {botData.testimonial.company}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Requirements */}
      <section className="py-16 px-6 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-8 text-center">
            Requirements
          </h2>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
            <ul className="space-y-3">
              {botData.requirements.map((req, index) => (
                <li key={index} className="flex items-start space-x-3 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-10">
            Deploy {botData.name} in {botData.deploymentTime}. No credit card required for trial.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate('/signup')}
              className="px-10 py-5 bg-black hover:bg-gray-800 text-white rounded-lg font-semibold text-xl transition flex items-center space-x-2"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-6 h-6" />
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="px-10 py-5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-900 rounded-lg font-semibold text-xl transition"
            >
              Talk to Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="mx-auto text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">&copy; 2025 Vanta X Pty Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default BotDetail;
