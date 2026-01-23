import React from 'react';
import { FileText, CheckCircle, Key, Cpu, CreditCard, Shield, AlertTriangle, XCircle, Scale, Mail } from 'lucide-react';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
            <FileText className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Terms of Service</h1>
          <p className="text-gray-500 dark:text-gray-400">Please read these terms carefully before using our services</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">Last updated: October 27, 2025</p>
          
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl h-fit shadow-lg shadow-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">1. Acceptance of Terms</h2>
                <p className="text-gray-600 dark:text-gray-300">By accessing and using ARIA Platform, you accept and agree to be bound by the terms and provision of this agreement.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl h-fit shadow-lg shadow-blue-500/20">
                <Key className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">2. Use License</h2>
                <p className="text-gray-600 dark:text-gray-300">Permission is granted to temporarily access ARIA Platform for personal or commercial use according to your subscription tier.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl h-fit shadow-lg shadow-purple-500/20">
                <Cpu className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">3. Service Description</h2>
                <p className="text-gray-600 dark:text-gray-300">ARIA Platform provides AI-powered automation agents and ERP modules for business process automation.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl h-fit shadow-lg shadow-amber-500/20">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">4. Subscription and Payment</h2>
                <p className="text-gray-600 dark:text-gray-300">Subscription fees are billed monthly or annually based on your chosen plan. All fees are non-refundable except as required by law.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl h-fit shadow-lg shadow-indigo-500/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">5. Data Privacy</h2>
                <p className="text-gray-600 dark:text-gray-300">We are committed to protecting your data. Please refer to our Privacy Policy for detailed information.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl h-fit shadow-lg shadow-red-500/20">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">6. Limitation of Liability</h2>
                <p className="text-gray-600 dark:text-gray-300">ARIA Platform shall not be liable for any indirect, incidental, special, consequential, or punitive damages.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl h-fit shadow-lg shadow-pink-500/20">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">7. Termination</h2>
                <p className="text-gray-600 dark:text-gray-300">We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl h-fit shadow-lg shadow-cyan-500/20">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">8. Governing Law</h2>
                <p className="text-gray-600 dark:text-gray-300">These Terms shall be governed by the laws of South Africa.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl h-fit shadow-lg shadow-slate-500/20">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">9. Contact Information</h2>
                <p className="text-gray-600 dark:text-gray-300">For questions about these Terms, please contact us at: <a href="mailto:support@aria.vantax.co.za" className="text-blue-600 dark:text-blue-400 hover:underline">support@aria.vantax.co.za</a></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
