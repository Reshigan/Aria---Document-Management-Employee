import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Building2 } from 'lucide-react';
import { formatCurrency, formatPhoneNumber } from '../../utils/formatters';

interface Customer {
  id: number;
  customer_code: string;
  customer_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  bbbee_level: number | null;
  credit_limit: number;
  is_active: boolean;
}

const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for demonstration
  useEffect(() => {
    setCustomers([
      { id: 1, customer_code: 'CUST-00001', customer_name: 'ABC Manufacturing', contact_person: 'John Smith', email: 'john@abc.co.za', phone: '0114567890', bbbee_level: 2, credit_limit: 100000, is_active: true },
      { id: 2, customer_code: 'CUST-00002', customer_name: 'XYZ Trading', contact_person: 'Jane Doe', email: 'jane@xyz.co.za', phone: '0213334455', bbbee_level: 4, credit_limit: 50000, is_active: true },
      { id: 3, customer_code: 'CUST-00003', customer_name: 'Mega Corp', contact_person: 'Bob Wilson', email: 'bob@mega.co.za', phone: '0312223344', bbbee_level: 1, credit_limit: 250000, is_active: true }
    ]);
  }, []);

  const filteredCustomers = customers.filter(c =>
    c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBBBEEBadge = (level: number | null) => {
    if (!level) return <span className="text-gray-400 text-sm">N/A</span>;
    const colors = ['bg-green-100 text-green-800', 'bg-blue-100 text-blue-800', 'bg-yellow-100 text-yellow-800', 'bg-orange-100 text-orange-800'];
    const colorClass = colors[Math.min(level - 1, 3)] || 'bg-gray-100 text-gray-800';
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>Level {level}</span>;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">Manage your customer database</p>
        </div>
        <Link to="/crm/customers/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Customer
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Customers</div>
              <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
            </div>
            <Users className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">Active Customers</div>
              <div className="text-2xl font-bold text-green-600">{customers.filter(c => c.is_active).length}</div>
            </div>
            <Building2 className="w-10 h-10 text-green-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Credit Limit</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(customers.reduce((sum, c) => sum + c.credit_limit, 0))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BBBEE</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Limit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link to={`/crm/customers/${customer.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                    {customer.customer_code}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm font-medium">{customer.customer_name}</td>
                <td className="px-6 py-4 text-sm">{customer.contact_person || '-'}</td>
                <td className="px-6 py-4 text-sm">{customer.email || '-'}</td>
                <td className="px-6 py-4 text-sm">{customer.phone ? formatPhoneNumber(customer.phone) : '-'}</td>
                <td className="px-6 py-4">{getBBBEEBadge(customer.bbbee_level)}</td>
                <td className="px-6 py-4 text-sm font-medium">{formatCurrency(customer.credit_limit)}</td>
                <td className="px-6 py-4">
                  <Link to={`/crm/customers/${customer.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">No customers found</p>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
