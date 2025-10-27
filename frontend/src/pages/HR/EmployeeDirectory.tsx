import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Mail, Phone } from 'lucide-react';
import { formatPhoneNumber, formatCurrency } from '../../utils/formatters';

interface Employee {
  id: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  employment_type: string;
  salary: number;
  is_active: boolean;
}

const EmployeeDirectory: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  useEffect(() => {
    // Mock data
    setEmployees([
      { id: 1, employee_number: 'EMP-001', first_name: 'John', last_name: 'Smith', email: 'john.smith@vantax.co.za', phone: '0821234567', department: 'IT', position: 'Software Developer', employment_type: 'permanent', salary: 45000, is_active: true },
      { id: 2, employee_number: 'EMP-002', first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.j@vantax.co.za', phone: '0827654321', department: 'Finance', position: 'Accountant', employment_type: 'permanent', salary: 38000, is_active: true },
      { id: 3, employee_number: 'EMP-003', first_name: 'Michael', last_name: 'Brown', email: 'michael.b@vantax.co.za', phone: '0831112222', department: 'Sales', position: 'Sales Manager', employment_type: 'permanent', salary: 42000, is_active: true },
      { id: 4, employee_number: 'EMP-004', first_name: 'Lisa', last_name: 'White', email: 'lisa.w@vantax.co.za', phone: '0843334444', department: 'HR', position: 'HR Manager', employment_type: 'permanent', salary: 40000, is_active: true },
      { id: 5, employee_number: 'EMP-005', first_name: 'David', last_name: 'Wilson', email: 'david.w@vantax.co.za', phone: '0825556666', department: 'IT', position: 'Junior Developer', employment_type: 'contract', salary: 28000, is_active: true }
    ]);
  }, []);

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
  
  const filteredEmployees = employees.filter(e => {
    const matchesSearch = `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         e.employee_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || e.department === filterDepartment;
    return matchesSearch && matchesDepartment && e.is_active;
  });

  const getEmploymentTypeBadge = (type: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      permanent: { bg: 'bg-green-100', text: 'text-green-800', label: 'Permanent' },
      contract: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Contract' },
      temporary: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Temporary' }
    };
    const config = configs[type] || configs.permanent;
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>{config.label}</span>;
  };

  const totalSalaries = employees.filter(e => e.is_active).reduce((sum, e) => sum + e.salary, 0);
  const permanentCount = employees.filter(e => e.is_active && e.employment_type === 'permanent').length;
  const contractCount = employees.filter(e => e.is_active && e.employment_type === 'contract').length;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Directory</h1>
          <p className="text-gray-500 mt-1">Manage your workforce</p>
        </div>
        <Link to="/hr/employees/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Employee
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Employees</div>
              <div className="text-2xl font-bold text-gray-900">{employees.filter(e => e.is_active).length}</div>
            </div>
            <Users className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Permanent</div>
          <div className="text-2xl font-bold text-green-600">{permanentCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Contract</div>
          <div className="text-2xl font-bold text-blue-600">{contractCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Total Payroll</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalSalaries)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept!}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((employee) => (
          <Link
            key={employee.id}
            to={`/hr/employees/${employee.id}`}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {employee.first_name[0]}{employee.last_name[0]}
                </div>
                <div className="ml-3">
                  <h3 className="font-medium text-gray-900">{employee.first_name} {employee.last_name}</h3>
                  <p className="text-sm text-gray-500">{employee.employee_number}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium w-24">Position:</span>
                <span>{employee.position || '-'}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium w-24">Department:</span>
                <span>{employee.department || '-'}</span>
              </div>
              {employee.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2" />
                  <span className="truncate">{employee.email}</span>
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>{formatPhoneNumber(employee.phone)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              {getEmploymentTypeBadge(employee.employment_type)}
              <span className="text-sm font-medium text-gray-900">{formatCurrency(employee.salary)}/mo</span>
            </div>
          </Link>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">No employees found</p>
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectory;
