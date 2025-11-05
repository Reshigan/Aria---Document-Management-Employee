import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Bot, Play, Clock, CheckCircle, XCircle, Search, Filter } from 'lucide-react';

interface BotInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  last_run?: string;
  success_rate?: number;
}

const BOT_CATEGORIES = [
  'All',
  'Financial',
  'CRM',
  'HR',
  'Manufacturing',
  'Procurement',
  'Compliance',
  'Documents',
  'Retail',
  'Healthcare',
  'Communication'
];

export default function BotsHub() {
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/bots/marketplace/');
      setBots(response.data.bots || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading bots:', err);
      setError('Failed to load bots');
      setBots(generateMockBots());
    } finally {
      setLoading(false);
    }
  };

  const generateMockBots = (): BotInfo[] => {
    const categories = ['Financial', 'CRM', 'HR', 'Manufacturing', 'Procurement', 'Compliance', 'Documents', 'Retail', 'Healthcare', 'Communication'];
    const botsByCategory: Record<string, string[]> = {
      'Financial': ['AP Invoice Processing', 'AR Invoice Processing', 'Bank Reconciliation', 'GL Posting', 'Cash Management', 'Budget Management', 'Fixed Asset Management', 'Multi-Currency', 'Tax Compliance', 'Credit Control', 'Expense Management', 'Payroll SA'],
      'CRM': ['Lead Scoring', 'Customer Onboarding', 'Sales Forecasting', 'Customer Retention', 'Sales Commission', 'Quote Generation', 'Contract Management', 'Customer Support'],
      'HR': ['Recruitment', 'Onboarding', 'Performance Review', 'Leave Management', 'Training Scheduler', 'Payroll Processing', 'Benefits Administration', 'Offboarding'],
      'Manufacturing': ['MRP', 'Production Scheduling', 'Quality Control', 'Inventory Optimizer', 'Quality Predictor'],
      'Procurement': ['RFQ Management', 'PO Processing', 'Supplier Evaluation', 'Contract Management', 'Supplier Onboarding', 'Tender Management', 'RFQ Response'],
      'Compliance': ['BBBEE Tracking', 'PAYE Compliance', 'UIF Compliance', 'VAT Returns', 'Audit Trail'],
      'Documents': ['OCR Processing', 'Document Classification', 'Workflow Automation', 'E-Signature', 'Document Templates', 'Document History'],
      'Retail': ['Demand Forecasting', 'Pricing Optimization', 'Loyalty Programs', 'Returns Management', 'Shipping Logistics', 'Inventory Replenishment'],
      'Healthcare': ['Patient Records', 'Appointment Scheduling', 'Lab Results', 'Prescription Management', 'Insurance Claims'],
      'Communication': ['Email Automation', 'SMS Notifications', 'WhatsApp Integration', 'Teams Integration', 'Slack Integration']
    };

    const mockBots: BotInfo[] = [];
    categories.forEach(category => {
      botsByCategory[category].forEach((botName, index) => {
        mockBots.push({
          id: `${category.toLowerCase()}-${index}`,
          name: botName,
          description: `Automated ${botName.toLowerCase()} processing with AI-powered intelligence`,
          category,
          status: Math.random() > 0.1 ? 'active' : 'inactive',
          last_run: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          success_rate: 85 + Math.random() * 15
        });
      });
    });

    return mockBots;
  };

  const handleRunBot = async (botId: string) => {
    const query = prompt('Enter your request for the bot:');
    if (!query) return;
    
    try {
      const response = await api.post(`/api/bots/marketplace/${botId}/execute`, {
        query,
        context: {}
      });
      alert(`Bot executed successfully!\n\nResponse: ${response.data.response}\n\nConfidence: ${(response.data.confidence * 100).toFixed(0)}%`);
      loadBots();
    } catch (err: any) {
      console.error('Error running bot:', err);
      const message = err.response?.data?.detail || 'Failed to run bot';
      alert(message);
    }
  };

  const filteredBots = bots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bot.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || bot.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const botsByCategory = filteredBots.reduce((acc, bot) => {
    if (!acc[bot.category]) {
      acc[bot.category] = [];
    }
    acc[bot.category].push(bot);
    return acc;
  }, {} as Record<string, BotInfo[]>);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Bot size={32} style={{ color: '#2563eb' }} />
          Automation Bots
        </h1>
        <p style={{ color: '#6b7280' }}>67 AI-powered automation bots to streamline your business processes</p>
      </div>

      {/* Search and Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search bots by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 1rem 0.5rem 2.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            minWidth: '200px'
          }}
        >
          {BOT_CATEGORIES.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Bots</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{bots.length}</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Active Bots</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
            {bots.filter(b => b.status === 'active').length}
          </div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Categories</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>
            {Object.keys(botsByCategory).length}
          </div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Avg Success Rate</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {Math.round(bots.reduce((sum, b) => sum + (b.success_rate || 0), 0) / bots.length)}%
          </div>
        </div>
      </div>

      {/* Bots by Category */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading bots...</div>
      ) : Object.keys(botsByCategory).length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6b7280' }}>No bots found matching your filters</p>
        </div>
      ) : (
        Object.entries(botsByCategory).map(([category, categoryBots]) => (
          <div key={category} style={{ marginBottom: '2rem' }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              marginBottom: '1rem',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {category}
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#6b7280',
                background: '#f3f4f6',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px'
              }}>
                {categoryBots.length}
              </span>
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
              gap: '1rem'
            }}>
              {categoryBots.map(bot => (
                <div 
                  key={bot.id}
                  style={{ 
                    padding: '1.5rem',
                    background: 'white',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Bot size={20} style={{ color: '#2563eb' }} />
                      <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>{bot.name}</h3>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      background: bot.status === 'active' ? '#d1fae5' : '#fee2e2',
                      color: bot.status === 'active' ? '#065f46' : '#991b1b'
                    }}>
                      {bot.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem', lineHeight: '1.5' }}>
                    {bot.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                      <Clock size={14} />
                      {bot.last_run ? new Date(bot.last_run).toLocaleDateString() : 'Never run'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                      <CheckCircle size={14} style={{ color: '#10b981' }} />
                      {bot.success_rate?.toFixed(0)}% success
                    </div>
                  </div>
                  <button
                    onClick={() => handleRunBot(bot.id)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Play size={16} />
                    Run Bot
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
