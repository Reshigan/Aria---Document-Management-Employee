import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface Lead {
  id: number;
  lead_code: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  company_size: 'Small' | 'Medium' | 'Large' | 'Enterprise';
  engagement_level: 'Cold' | 'Warm' | 'Hot' | 'Active';
  budget_range: string;
  decision_timeframe: string;
  lead_score: number;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
  created_at: string;
}

interface Opportunity {
  id: number;
  opportunity_code: string;
  title: string;
  customer_id: number;
  customer_name?: string;
  amount: number;
  stage: 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  probability: number;
  expected_close_date: string;
  owner_name?: string;
  status: 'OPEN' | 'WON' | 'LOST';
  created_at: string;
}

interface Customer {
  id: number;
  customer_code: string;
  customer_name: string;
  contact_person: string;
  email: string;
  phone: string;
  bbbee_level: number | null;
  credit_limit: number;
  is_active: boolean;
}

const CRMDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'opportunities' | 'customers'>('leads');
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsSearch, setLeadsSearch] = useState('');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    company_size: 'Small' as const,
    engagement_level: 'Cold' as const,
    budget_range: '<100k',
    decision_timeframe: '>6 months'
  });
  
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [oppsLoading, setOppsLoading] = useState(false);
  const [oppsSearch, setOppsSearch] = useState('');
  const [showOppModal, setShowOppModal] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [oppForm, setOppForm] = useState({
    title: '',
    customer_id: '',
    amount: '',
    stage: 'PROSPECTING' as const,
    probability: '10',
    expected_close_date: ''
  });
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersSearch, setCustomersSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({
    customer_name: '',
    contact_person: '',
    email: '',
    phone: '',
    bbbee_level: '',
    credit_limit: '',
    is_active: true
  });
  
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'lead' | 'opportunity' | 'customer';
    id: number;
    name: string;
  }>({ show: false, type: 'lead', id: 0, name: '' });
  
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'leads') loadLeads();
    else if (activeTab === 'opportunities') loadOpportunities();
    else if (activeTab === 'customers') loadCustomers();
  }, [activeTab]);

  const loadLeads = async () => {
    setLeadsLoading(true);
    setError('');
    try {
      const response = await api.get('/erp/crm/leads');
      setLeads(response.data.leads || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load leads');
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleCreateLead = () => {
    setEditingLead(null);
    setLeadForm({
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      company_size: 'Small',
      engagement_level: 'Cold',
      budget_range: '<100k',
      decision_timeframe: '>6 months'
    });
    setShowLeadModal(true);
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm({
      company_name: lead.company_name,
      contact_person: lead.contact_person,
      email: lead.email,
      phone: lead.phone,
      company_size: lead.company_size,
      engagement_level: lead.engagement_level,
      budget_range: lead.budget_range,
      decision_timeframe: lead.decision_timeframe
    });
    setShowLeadModal(true);
  };

  const handleSaveLead = async () => {
    setError('');
    try {
      if (editingLead) {
        await api.put(`/erp/crm/leads/${editingLead.id}`, leadForm);
      } else {
        await api.post('/erp/crm/leads', leadForm);
      }
      setShowLeadModal(false);
      loadLeads();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save lead');
    }
  };

  const handleDeleteLead = async (id: number) => {
    try {
      await api.delete(`/erp/crm/leads/${id}`);
      loadLeads();
      setDeleteConfirm({ show: false, type: 'lead', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete lead');
    }
  };

  const handleConvertLead = async (leadId: number) => {
    try {
      await api.post(`/erp/crm/leads/${leadId}/convert`);
      loadLeads();
      loadOpportunities();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to convert lead');
    }
  };

  const loadOpportunities = async () => {
    setOppsLoading(true);
    setError('');
    try {
      const response = await api.get('/erp/crm/opportunities');
      setOpportunities(response.data.opportunities || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load opportunities');
    } finally {
      setOppsLoading(false);
    }
  };

  const handleCreateOpportunity = () => {
    setEditingOpp(null);
    setOppForm({
      title: '',
      customer_id: '',
      amount: '',
      stage: 'PROSPECTING',
      probability: '10',
      expected_close_date: ''
    });
    setShowOppModal(true);
  };

  const handleEditOpportunity = (opp: Opportunity) => {
    setEditingOpp(opp);
    setOppForm({
      title: opp.title,
      customer_id: opp.customer_id.toString(),
      amount: opp.amount.toString(),
      stage: opp.stage,
      probability: opp.probability.toString(),
      expected_close_date: opp.expected_close_date
    });
    setShowOppModal(true);
  };

  const handleSaveOpportunity = async () => {
    setError('');
    try {
      const payload = {
        ...oppForm,
        customer_id: parseInt(oppForm.customer_id),
        amount: parseFloat(oppForm.amount),
        probability: parseInt(oppForm.probability)
      };
      
      if (editingOpp) {
        await api.put(`/erp/crm/opportunities/${editingOpp.id}`, payload);
      } else {
        await api.post('/erp/crm/opportunities', payload);
      }
      setShowOppModal(false);
      loadOpportunities();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save opportunity');
    }
  };

  const handleDeleteOpportunity = async (id: number) => {
    try {
      await api.delete(`/erp/crm/opportunities/${id}`);
      loadOpportunities();
      setDeleteConfirm({ show: false, type: 'opportunity', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete opportunity');
    }
  };

  const handleWinOpportunity = async (oppId: number) => {
    try {
      await api.post(`/erp/crm/opportunities/${oppId}/win`);
      loadOpportunities();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to mark opportunity as won');
    }
  };

  const loadCustomers = async () => {
    setCustomersLoading(true);
    setError('');
    try {
      const response = await api.get('/erp/crm/customers');
      setCustomers(response.data.customers || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load customers');
    } finally {
      setCustomersLoading(false);
    }
  };

  const handleCreateCustomer = () => {
    setEditingCustomer(null);
    setCustomerForm({
      customer_name: '',
      contact_person: '',
      email: '',
      phone: '',
      bbbee_level: '',
      credit_limit: '',
      is_active: true
    });
    setShowCustomerModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      customer_name: customer.customer_name,
      contact_person: customer.contact_person,
      email: customer.email,
      phone: customer.phone,
      bbbee_level: customer.bbbee_level?.toString() || '',
      credit_limit: customer.credit_limit.toString(),
      is_active: customer.is_active
    });
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async () => {
    setError('');
    try {
      const payload = {
        ...customerForm,
        bbbee_level: customerForm.bbbee_level ? parseInt(customerForm.bbbee_level) : null,
        credit_limit: parseFloat(customerForm.credit_limit)
      };
      
      if (editingCustomer) {
        await api.put(`/erp/crm/customers/${editingCustomer.id}`, payload);
      } else {
        await api.post('/erp/crm/customers', payload);
      }
      setShowCustomerModal(false);
      loadCustomers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save customer');
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    try {
      await api.delete(`/erp/crm/customers/${id}`);
      loadCustomers();
      setDeleteConfirm({ show: false, type: 'customer', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete customer');
    }
  };

  const filteredLeads = leads.filter(l =>
    l.company_name.toLowerCase().includes(leadsSearch.toLowerCase()) ||
    l.contact_person.toLowerCase().includes(leadsSearch.toLowerCase()) ||
    l.email.toLowerCase().includes(leadsSearch.toLowerCase())
  );

  const filteredOpportunities = opportunities.filter(o =>
    o.title.toLowerCase().includes(oppsSearch.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(oppsSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter(c =>
    c.customer_name.toLowerCase().includes(customersSearch.toLowerCase()) ||
    c.customer_code.toLowerCase().includes(customersSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(customersSearch.toLowerCase())
  );

  const getLeadScoreBadge = (score: number) => {
    if (score >= 80) return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#166534' }}>★ {score}</span>;
    if (score >= 60) return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: '#dbeafe', color: '#1e40af' }}>★ {score}</span>;
    if (score >= 40) return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: '#fef3c7', color: '#92400e' }}>★ {score}</span>;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: '#fee2e2', color: '#991b1b' }}>★ {score}</span>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      NEW: { bg: '#dbeafe', text: '#1e40af' },
      CONTACTED: { bg: '#fef3c7', text: '#92400e' },
      QUALIFIED: { bg: '#dcfce7', text: '#166534' },
      CONVERTED: { bg: '#e0e7ff', text: '#4338ca' },
      LOST: { bg: '#fee2e2', text: '#991b1b' },
      OPEN: { bg: '#dbeafe', text: '#1e40af' },
      WON: { bg: '#dcfce7', text: '#166534' },
      PROSPECTING: { bg: '#f3f4f6', text: '#374151' },
      QUALIFICATION: { bg: '#dbeafe', text: '#1e40af' },
      PROPOSAL: { bg: '#fef3c7', text: '#92400e' },
      NEGOTIATION: { bg: '#fed7aa', text: '#9a3412' },
      CLOSED_WON: { bg: '#dcfce7', text: '#166534' },
      CLOSED_LOST: { bg: '#fee2e2', text: '#991b1b' }
    };
    const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{status.replace('_', ' ')}</span>;
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
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>CRM</h1>
        <p style={{ color: '#6b7280' }}>Manage leads, opportunities, and customer relationships</p>
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
            onClick={() => setActiveTab('leads')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'leads' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'leads' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Leads ({leads.length})
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'opportunities' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'opportunities' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Opportunities ({opportunities.length})
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'customers' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'customers' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Customers ({customers.length})
          </button>
        </div>
      </div>

      {/* LEADS TAB */}
      {activeTab === 'leads' && (
        <div>
          {/* Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search leads..."
              value={leadsSearch}
              onChange={(e) => setLeadsSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '300px' }}
            />
            <button
              onClick={handleCreateLead}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              + New Lead
            </button>
          </div>

          {/* Leads Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Company</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Contact</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Score</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leadsLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading leads...</td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No leads found</td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>{lead.company_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{lead.contact_person}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{lead.email}</td>
                      <td style={{ padding: '12px 16px' }}>{getLeadScoreBadge(lead.lead_score)}</td>
                      <td style={{ padding: '12px 16px' }}>{getStatusBadge(lead.status)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditLead(lead)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                          {lead.status === 'QUALIFIED' && (
                            <button onClick={() => handleConvertLead(lead.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}>Convert</button>
                          )}
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'lead', id: lead.id, name: lead.company_name })} style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
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

      {/* OPPORTUNITIES TAB */}
      {activeTab === 'opportunities' && (
        <div>
          {/* Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search opportunities..."
              value={oppsSearch}
              onChange={(e) => setOppsSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '300px' }}
            />
            <button
              onClick={handleCreateOpportunity}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              + New Opportunity
            </button>
          </div>

          {/* Pipeline Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Pipeline</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                {formatCurrency(opportunities.reduce((sum, o) => sum + o.amount, 0))}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Weighted Value</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
                {formatCurrency(opportunities.reduce((sum, o) => sum + (o.amount * o.probability / 100), 0))}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Open Opportunities</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                {opportunities.filter(o => o.status === 'OPEN').length}
              </div>
            </div>
          </div>

          {/* Opportunities Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Title</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Customer</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Stage</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Probability</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Close Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {oppsLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading opportunities...</td>
                  </tr>
                ) : filteredOpportunities.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No opportunities found</td>
                  </tr>
                ) : (
                  filteredOpportunities.map((opp) => (
                    <tr key={opp.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>{opp.title}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{opp.customer_name || `Customer #${opp.customer_id}`}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>{formatCurrency(opp.amount)}</td>
                      <td style={{ padding: '12px 16px' }}>{getStatusBadge(opp.stage)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{opp.probability}%</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDate(opp.expected_close_date)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditOpportunity(opp)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                          {opp.status === 'OPEN' && opp.stage === 'NEGOTIATION' && (
                            <button onClick={() => handleWinOpportunity(opp.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}>Win</button>
                          )}
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'opportunity', id: opp.id, name: opp.title })} style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
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

      {/* CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <div>
          {/* Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search customers..."
              value={customersSearch}
              onChange={(e) => setCustomersSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '300px' }}
            />
            <button
              onClick={handleCreateCustomer}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              + New Customer
            </button>
          </div>

          {/* Customers Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Code</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Contact</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>BBBEE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Credit Limit</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customersLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading customers...</td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No customers found</td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{customer.customer_code}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>{customer.customer_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{customer.contact_person}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{customer.email}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>Level {customer.bbbee_level || 'N/A'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>{formatCurrency(customer.credit_limit)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditCustomer(customer)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'customer', id: customer.id, name: customer.customer_name })} style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
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

      {/* LEAD MODAL */}
      {showLeadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingLead ? 'Edit Lead' : 'New Lead'}</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Company Name *</label>
                <input
                  type="text"
                  value={leadForm.company_name}
                  onChange={(e) => setLeadForm({ ...leadForm, company_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Contact Person *</label>
                <input
                  type="text"
                  value={leadForm.contact_person}
                  onChange={(e) => setLeadForm({ ...leadForm, contact_person: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Email *</label>
                <input
                  type="email"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Phone</label>
                <input
                  type="text"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Company Size</label>
                  <select
                    value={leadForm.company_size}
                    onChange={(e) => setLeadForm({ ...leadForm, company_size: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Engagement Level</label>
                  <select
                    value={leadForm.engagement_level}
                    onChange={(e) => setLeadForm({ ...leadForm, engagement_level: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="Cold">Cold</option>
                    <option value="Warm">Warm</option>
                    <option value="Hot">Hot</option>
                    <option value="Active">Active</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Budget Range</label>
                  <select
                    value={leadForm.budget_range}
                    onChange={(e) => setLeadForm({ ...leadForm, budget_range: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="<100k">&lt;100k</option>
                    <option value="100k-500k">100k-500k</option>
                    <option value="500k-1M">500k-1M</option>
                    <option value=">1M">&gt;1M</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Decision Timeframe</label>
                  <select
                    value={leadForm.decision_timeframe}
                    onChange={(e) => setLeadForm({ ...leadForm, decision_timeframe: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value=">6 months">&gt;6 months</option>
                    <option value="3-6 months">3-6 months</option>
                    <option value="1-3 months">1-3 months</option>
                    <option value="<1 month">&lt;1 month</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
              <button
                onClick={() => setShowLeadModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLead}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                {editingLead ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPPORTUNITY MODAL */}
      {showOppModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingOpp ? 'Edit Opportunity' : 'New Opportunity'}</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Title *</label>
                <input
                  type="text"
                  value={oppForm.title}
                  onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Customer ID *</label>
                <input
                  type="number"
                  value={oppForm.customer_id}
                  onChange={(e) => setOppForm({ ...oppForm, customer_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Amount (ZAR) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={oppForm.amount}
                  onChange={(e) => setOppForm({ ...oppForm, amount: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Stage</label>
                  <select
                    value={oppForm.stage}
                    onChange={(e) => setOppForm({ ...oppForm, stage: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="PROSPECTING">Prospecting</option>
                    <option value="QUALIFICATION">Qualification</option>
                    <option value="PROPOSAL">Proposal</option>
                    <option value="NEGOTIATION">Negotiation</option>
                    <option value="CLOSED_WON">Closed Won</option>
                    <option value="CLOSED_LOST">Closed Lost</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={oppForm.probability}
                    onChange={(e) => setOppForm({ ...oppForm, probability: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Expected Close Date *</label>
                <input
                  type="date"
                  value={oppForm.expected_close_date}
                  onChange={(e) => setOppForm({ ...oppForm, expected_close_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
              <button
                onClick={() => setShowOppModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOpportunity}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                {editingOpp ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER MODAL */}
      {showCustomerModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingCustomer ? 'Edit Customer' : 'New Customer'}</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Customer Name *</label>
                <input
                  type="text"
                  value={customerForm.customer_name}
                  onChange={(e) => setCustomerForm({ ...customerForm, customer_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Contact Person *</label>
                <input
                  type="text"
                  value={customerForm.contact_person}
                  onChange={(e) => setCustomerForm({ ...customerForm, contact_person: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Email *</label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Phone</label>
                <input
                  type="text"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>BBBEE Level</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={customerForm.bbbee_level}
                    onChange={(e) => setCustomerForm({ ...customerForm, bbbee_level: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Credit Limit (ZAR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customerForm.credit_limit}
                    onChange={(e) => setCustomerForm({ ...customerForm, credit_limit: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={customerForm.is_active}
                    onChange={(e) => setCustomerForm({ ...customerForm, is_active: e.target.checked })}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Active</span>
                </label>
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
              <button
                onClick={() => setShowCustomerModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomer}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                {editingCustomer ? 'Update' : 'Create'}
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
          if (deleteConfirm.type === 'lead') handleDeleteLead(deleteConfirm.id);
          else if (deleteConfirm.type === 'opportunity') handleDeleteOpportunity(deleteConfirm.id);
          else if (deleteConfirm.type === 'customer') handleDeleteCustomer(deleteConfirm.id);
        }}
        onCancel={() => setDeleteConfirm({ show: false, type: 'lead', id: 0, name: '' })}
      />
    </div>
  );
};

export default CRMDashboard;
