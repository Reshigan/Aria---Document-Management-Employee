import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Bot, Play, Activity, CheckCircle, Settings } from 'lucide-react'

interface BotInfo {
  id: string
  name: string
  module: string
  status: string
  category: string
}

interface BotCategories {
  [key: string]: number
}

export default function Agents() {
  const navigate = useNavigate()
  const [agents, setBots] = useState<BotInfo[]>([])
  const [categories, setCategories] = useState<BotCategories>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [selectedBot, setSelectedBot] = useState<BotInfo | null>(null)

  useEffect(() => {
    loadBots()
  }, [])

  const loadBots = async () => {
    try {
      // Use /api/bots endpoint which works correctly
      const botsRes = await api.get('/bots')
      const botsData = botsRes.data.bots || []
      setBots(botsData.map((bot: any) => ({
        id: bot.id,
        name: bot.name,
        module: bot.category,
        status: 'active',
        category: bot.category
      })))
      
      // Calculate categories from bots data
      const cats: BotCategories = {}
      botsData.forEach((bot: any) => {
        cats[bot.category] = (cats[bot.category] || 0) + 1
      })
      setCategories(cats)
    } catch (error) {
      console.error('Failed to load agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBots = selectedCategory === 'all' 
    ? agents 
    : agents.filter(agent => agent.category === selectedCategory)

  const handleExecuteBot = async (botId: string) => {
    try {
      const response = await api.post(`/bots/execute`, {
        bot_id: botId,
        data: {}
      })
      alert(`Agent executed successfully: ${response.data.message || JSON.stringify(response.data)}`)
    } catch (error: any) {
      alert(`Agent execution failed: ${error.response?.data?.detail || error.response?.data?.message || error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">AI Agents</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            {agents.length} AI-powered automation agents available
          </p>
        </div>
        <div className="bg-green-100 dark:bg-green-900/30 rounded-xl px-4 py-2">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
            <span className="text-sm font-medium text-green-800 dark:text-green-300">
              All agents operational
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`p-4 rounded-xl border-2 transition-all ${
            selectedCategory === 'all'
              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
          }`}
        >
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">All Agents</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{agents.length}</div>
        </button>
        {Object.entries(categories)
          .slice(0, 3)
          .map(([category, count]) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedCategory === category
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">{category}</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{count}</div>
            </button>
          ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex space-x-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white '
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All ({agents.length})
            </button>
            {Object.entries(categories).map(([category, count]) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white '
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category} ({count})
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {filteredBots.map((agent) => (
            <div
              key={agent.id}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-4  cursor-pointer bg-white dark:bg-gray-800/50"
              onClick={() => setSelectedBot(agent)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 rounded-xl p-2">
                  <Bot className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded-full">
                  {agent.status}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{agent.name}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">{agent.category}</p>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExecuteBot(agent.id)
                  }}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-2 rounded-xl text-sm  flex items-center justify-center transition-all"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Execute
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/agents/${agent.id}`)
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredBots.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-300">
            No agents found in this category
          </div>
        )}
      </div>

      {selectedBot && (
        <BotDetailsModal
          agent={selectedBot}
          onClose={() => setSelectedBot(null)}
          onExecute={handleExecuteBot}
        />
      )}
    </div>
  )
}

function BotDetailsModal({
  agent,
  onClose,
  onExecute,
}: {
  agent: BotInfo
  onClose: () => void
  onExecute: (botId: string) => void
}) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDetails()
  }, [agent.id])

  const loadDetails = async () => {
    try {
      const response = await api.get(`/bots`)
      const allBots = response.data.bots || []
      const botDetails = allBots.find((b: any) => b.id === agent.id)
      setDetails(botDetails || {
        description: 'This agent automates business processes efficiently.',
        capabilities: ['Automated processing', 'Real-time execution', 'Error handling']
      })
    } catch (error) {
      console.error('Failed to load agent details:', error)
      setDetails({
        description: 'This agent automates business processes efficiently.',
        capabilities: ['Automated processing', 'Real-time execution', 'Error handling']
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 rounded-xl p-3 mr-4">
                <Bot className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{agent.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">{agent.category}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {details?.description || 'This agent automates business processes efficiently.'}
                </p>
              </div>

              {details?.capabilities && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Capabilities</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {details.capabilities.map((cap: string, idx: number) => (
                      <li key={idx} className="text-gray-600 dark:text-gray-300 text-sm">
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded-full">
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Module</span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-mono">{agent.module}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onExecute(agent.id)
                    onClose()
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl  flex items-center transition-all"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Execute Agent
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
