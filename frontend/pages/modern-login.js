import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  UserIcon, 
  LockClosedIcon, 
  SparklesIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import ModernCard from '../components/ui/ModernCard';
import ModernButton from '../components/ui/ModernButton';
import ModernInput from '../components/ui/ModernInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ToastProvider, useToast } from '../components/ui/ModernToast';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/modern-dashboard');
    }
  }, [router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        toast.success('Login successful! Welcome to Aria.', {
          title: 'Welcome Back!',
          duration: 3000
        });

        setTimeout(() => {
          router.push('/modern-dashboard');
        }, 1000);
      } else {
        toast.error(data.detail || 'Login failed. Please check your credentials.', {
          title: 'Login Failed'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error. Please try again.', {
        title: 'Connection Error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center lg:text-left"
        >
          <div className="flex items-center justify-center lg:justify-start mb-8">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mr-4">
              <SparklesIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Aria</h1>
              <p className="text-sm text-gray-600">Document Management System</p>
            </div>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Welcome to the
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Future</span>
          </h2>

          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Experience world-class document management with AI-powered insights, 
            intelligent automation, and enterprise-grade security.
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: CpuChipIcon,
                title: 'AI-Powered',
                description: 'Intelligent document analysis and automation'
              },
              {
                icon: ShieldCheckIcon,
                title: 'Enterprise Security',
                description: 'Bank-level security and compliance'
              },
              {
                icon: DocumentTextIcon,
                title: 'Smart Management',
                description: 'Effortless document organization'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex p-3 bg-white rounded-lg shadow-sm mb-3">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="flex justify-center"
        >
          <ModernCard 
            className="w-full max-w-md"
            glassmorphism={true}
            shadow="lg"
            padding="p-8"
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h3>
              <p className="text-gray-600">Access your intelligent workspace</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <ModernInput
                label="Username"
                name="username"
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleInputChange}
                icon={<UserIcon className="h-5 w-5" />}
                required
                fullWidth
                variant="filled"
              />

              <ModernInput
                label="Password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                icon={<LockClosedIcon className="h-5 w-5" />}
                required
                fullWidth
                variant="filled"
              />

              <ModernButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                gradient={true}
                className="mt-8"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </ModernButton>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Demo Credentials: <br />
                  <span className="font-medium">admin / admin123</span>
                </p>
              </div>
            </div>

            {/* Quick Login Buttons */}
            <div className="mt-4 space-y-2">
              <ModernButton
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => {
                  setFormData({ username: 'admin', password: 'admin123' });
                }}
              >
                Use Demo Admin Account
              </ModernButton>
            </div>
          </ModernCard>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

const ModernLogin = () => {
  return (
    <ToastProvider>
      <LoginForm />
    </ToastProvider>
  );
};

export default ModernLogin;