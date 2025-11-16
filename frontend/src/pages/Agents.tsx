import { useEffect, useState } from 'react'
import api from '../services/api'
import { Bot, Play, Activity, CheckCircle } from 'lucide-react'

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

export default function Bots() {
  const [bots, setBots] = useState<BotInfo[]>([])
  const [categories, setCategories] = useState<BotCategories>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [selectedBot, setSelectedBot] = useState<BotInfo | null>(null)

  useEffect(() => {
    loadBots()
  }, [])

  const loadBots = async () => {
    try {
      const [botsRes, categoriesRes] = await Promise.all([
        api.get('/bots/'),
        api.get('/bots/categories'),
      ])
      setBots(botsRes.data)
      setCategories(categoriesRes.data)
    } catch (error) {
      console.error('Failed to load bots:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBots = selectedCategory === 'all' 
    ? bots 
    : bots.filter(bot => bot.category === selectedCategory)

  const handleExecuteBot = async (botId: string) => {
    try {
      const response = await api.post(`/bots/${botId}/execute`, {})
      alert(`Bot executed successfully: ${JSON.stringify(response.data)}`)
    } catch (error: any) {
      alert(`Bot execution failed: ${error.response?.data?.detail || error.message}`)
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Bots</h1>
          <p className="text-gray-600 mt-1">
            {bots.length} AI-powered automation bots available
          </p>
        </div>
        <div className="bg-blue-100 rounded-lg px-4 py-2">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-900">
              All bots operational
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedCategory === 'all'
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-sm font-medium text-gray-600">All Bots</div>
          <div className="text-2xl font-bold text-gray-900">{bots.length}</div>
        </button>
        {Object.entries(categories)
          .slice(0, 3)
          .map(([category, count]) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedCategory === category
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium text-gray-600">{category}</div>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
            </button>
          ))}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex space-x-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({bots.length})
            </button>
            {Object.entries(categories).map(([category, count]) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category} ({count})
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {filteredBots.map((bot) => (
            <div
              key={bot.id}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedBot(bot)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <Bot className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {bot.status}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{bot.name}</h3>
              <p className="text-xs text-gray-600 mb-3">{bot.category}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleExecuteBot(bot.id)
                }}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center"
              >
                <Play className="h-4 w-4 mr-2" />
                Execute Bot
              </button>
            </div>
          ))}
        </div>

        {filteredBots.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No bots found in this category
          </div>
        )}
      </div>

      {selectedBot && (
        <BotDetailsModal
          bot={selectedBot}
          onClose={() => setSelectedBot(null)}
          onExecute={handleExecuteBot}
        />
      )}
    </div>
  )
}

function BotDetailsModal({
  bot,
  onClose,
  onExecute,
}: {
  bot: BotInfo
  onClose: () => void
  onExecute: (botId: string) => void
}) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDetails()
  }, [bot.id])

  const loadDetails = async () => {
    try {
      const response = await api.get(`/bots/${bot.id}`)
      setDetails(response.data)
    } catch (error) {
      console.error('Failed to load bot details:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3 mr-4">
                <Bot className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{bot.name}</h2>
                <p className="text-sm text-gray-600">{bot.category}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600 text-sm">
                  {details?.description || 'This bot automates business processes efficiently.'}
                </p>
              </div>

              {details?.capabilities && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Capabilities</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {details.capabilities.map((cap: string, idx: number) => (
                      <li key={idx} className="text-gray-600 text-sm">
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Module</span>
                  <span className="text-xs text-gray-600 font-mono">{bot.module}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onExecute(bot.id)
                    onClose()
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Execute Bot
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
