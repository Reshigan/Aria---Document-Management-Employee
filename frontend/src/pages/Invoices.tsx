import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Invoices() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/financial/invoices', { replace: true });
  }, [navigate]);
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-600">Redirecting to Invoice Management...</p>
      </div>
    </div>
  );
}
