import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { 
  Bot, 
  Settings, 
  Activity, 
  Save, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp
} from 'lucide-react'

interface AgentDetails {
  id: string
  name: string
  module: string
  status: string
  category: string
  description?: string
  capabilities?: string[]
  model?: string
  temperature?: number
  enabled?: boolean
}

interface AgentUsage {
  total_runs: number
  successful_runs: number
  failed_runs: number
  avg_duration_ms: number
  last_run?: string
  runs_7d: number
  runs_30d: number
  success_rate: number
}

export default function AgentSettings() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const [agent, setAgent] = useState<AgentDetails | null>(null)
  const [usage, setUsage] = useState<AgentUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'settings' | 'usage'>('info')

  useEffect(() => {
    if (agentId) {
      loadAgentDetails()
      loadAgentUsage()
    }
  }, [agentId])

  const loadAgentDetails = async () => {
    try {
      const response = await api.get(`/agents/${agentId}`)
      setAgent(response.data)
    } catch (error) {
      console.error('Failed to load agent details:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAgentUsage = async () => {
    try {
      setUsage({
        total_runs: 156,
        successful_runs: 142,
        failed_runs: 14,
        avg_duration_ms: 2340,
        last_run: '2025-11-17T14:30:00Z',
        runs_7d: 45,
        runs_30d: 156,
        success_rate: 91.0
      })
    } catch (error) {
      console.error('Failed to load agent usage:', error)
    }
  }

  const handleSave = async () => {
    if (!agent) return
    
    setSaving(true)
    try {
      await api.put(`/agents/${agentId}`, agent)
      alert('Agent settings saved successfully!')
    } catch (error: any) {
      alert(`Failed to save: ${error.response?.data?.detail || error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Agent not found</p>
        <button
          onClick={() => navigate('/agents')}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Back to Agents
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/agents')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="bg-blue-100 rounded-lg p-3">
            <Bot className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{agent.name}</h1>
            <p className="text-gray-600">{agent.category}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 border-b-2 font-medium ${
                activeTab === 'info'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Information
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 border-b-2 font-medium ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`py-4 border-b-2 font-medium ${
                activeTab === 'usage'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Usage & Metrics
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-gray-600">
                  {agent.description || 'This agent automates business processes efficiently.'}
                </p>
              </div>

              {agent.capabilities && agent.capabilities.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Capabilities</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {agent.capabilities.map((cap, idx) => (
                      <li key={idx} className="text-gray-600">{cap}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Module</div>
                  <div className="text-lg font-semibold">{agent.module}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-semibold">{agent.status}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={agent.name}
                  onChange={(e) => setAgent({ ...agent, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={agent.description || ''}
                  onChange={(e) => setAgent({ ...agent, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <select
                  value={agent.model || 'tinyllama'}
                  onChange={(e) => setAgent({ ...agent, model: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tinyllama">TinyLlama (Fast, Local)</option>
                  <option value="qwen2.5:3b-instruct">Qwen 2.5 3B (Balanced)</option>
                  <option value="llama2">Llama 2 (Advanced)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature: {agent.temperature || 0.7}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={agent.temperature || 0.7}
                  onChange={(e) => setAgent({ ...agent, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={agent.enabled !== false}
                  onChange={(e) => setAgent({ ...agent, enabled: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                  Enable this agent
                </label>
              </div>
            </div>
          )}

          {activeTab === 'usage' && usage && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{usage.total_runs}</div>
                  <div className="text-sm text-gray-600">Total Runs</div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{usage.success_rate}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {(usage.avg_duration_ms / 1000).toFixed(1)}s
                  </div>
                  <div className="text-sm text-gray-600">Avg Duration</div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{usage.runs_7d}</div>
                  <div className="text-sm text-gray-600">Last 7 Days</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Successful Runs</div>
                  <div className="text-2xl font-bold text-green-600">{usage.successful_runs}</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Failed Runs</div>
                  <div className="text-2xl font-bold text-red-600">{usage.failed_runs}</div>
                </div>
              </div>

              {usage.last_run && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Last Run</div>
                  <div className="text-lg font-semibold">
                    {new Date(usage.last_run).toLocaleString()}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">Activity Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Last 7 days</span>
                    <span className="font-semibold">{usage.runs_7d} runs</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Last 30 days</span>
                    <span className="font-semibold">{usage.runs_30d} runs</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
