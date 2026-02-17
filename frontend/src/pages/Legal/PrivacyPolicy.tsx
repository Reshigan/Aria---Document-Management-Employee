import React from 'react';
import { Shield, Lock, Eye, Database, Globe, UserCheck, Cookie, RefreshCw, Mail } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl  mb-4">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-500 dark:text-gray-300">How we collect, use, and protect your information</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <p className="text-xs text-gray-500 dark:text-gray-300 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">Last updated: October 27, 2025</p>
          
          <div className="space-y-8">
            <div className="flex gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl h-fit shadow-lg shadow-blue-500/20">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">1. Information We Collect</h2>
                <p className="text-gray-600 dark:text-gray-300">We collect information you provide directly to us, including name, email, company information, and usage data.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl h-fit shadow-lg shadow-emerald-500/20">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">2. How We Use Your Information</h2>
                <p className="text-gray-600 dark:text-gray-300">We use the information we collect to provide, maintain, and improve our services, and to communicate with you.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl h-fit shadow-lg shadow-purple-500/20">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">3. Information Sharing</h2>
                <p className="text-gray-600 dark:text-gray-300">We do not sell, trade, or rent your personal information to third parties.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl h-fit shadow-lg shadow-red-500/20">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">4. Data Security</h2>
                <p className="text-gray-600 dark:text-gray-300">We implement appropriate security measures to protect your personal information, including SSL encryption and secure data storage.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl h-fit shadow-lg shadow-amber-500/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">5. POPIA Compliance</h2>
                <p className="text-gray-600 dark:text-gray-300">We comply with South Africa's Protection of Personal Information Act (POPIA) and GDPR where applicable.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl h-fit shadow-lg shadow-cyan-500/20">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">6. Your Rights</h2>
                <p className="text-gray-600 dark:text-gray-300">You have the right to access, correct, or delete your personal information. Contact us to exercise these rights.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl h-fit shadow-lg shadow-pink-500/20">
                <Cookie className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">7. Cookies</h2>
                <p className="text-gray-600 dark:text-gray-300">We use cookies to enhance your experience. You can control cookies through your browser settings.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl h-fit shadow-lg shadow-indigo-500/20">
                <RefreshCw className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">8. Changes to This Policy</h2>
                <p className="text-gray-600 dark:text-gray-300">We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl h-fit shadow-lg shadow-slate-500/20">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">9. Contact Us</h2>
                <p className="text-gray-600 dark:text-gray-300">If you have questions about this Privacy Policy, please contact us at: <a href="mailto:privacy@aria.vantax.co.za" className="text-indigo-600 dark:text-indigo-400 hover:underline">privacy@aria.vantax.co.za</a></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
