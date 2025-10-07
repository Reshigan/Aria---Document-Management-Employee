'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  total_documents: number;
  processed_documents: number;
  pending_documents: number;
  processing_rate: number;
}

interface Document {
  id: number;
  original_filename: string;
  document_type: string;
  status: string;
  created_at: string;
  file_size: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      // Fetch user profile
      const userRes = await fetch('/api/users/me', { headers });
      if (userRes.ok) {
        setUser(await userRes.json());
      }

      // Fetch stats
      const statsRes = await fetch('/api/dashboard/stats', { headers });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // Fetch documents
      const docsRes = await fetch('/api/documents', { headers });
      if (docsRes.ok) {
        setDocuments(await docsRes.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        fetchData(); // Refresh data
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      alert('Upload error');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">ARIA Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user.full_name}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Total Documents</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.total_documents}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Processed</h3>
              <p className="text-3xl font-bold text-green-600">{stats.processed_documents}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Pending</h3>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending_documents}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Success Rate</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.processing_rate}%</p>
            </div>
          </div>
        )}

        {/* Upload */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Upload Document</h2>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {uploading && <p className="mt-2 text-blue-600">Uploading...</p>}
        </div>

        {/* Documents */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">Recent Documents</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {doc.original_filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.document_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        doc.status === 'processed' ? 'bg-green-100 text-green-800' :
                        doc.status === 'uploaded' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.round(doc.file_size / 1024)} KB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}