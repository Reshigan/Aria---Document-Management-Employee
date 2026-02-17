import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Sparkles, Bot, Shield, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex" style={{ background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0f1419 100%)' }}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-amber-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-600 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 text-center max-w-lg">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-2xl shadow-amber-500/30 mb-6">
              <span className="text-4xl font-bold text-slate-900">A</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">ARIA</h1>
            <p className="text-xl text-gray-300">AI-Native Enterprise Resource Planning</p>
          </div>
          
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">67 AI Automation Agents</h3>
                <p className="text-sm text-gray-300">Intelligent automation for every business process</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Multi-Country Compliance</h3>
                <p className="text-sm text-gray-300">56 countries with local tax and statutory rules</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Complete ERP Suite</h3>
                <p className="text-sm text-gray-300">Finance, HR, Inventory, CRM, and Manufacturing</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-500/25 mb-4">
              <span className="text-2xl font-bold text-slate-900">A</span>
            </div>
            <h1 className="text-2xl font-bold text-white">ARIA</h1>
          </div>

          {/* Login Card */}
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-gray-300">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div data-testid="error-message" className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-900/60 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                                        placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-900/60 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                                        placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-slate-900 text-amber-500 focus:ring-amber-500/50" />
                  <span className="text-gray-300">Remember me</span>
                </label>
                <a href="#" className="text-gray-300 hover:text-white transition-colors underline">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-slate-900 border-t-transparent"></span>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-300">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-amber-500 hover:text-amber-400 transition-colors">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-gray-500">
            {new Date().getFullYear()} VantaX Holdings (Pty) Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
