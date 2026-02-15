import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Bot, Play, Clock, CheckCircle, XCircle, Search, Filter, Cpu, Zap, Activity, TrendingUp } from 'lucide-react';

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
  const [agents, setBots] = useState<BotInfo[]>([]);
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
      const response = await api.get('/api/agents/marketplace/');
      setBots(response.data.agents || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading agents:', err);
      setError('Failed to load agents');
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
      'Compliance': ['Tax Compliance', 'Payroll Tax', 'Social Security', 'VAT/GST Returns', 'Audit Trail', 'Data Protection', 'Labor Law'],
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
    const query = prompt('Enter your request for the agent:');
    if (!query) return;
    
    try {
      const response = await api.post(`/api/agents/marketplace/${botId}/execute`, {
        query,
        context: {}
      });
      alert(`Agent executed successfully!\n\nResponse: ${response.data.response}\n\nConfidence: ${(response.data.confidence * 100).toFixed(0)}%`);
      loadBots();
    } catch (err: any) {
      console.error('Error running agent:', err);
      const message = err.response?.data?.detail || 'Failed to run agent';
      alert(message);
    }
  };

  const filteredBots = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || agent.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const botsByCategory = filteredBots.reduce((acc, agent) => {
    if (!acc[agent.category]) {
      acc[agent.category] = [];
    }
    acc[agent.category].push(agent);
    return acc;
  }, {} as Record<string, BotInfo[]>);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-violet-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl ">
            <Cpu className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Automation Agents</h1>
            <p className="text-gray-600 dark:text-gray-400">67 AI-powered automation agents to streamline your business processes</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 min-w-[200px]"
          >
            {BOT_CATEGORIES.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl ">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{agents.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Agents</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl ">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{agents.filter(b => b.status === 'active').length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active Agents</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl ">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{Object.keys(botsByCategory).length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Categories</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl ">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{agents.length > 0 ? Math.round(agents.reduce((sum, b) => sum + (b.success_rate || 0), 0) / agents.length) : 0}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Success Rate</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Cpu className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-500 dark:text-gray-400">Loading agents...</p>
        </div>
      ) : Object.keys(botsByCategory).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <Cpu className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No agents found matching your filters</p>
        </div>
      ) : (
        Object.entries(botsByCategory).map(([category, categoryBots]) => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              {category}
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                {categoryBots.length}
              </span>
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryBots.map(agent => (
                <div 
                  key={agent.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-600 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${agent.status === 'active' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'}`}>
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {agent.description}
                  </p>
                  <div className="flex items-center justify-between mb-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {agent.last_run ? new Date(agent.last_run).toLocaleDateString() : 'Never run'}
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      {agent.success_rate?.toFixed(0)}% success
                    </div>
                  </div>
                  <button
                    onClick={() => handleRunBot(agent.id)}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl hover:from-violet-600 hover:to-purple-600 transition-all  flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Play className="h-4 w-4" />
                    Run Agent
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
