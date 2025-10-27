import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Building2, MapPin, Phone } from 'lucide-react';
import { formatPhoneNumber } from '../../utils/formatters';

interface Supplier {
  id: number;
  supplier_code: string;
  supplier_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  payment_terms: number;
  bbbee_level: number | null;
  is_active: boolean;
}

const SupplierList: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Mock data
    setSuppliers([
      { id: 1, supplier_code: 'SUP-00001', supplier_name: 'Tech Suppliers SA', contact_person: 'Mike Johnson', email: 'mike@techsup.co.za', phone: '0117778888', address: 'Johannesburg', payment_terms: 30, bbbee_level: 3, is_active: true },
      { id: 2, supplier_code: 'SUP-00002', supplier_name: 'Office Supplies Co', contact_person: 'Sarah Lee', email: 'sarah@office.co.za', phone: '0219998888', address: 'Cape Town', payment_terms: 30, bbbee_level: 2, is_active: true },
      { id: 3, supplier_code: 'SUP-00003', supplier_name: 'Hardware Depot', contact_person: 'Tom Brown', email: 'tom@hardware.co.za', phone: '0315556666', address: 'Durban', payment_terms: 45, bbbee_level: 4, is_active: true }
    ]);
  }, []);

  const filteredSuppliers = suppliers.filter(s =>
    s.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.supplier_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBBBEEBadge = (level: number | null) => {
    if (!level) return <span className="text-gray-400 text-sm">N/A</span>;
    const colors = ['bg-green-100 text-green-800', 'bg-blue-100 text-blue-800', 'bg-yellow-100 text-yellow-800', 'bg-orange-100 text-orange-800'];
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[Math.min(level - 1, 3)]}`}>Level {level}</span>;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 mt-1">Manage your supplier database</p>
        </div>
        <Link to="/procurement/suppliers/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Supplier
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Suppliers</div>
              <div className="text-2xl font-bold text-gray-900">{suppliers.length}</div>
            </div>
            <Building2 className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">Active Suppliers</div>
              <div className="text-2xl font-bold text-green-600">{suppliers.filter(s => s.is_active).length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Avg Payment Terms</div>
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(suppliers.reduce((sum, s) => sum + s.payment_terms, 0) / suppliers.length)} days
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Supplier Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Terms</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BBBEE</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredSuppliers.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link to={`/procurement/suppliers/${supplier.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                    {supplier.supplier_code}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="font-medium">{supplier.supplier_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div>{supplier.contact_person || '-'}</div>
                  <div className="text-gray-500">{supplier.email || '-'}</div>
                </td>
                <td className="px-6 py-4 text-sm">
                  {supplier.phone ? (
                    <div className="flex items-center">
                      <Phone className="w-3 h-3 text-gray-400 mr-1" />
                      {formatPhoneNumber(supplier.phone)}
                    </div>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 text-sm">
                  {supplier.address ? (
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 text-gray-400 mr-1" />
                      {supplier.address}
                    </div>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 text-sm">{supplier.payment_terms} days</td>
                <td className="px-6 py-4">{getBBBEEBadge(supplier.bbbee_level)}</td>
                <td className="px-6 py-4">
                  <Link to={`/procurement/suppliers/${supplier.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplierList;
