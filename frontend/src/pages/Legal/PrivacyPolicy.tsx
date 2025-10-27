import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Privacy Policy</h1>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Last updated: October 27, 2025</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">1. Information We Collect</h2>
          <p>We collect information you provide directly to us, including name, email, company information, and usage data.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">2. How We Use Your Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our services, and to communicate with you.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">3. Information Sharing</h2>
          <p>We do not sell, trade, or rent your personal information to third parties.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">4. Data Security</h2>
          <p>We implement appropriate security measures to protect your personal information, including SSL encryption and secure data storage.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">5. POPIA Compliance</h2>
          <p>We comply with South Africa's Protection of Personal Information Act (POPIA) and GDPR where applicable.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">6. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal information. Contact us to exercise these rights.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">7. Cookies</h2>
          <p>We use cookies to enhance your experience. You can control cookies through your browser settings.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">8. Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">9. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us at: privacy@aria.vantax.co.za</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
