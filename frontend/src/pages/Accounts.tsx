import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Accounts() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/financial/general-ledger', { replace: true });
  }, [navigate]);
  
  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 space-y-3">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Chart of Accounts</h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-600 dark:text-gray-400">Redirecting to General Ledger...</p>
      </div>
    </div>
  );
}
