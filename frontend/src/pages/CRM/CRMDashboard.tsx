import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Users, Target, Building2, Plus, Search, Edit2, Trash2, ArrowRight, TrendingUp, DollarSign, Star } from 'lucide-react';

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
      const response = await api.get('/crm/leads');
      const d = response.data;
      setLeads(Array.isArray(d) ? d : d.leads || d.data || []);
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
        await api.put(`/crm/leads/${editingLead.id}`, leadForm);
      } else {
        await api.post('/crm/leads', leadForm);
      }
      setShowLeadModal(false);
      loadLeads();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save lead');
    }
  };

  const handleDeleteLead = async (id: number) => {
    try {
      await api.delete(`/crm/leads/${id}`);
      loadLeads();
      setDeleteConfirm({ show: false, type: 'lead', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete lead');
    }
  };

  const handleConvertLead = async (leadId: number) => {
    try {
      await api.post(`/crm/leads/${leadId}/convert`);
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
      const response = await api.get('/crm/opportunities');
      const d = response.data;
      setOpportunities(Array.isArray(d) ? d : d.opportunities || d.data || []);
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
        await api.put(`/crm/opportunities/${editingOpp.id}`, payload);
      } else {
        await api.post('/crm/opportunities', payload);
      }
      setShowOppModal(false);
      loadOpportunities();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save opportunity');
    }
  };

  const handleDeleteOpportunity = async (id: number) => {
    try {
      await api.delete(`/crm/opportunities/${id}`);
      loadOpportunities();
      setDeleteConfirm({ show: false, type: 'opportunity', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete opportunity');
    }
  };

  const handleWinOpportunity = async (oppId: number) => {
    try {
      await api.post(`/crm/opportunities/${oppId}/win`);
      loadOpportunities();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to mark opportunity as won');
    }
  };

  const loadCustomers = async () => {
    setCustomersLoading(true);
    setError('');
    try {
      const response = await api.get('/crm/customers');
      const d = response.data;
      setCustomers(Array.isArray(d) ? d : d.customers || d.data || []);
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
        await api.put(`/crm/customers/${editingCustomer.id}`, payload);
      } else {
        await api.post('/crm/customers', payload);
      }
      setShowCustomerModal(false);
      loadCustomers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save customer');
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    try {
      await api.delete(`/crm/customers/${id}`);
      loadCustomers();
      setDeleteConfirm({ show: false, type: 'customer', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete customer');
    }
  };

  const filteredLeads = leads.filter(l =>
    (l.company_name || '').toLowerCase().includes(leadsSearch.toLowerCase()) ||
    (l.contact_person || '').toLowerCase().includes(leadsSearch.toLowerCase()) ||
    (l.email || '').toLowerCase().includes(leadsSearch.toLowerCase())
  );

  const filteredOpportunities = opportunities.filter(o =>
    (o.title || '').toLowerCase().includes(oppsSearch.toLowerCase()) ||
    (o.customer_name || '').toLowerCase().includes(oppsSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter(c =>
    (c.customer_name || '').toLowerCase().includes(customersSearch.toLowerCase()) ||
    (c.customer_code || '').toLowerCase().includes(customersSearch.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(customersSearch.toLowerCase())
  );

  const getLeadScoreBadge = (score: number) => {
    if (score >= 80) return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1"><Star className="h-3 w-3" />{score}</span>;
    if (score >= 60) return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1"><Star className="h-3 w-3" />{score}</span>;
    if (score >= 40) return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1"><Star className="h-3 w-3" />{score}</span>;
    return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1"><Star className="h-3 w-3" />{score}</span>;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      CONTACTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      QUALIFIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      CONVERTED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      LOST: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      WON: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      PROSPECTING: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      QUALIFICATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      PROPOSAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      NEGOTIATION: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      CLOSED_WON: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      CLOSED_LOST: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>{(status || '').replace('_', ' ')}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount ?? 0));
  };

  const formatDate = (dateString: string) => { if (!dateString) return "-"; const _d = new Date(dateString); return isNaN(_d.getTime()) ? dateString : _d.toLocaleDateString("en-ZA"); };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl ">
            <Users className="h-7 w-7 text-white" />
          </div>
          CRM
        </h1>
        <p className="text-gray-500 dark:text-gray-300 ml-14">Manage leads, opportunities, and customer relationships</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'leads' ? 'bg-white dark:bg-gray-800 text-rose-600 dark:text-rose-400 border-b-2 border-rose-500' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <span className="flex items-center gap-2"><Target className="h-4 w-4" />Leads ({leads.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'opportunities' ? 'bg-white dark:bg-gray-800 text-rose-600 dark:text-rose-400 border-b-2 border-rose-500' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Opportunities ({opportunities.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'customers' ? 'bg-white dark:bg-gray-800 text-rose-600 dark:text-rose-400 border-b-2 border-rose-500' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <span className="flex items-center gap-2"><Building2 className="h-4 w-4" />Customers ({customers.length})</span>
          </button>
        </div>
      </div>

      {/* LEADS TAB */}
      {activeTab === 'leads' && (
        <div>
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
              <input
                type="text"
                placeholder="Search leads..."
                value={leadsSearch}
                onChange={(e) => setLeadsSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={handleCreateLead}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-rose-500/40 transition-all"
            >
              <Plus className="h-5 w-5" />
              New Lead
            </button>
          </div>

          {/* Leads Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {leadsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">Loading leads...</td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">No leads found</td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{lead.company_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{lead.contact_person}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{lead.email}</td>
                      <td className="px-6 py-4">{getLeadScoreBadge(lead.lead_score)}</td>
                      <td className="px-6 py-4">{getStatusBadge(lead.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEditLead(lead)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit2 className="h-4 w-4" /></button>
                          {lead.status === 'QUALIFIED' && (
                            <button onClick={() => handleConvertLead(lead.id)} className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"><ArrowRight className="h-4 w-4" /></button>
                          )}
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'lead', id: lead.id, name: lead.company_name })} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
              <input
                type="text"
                placeholder="Search opportunities..."
                value={oppsSearch}
                onChange={(e) => setOppsSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={handleCreateOpportunity}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-rose-500/40 transition-all"
            >
              <Plus className="h-5 w-5" />
              New Opportunity
            </button>
          </div>

          {/* Pipeline Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl ">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(opportunities.reduce((sum, o) => sum + Number(o.amount ?? 0), 0))}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Total Pipeline</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl ">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(opportunities.reduce((sum, o) => sum + (Number(o.amount ?? 0) * Number(o.probability ?? 0) / 100), 0))}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Weighted Value</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl ">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{opportunities.filter(o => o.status === 'OPEN').length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Open Opportunities</p>
                </div>
              </div>
            </div>
          </div>

          {/* Opportunities Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stage</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Probability</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Close Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {oppsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">Loading opportunities...</td>
                  </tr>
                ) : filteredOpportunities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">No opportunities found</td>
                  </tr>
                ) : (
                  filteredOpportunities.map((opp) => (
                    <tr key={opp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{opp.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{opp.customer_name || `Customer #${opp.customer_id}`}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(opp.amount)}</td>
                      <td className="px-6 py-4">{getStatusBadge(opp.stage)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{opp.probability}%</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(opp.expected_close_date)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEditOpportunity(opp)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit2 className="h-4 w-4" /></button>
                          {opp.status === 'OPEN' && opp.stage === 'NEGOTIATION' && (
                            <button onClick={() => handleWinOpportunity(opp.id)} className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"><ArrowRight className="h-4 w-4" /></button>
                          )}
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'opportunity', id: opp.id, name: opp.title })} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
              <input
                type="text"
                placeholder="Search customers..."
                value={customersSearch}
                onChange={(e) => setCustomersSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={handleCreateCustomer}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-rose-500/40 transition-all"
            >
              <Plus className="h-5 w-5" />
              New Customer
            </button>
          </div>

          {/* Customers Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">BBBEE</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Credit Limit</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {customersLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">Loading customers...</td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">No customers found</td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-rose-600 dark:text-rose-400">{customer.customer_code}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{customer.customer_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{customer.contact_person}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{customer.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">Level {customer.bbbee_level || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(customer.credit_limit)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEditCustomer(customer)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'customer', id: customer.id, name: customer.customer_name })} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-auto shadow-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-gradient-to-r from-rose-500 to-pink-500 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Target className="h-6 w-6" />
                {editingLead ? 'Edit Lead' : 'New Lead'}
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Company Name *</label>
                <input
                  type="text"
                  value={leadForm.company_name}
                  onChange={(e) => setLeadForm({ ...leadForm, company_name: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Contact Person *</label>
                <input
                  type="text"
                  value={leadForm.contact_person}
                  onChange={(e) => setLeadForm({ ...leadForm, contact_person: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                  <input
                    type="text"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Company Size</label>
                  <select
                    value={leadForm.company_size}
                    onChange={(e) => setLeadForm({ ...leadForm, company_size: e.target.value as any })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Engagement Level</label>
                  <select
                    value={leadForm.engagement_level}
                    onChange={(e) => setLeadForm({ ...leadForm, engagement_level: e.target.value as any })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Cold">Cold</option>
                    <option value="Warm">Warm</option>
                    <option value="Hot">Hot</option>
                    <option value="Active">Active</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Budget Range</label>
                  <select
                    value={leadForm.budget_range}
                    onChange={(e) => setLeadForm({ ...leadForm, budget_range: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="<100k">&lt;100k</option>
                    <option value="100k-500k">100k-500k</option>
                    <option value="500k-1M">500k-1M</option>
                    <option value=">1M">&gt;1M</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Decision Timeframe</label>
                  <select
                    value={leadForm.decision_timeframe}
                    onChange={(e) => setLeadForm({ ...leadForm, decision_timeframe: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value=">6 months">&gt;6 months</option>
                    <option value="3-6 months">3-6 months</option>
                    <option value="1-3 months">1-3 months</option>
                    <option value="<1 month">&lt;1 month</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800 rounded-b-2xl">
              <button
                onClick={() => setShowLeadModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLead}
                className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-rose-500/40 transition-all"
              >
                {editingLead ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPPORTUNITY MODAL */}
      {showOppModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-auto shadow-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-gradient-to-r from-rose-500 to-pink-500 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <DollarSign className="h-6 w-6" />
                {editingOpp ? 'Edit Opportunity' : 'New Opportunity'}
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={oppForm.title}
                  onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Customer ID *</label>
                  <input
                    type="number"
                    value={oppForm.customer_id}
                    onChange={(e) => setOppForm({ ...oppForm, customer_id: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Amount (ZAR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={oppForm.amount}
                    onChange={(e) => setOppForm({ ...oppForm, amount: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Stage</label>
                  <select
                    value={oppForm.stage}
                    onChange={(e) => setOppForm({ ...oppForm, stage: e.target.value as any })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={oppForm.probability}
                    onChange={(e) => setOppForm({ ...oppForm, probability: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Expected Close Date *</label>
                <input
                  type="date"
                  value={oppForm.expected_close_date}
                  onChange={(e) => setOppForm({ ...oppForm, expected_close_date: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800 rounded-b-2xl">
              <button
                onClick={() => setShowOppModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOpportunity}
                className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-rose-500/40 transition-all"
              >
                {editingOpp ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-auto shadow-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-gradient-to-r from-rose-500 to-pink-500 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Building2 className="h-6 w-6" />
                {editingCustomer ? 'Edit Customer' : 'New Customer'}
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Customer Name *</label>
                <input
                  type="text"
                  value={customerForm.customer_name}
                  onChange={(e) => setCustomerForm({ ...customerForm, customer_name: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Contact Person *</label>
                <input
                  type="text"
                  value={customerForm.contact_person}
                  onChange={(e) => setCustomerForm({ ...customerForm, contact_person: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                  <input
                    type="text"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">BBBEE Level</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={customerForm.bbbee_level}
                    onChange={(e) => setCustomerForm({ ...customerForm, bbbee_level: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Credit Limit (ZAR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customerForm.credit_limit}
                    onChange={(e) => setCustomerForm({ ...customerForm, credit_limit: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customerForm.is_active}
                    onChange={(e) => setCustomerForm({ ...customerForm, is_active: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-rose-500 focus:ring-rose-500"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800 rounded-b-2xl">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomer}
                className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-rose-500/40 transition-all"
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
        onClose={() => setDeleteConfirm({ show: false, type: 'lead', id: 0, name: '' })}
      />
    </div>
  );
};

export default CRMDashboard;
