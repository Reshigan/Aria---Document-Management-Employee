import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Terms of Service</h1>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Last updated: October 27, 2025</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">1. Acceptance of Terms</h2>
          <p>By accessing and using ARIA Platform, you accept and agree to be bound by the terms and provision of this agreement.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">2. Use License</h2>
          <p>Permission is granted to temporarily access ARIA Platform for personal or commercial use according to your subscription tier.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">3. Service Description</h2>
          <p>ARIA Platform provides AI-powered automation agents and ERP modules for business process automation.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">4. Subscription and Payment</h2>
          <p>Subscription fees are billed monthly or annually based on your chosen plan. All fees are non-refundable except as required by law.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">5. Data Privacy</h2>
          <p>We are committed to protecting your data. Please refer to our Privacy Policy for detailed information.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">6. Limitation of Liability</h2>
          <p>ARIA Platform shall not be liable for any indirect, incidental, special, consequential, or punitive damages.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">7. Termination</h2>
          <p>We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">8. Governing Law</h2>
          <p>These Terms shall be governed by the laws of South Africa.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">9. Contact Information</h2>
          <p>For questions about these Terms, please contact us at: support@aria.vantax.co.za</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
