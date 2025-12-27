import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #1a2332 0%, #0f1419 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFB800' }}>
              <span className="text-2xl font-bold" style={{ color: '#1a2332' }}>A</span>
            </div>
            <span className="text-3xl font-bold" style={{ color: '#FFB800' }}>Aria</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Login</h1>
          <p className="text-gray-300">Welcome Back - Login to your AI orchestrator</p>
        </div>

        <div className="backdrop-blur-xl rounded-2xl p-8" style={{ backgroundColor: 'rgba(35, 45, 63, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div data-testid="error-message" className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2"
                  style={{ backgroundColor: 'rgba(15, 20, 25, 0.6)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2"
                  style={{ backgroundColor: 'rgba(15, 20, 25, 0.6)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold transition flex items-center justify-center space-x-2"
              style={{ backgroundColor: '#FFB800', color: '#1a2332' }}
            >
              {loading ? (
                <span>Logging in...</span>
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium" style={{ color: '#FFB800' }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
