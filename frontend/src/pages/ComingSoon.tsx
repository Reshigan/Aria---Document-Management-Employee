import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';

interface ComingSoonProps {
  title?: string;
  description?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ title, description }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract page name from path
  const pathParts = location.pathname.split('/').filter(Boolean);
  const pageName = title || pathParts.map(part => 
    part.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  ).join(' > ');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {pageName}
        </h1>
        
        <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 mb-4">
          <Clock className="w-5 h-5" />
          <span className="font-medium">Coming Soon</span>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {description || "We're working hard to bring you this feature. It will be available in an upcoming release."}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            Go to Dashboard
          </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Need this feature urgently? Contact support at{' '}
            <a href="mailto:support@aria.vantax.co.za" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              support@aria.vantax.co.za
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
