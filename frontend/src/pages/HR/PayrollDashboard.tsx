import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import ConfirmDialog from '../../components/ConfirmDialog';

interface Employee {
  id: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employment_type: 'PERMANENT' | 'CONTRACT' | 'TEMPORARY';
  salary: number;
  is_active: boolean;
  created_at: string;
}

interface Payslip {
  id: number;
  payslip_number: string;
  employee_id: number;
  employee_name?: string;
  pay_period_start: string;
  pay_period_end: string;
  gross_salary: number;
  paye: number;
  uif: number;
  sdl: number;
  other_deductions: number;
  net_salary: number;
  status: 'DRAFT' | 'APPROVED' | 'PAID';
  created_at: string;
}

interface TaxSummary {
  total_paye: number;
  total_uif: number;
  total_sdl: number;
  period: string;
}

const PayrollDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'payslips' | 'tax_summary'>('employees');
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesSearch, setEmployeesSearch] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    employment_type: 'PERMANENT' as 'PERMANENT' | 'CONTRACT' | 'TEMPORARY',
    salary: '',
    is_active: true
  });
  
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [payslipsSearch, setPayslipsSearch] = useState('');
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);
  const [payslipForm, setPayslipForm] = useState({
    employee_id: '',
    pay_period_start: '',
    pay_period_end: '',
    gross_salary: '',
    paye: '',
    uif: '',
    sdl: '',
    other_deductions: '0'
  });
  
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [taxSummaryLoading, setTaxSummaryLoading] = useState(false);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'employee' | 'payslip';
    id: number;
    name: string;
  }>({ show: false, type: 'employee', id: 0, name: '' });
  
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'employees') loadEmployees();
    else if (activeTab === 'payslips') loadPayslips();
    else if (activeTab === 'tax_summary') loadTaxSummary();
  }, [activeTab]);

  const loadEmployees = async () => {
    setEmployeesLoading(true);
    setError('');
    try {
      const response = await api.get('/erp/payroll/employees');
      setEmployees(response.data.employees || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load employees');
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleCreateEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      employment_type: 'PERMANENT',
      salary: '',
      is_active: true
    });
    setShowEmployeeModal(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      employment_type: employee.employment_type,
      salary: employee.salary.toString(),
      is_active: employee.is_active
    });
    setShowEmployeeModal(true);
  };

  const handleSaveEmployee = async () => {
    setError('');
    try {
      const payload = {
        ...employeeForm,
        salary: parseFloat(employeeForm.salary)
      };
      
      if (editingEmployee) {
        await api.put(`/erp/payroll/employees/${editingEmployee.id}`, payload);
      } else {
        await api.post('/erp/payroll/employees', payload);
      }
      setShowEmployeeModal(false);
      loadEmployees();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save employee');
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    try {
      await api.delete(`/erp/payroll/employees/${id}`);
      loadEmployees();
      setDeleteConfirm({ show: false, type: 'employee', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete employee');
    }
  };

  const loadPayslips = async () => {
    setPayslipsLoading(true);
    setError('');
    try {
      const response = await api.get('/erp/payroll/payslips');
      setPayslips(response.data.payslips || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load payslips');
    } finally {
      setPayslipsLoading(false);
    }
  };

  const handleCreatePayslip = () => {
    setEditingPayslip(null);
    setPayslipForm({
      employee_id: '',
      pay_period_start: '',
      pay_period_end: '',
      gross_salary: '',
      paye: '',
      uif: '',
      sdl: '',
      other_deductions: '0'
    });
    setShowPayslipModal(true);
  };

  const handleEditPayslip = (payslip: Payslip) => {
    setEditingPayslip(payslip);
    setPayslipForm({
      employee_id: payslip.employee_id.toString(),
      pay_period_start: payslip.pay_period_start,
      pay_period_end: payslip.pay_period_end,
      gross_salary: payslip.gross_salary.toString(),
      paye: payslip.paye.toString(),
      uif: payslip.uif.toString(),
      sdl: payslip.sdl.toString(),
      other_deductions: payslip.other_deductions.toString()
    });
    setShowPayslipModal(true);
  };

  const handleSavePayslip = async () => {
    setError('');
    try {
      const payload = {
        ...payslipForm,
        employee_id: parseInt(payslipForm.employee_id),
        gross_salary: parseFloat(payslipForm.gross_salary),
        paye: parseFloat(payslipForm.paye),
        uif: parseFloat(payslipForm.uif),
        sdl: parseFloat(payslipForm.sdl),
        other_deductions: parseFloat(payslipForm.other_deductions)
      };
      
      if (editingPayslip) {
        await api.put(`/erp/payroll/payslips/${editingPayslip.id}`, payload);
      } else {
        await api.post('/erp/payroll/payslips', payload);
      }
      setShowPayslipModal(false);
      loadPayslips();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save payslip');
    }
  };

  const handleDeletePayslip = async (id: number) => {
    try {
      await api.delete(`/erp/payroll/payslips/${id}`);
      loadPayslips();
      setDeleteConfirm({ show: false, type: 'payslip', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete payslip');
    }
  };

  const handleApprovePayslip = async (payslipId: number) => {
    try {
      await api.post(`/erp/payroll/payslips/${payslipId}/approve`);
      loadPayslips();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to approve payslip');
    }
  };

  const handlePayPayslip = async (payslipId: number) => {
    try {
      await api.post(`/erp/payroll/payslips/${payslipId}/pay`);
      loadPayslips();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to mark payslip as paid');
    }
  };

  const loadTaxSummary = async () => {
    setTaxSummaryLoading(true);
    setError('');
    try {
      const response = await api.get('/erp/payroll/tax-summary');
      setTaxSummary(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load tax summary');
    } finally {
      setTaxSummaryLoading(false);
    }
  };

  const filteredEmployees = employees.filter(e =>
    `${e.first_name} ${e.last_name}`.toLowerCase().includes(employeesSearch.toLowerCase()) ||
    e.employee_number.toLowerCase().includes(employeesSearch.toLowerCase())
  );

  const filteredPayslips = payslips.filter(p =>
    p.payslip_number.toLowerCase().includes(payslipsSearch.toLowerCase()) ||
    p.employee_name?.toLowerCase().includes(payslipsSearch.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151' },
      APPROVED: { bg: '#dbeafe', text: '#1e40af' },
      PAID: { bg: '#dcfce7', text: '#166534' }
    };
    const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{status}</span>;
  };

  const getEmploymentTypeBadge = (type: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      PERMANENT: { bg: '#dcfce7', text: '#166534' },
      CONTRACT: { bg: '#dbeafe', text: '#1e40af' },
      TEMPORARY: { bg: '#fef3c7', text: '#92400e' }
    };
    const color = colors[type] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{type}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Payroll</h1>
        <p style={{ color: '#6b7280' }}>Manage employees, payslips, and SA tax compliance (PAYE, UIF, SDL)</p>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => setActiveTab('employees')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'employees' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'employees' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Employees ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('payslips')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'payslips' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'payslips' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Payslips ({payslips.length})
          </button>
          <button
            onClick={() => setActiveTab('tax_summary')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'tax_summary' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'tax_summary' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Tax Summary (PAYE/UIF/SDL)
          </button>
        </div>
      </div>

      {/* EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <div>
          {/* Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search employees..."
              value={employeesSearch}
              onChange={(e) => setEmployeesSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '300px' }}
            />
            <button
              onClick={handleCreateEmployee}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              + New Employee
            </button>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Employees</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{employees.filter(e => e.is_active).length}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Permanent</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                {employees.filter(e => e.is_active && e.employment_type === 'PERMANENT').length}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Contract</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
                {employees.filter(e => e.is_active && e.employment_type === 'CONTRACT').length}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Payroll</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                {formatCurrency(employees.filter(e => e.is_active).reduce((sum, e) => sum + e.salary, 0))}
              </div>
            </div>
          </div>

          {/* Employees Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Employee #</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Department</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Position</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Salary</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employeesLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading employees...</td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No employees found</td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{employee.employee_number}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{employee.first_name} {employee.last_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{employee.department}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{employee.position}</td>
                      <td style={{ padding: '12px 16px' }}>{getEmploymentTypeBadge(employee.employment_type)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>{formatCurrency(employee.salary)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditEmployee(employee)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'employee', id: employee.id, name: `${employee.first_name} ${employee.last_name}` })} style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYSLIPS TAB */}
      {activeTab === 'payslips' && (
        <div>
          {/* Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search payslips..."
              value={payslipsSearch}
              onChange={(e) => setPayslipsSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '300px' }}
            />
            <button
              onClick={handleCreatePayslip}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              + New Payslip
            </button>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Payslips</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{payslips.length}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Draft</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>
                {payslips.filter(p => p.status === 'DRAFT').length}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Paid</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                {payslips.filter(p => p.status === 'PAID').length}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Net Pay</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                {formatCurrency(payslips.reduce((sum, p) => sum + p.net_salary, 0))}
              </div>
            </div>
          </div>

          {/* Payslips Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Payslip #</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Employee</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Period</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Gross</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>PAYE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>UIF</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Net</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payslipsLoading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading payslips...</td>
                  </tr>
                ) : filteredPayslips.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No payslips found</td>
                  </tr>
                ) : (
                  filteredPayslips.map((payslip) => (
                    <tr key={payslip.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{payslip.payslip_number}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{payslip.employee_name || `Employee #${payslip.employee_id}`}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDate(payslip.pay_period_start)} - {formatDate(payslip.pay_period_end)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatCurrency(payslip.gross_salary)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatCurrency(payslip.paye)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatCurrency(payslip.uif)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>{formatCurrency(payslip.net_salary)}</td>
                      <td style={{ padding: '12px 16px' }}>{getStatusBadge(payslip.status)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => handleEditPayslip(payslip)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                          {payslip.status === 'DRAFT' && (
                            <button onClick={() => handleApprovePayslip(payslip.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}>Approve</button>
                          )}
                          {payslip.status === 'APPROVED' && (
                            <button onClick={() => handlePayPayslip(payslip.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}>Pay</button>
                          )}
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'payslip', id: payslip.id, name: payslip.payslip_number })} style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAX SUMMARY TAB */}
      {activeTab === 'tax_summary' && (
        <div>
          {taxSummaryLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading tax summary...</div>
          ) : taxSummary ? (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>SA Tax Compliance Summary</h2>
                <p style={{ color: '#6b7280' }}>Period: {taxSummary.period}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total PAYE (Pay As You Earn)</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc2626' }}>{formatCurrency(taxSummary.total_paye)}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Income tax withheld from employees</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total UIF (Unemployment Insurance Fund)</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(taxSummary.total_uif)}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>1% of gross salary (max R17,712/month)</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total SDL (Skills Development Levy)</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#059669' }}>{formatCurrency(taxSummary.total_sdl)}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>1% of total payroll</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>Total Tax Liability</h3>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#111827' }}>
                  {formatCurrency(taxSummary.total_paye + taxSummary.total_uif + taxSummary.total_sdl)}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                  Amount to be paid to SARS via EMP201 submission
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No tax summary available</div>
          )}
        </div>
      )}

      {/* EMPLOYEE MODAL */}
      {showEmployeeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingEmployee ? 'Edit Employee' : 'New Employee'}</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>First Name *</label>
                  <input
                    type="text"
                    value={employeeForm.first_name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, first_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Last Name *</label>
                  <input
                    type="text"
                    value={employeeForm.last_name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, last_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Email *</label>
                  <input
                    type="email"
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Phone *</label>
                  <input
                    type="text"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Department *</label>
                  <input
                    type="text"
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Position *</label>
                  <input
                    type="text"
                    value={employeeForm.position}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Employment Type *</label>
                  <select
                    value={employeeForm.employment_type}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employment_type: e.target.value as 'PERMANENT' | 'CONTRACT' | 'TEMPORARY' })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="PERMANENT">Permanent</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="TEMPORARY">Temporary</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Monthly Salary (ZAR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={employeeForm.salary}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={employeeForm.is_active}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, is_active: e.target.checked })}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Active</span>
                </label>
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
              <button
                onClick={() => setShowEmployeeModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEmployee}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                {editingEmployee ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYSLIP MODAL */}
      {showPayslipModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingPayslip ? 'Edit Payslip' : 'New Payslip'}</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Employee ID *</label>
                <input
                  type="number"
                  value={payslipForm.employee_id}
                  onChange={(e) => setPayslipForm({ ...payslipForm, employee_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Pay Period Start *</label>
                  <input
                    type="date"
                    value={payslipForm.pay_period_start}
                    onChange={(e) => setPayslipForm({ ...payslipForm, pay_period_start: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Pay Period End *</label>
                  <input
                    type="date"
                    value={payslipForm.pay_period_end}
                    onChange={(e) => setPayslipForm({ ...payslipForm, pay_period_end: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Gross Salary (ZAR) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={payslipForm.gross_salary}
                  onChange={(e) => setPayslipForm({ ...payslipForm, gross_salary: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>PAYE (ZAR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payslipForm.paye}
                    onChange={(e) => setPayslipForm({ ...payslipForm, paye: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>UIF (ZAR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payslipForm.uif}
                    onChange={(e) => setPayslipForm({ ...payslipForm, uif: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>SDL (ZAR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payslipForm.sdl}
                    onChange={(e) => setPayslipForm({ ...payslipForm, sdl: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Other Deductions (ZAR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payslipForm.other_deductions}
                  onChange={(e) => setPayslipForm({ ...payslipForm, other_deductions: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
              <button
                onClick={() => setShowPayslipModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePayslip}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                {editingPayslip ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title={`Delete ${deleteConfirm.type}`}
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteConfirm.type === 'employee') handleDeleteEmployee(deleteConfirm.id);
          else if (deleteConfirm.type === 'payslip') handleDeletePayslip(deleteConfirm.id);
        }}
        onCancel={() => setDeleteConfirm({ show: false, type: 'employee', id: 0, name: '' })}
      />
    </div>
  );
};

export default PayrollDashboard;
