import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ERPBots = () => {
  const [bots, setBots] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const response = await axios.get('/api/bots');
      setBots(response.data.bots || []);
      
      const categoriesResponse = await axios.get('/api/bots/categories');
      setCategories(categoriesResponse.data.categories || []);
    } catch (error) {
      console.error('Error loading bots:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeBot = async (botId) => {
    setExecuting(true);
    try {
      const response = await axios.post('/api/bots/execute', {
        bot_id: botId,
        data: {}
      });
      alert(`Bot executed successfully!\n\nResult: ${JSON.stringify(response.data.result, null, 2)}`);
    } catch (error) {
      alert(`Error executing bot: ${error.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const filteredBots = selectedCategory === 'all' 
    ? bots 
    : bots.filter(bot => bot.category === selectedCategory);

  const getCategoryIcon = (category) => {
    const icons = {
      'Financial': '💰',
      'CRM': '👥',
      'HR': '🧑‍💼',
      'Manufacturing': '🏭',
      'Procurement': '📦',
      'Compliance': '✅',
      'Documents': '📄',
      'Retail': '🛒',
      'Healthcare': '🏥',
      'Communication': '💬'
    };
    return icons[category] || '🤖';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Financial': 'from-green-500 to-green-600',
      'CRM': 'from-blue-500 to-blue-600',
      'HR': 'from-purple-500 to-purple-600',
      'Manufacturing': 'from-orange-500 to-orange-600',
      'Procurement': 'from-cyan-500 to-cyan-600',
      'Compliance': 'from-red-500 to-red-600',
      'Documents': 'from-yellow-500 to-yellow-600',
      'Retail': 'from-pink-500 to-pink-600',
      'Healthcare': 'from-indigo-500 to-indigo-600',
      'Communication': 'from-teal-500 to-teal-600'
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <a href="/erp-dashboard" className="text-white/70 hover:text-white text-sm mb-2 inline-block">
                ← Back to Dashboard
              </a>
              <h1 className="text-3xl font-bold text-white">Automation Bots</h1>
              <p className="text-white/70 mt-1">67 AI-Powered Automation Bots</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2 border border-white/20">
                <span className="text-white/70 text-sm">Total Bots: </span>
                <span className="text-white font-bold text-lg">{bots.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              All Bots ({bots.length})
            </button>
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-6 py-3 rounded-lg font-semibold transition flex items-center space-x-2 ${
                  selectedCategory === category.name
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <span>{getCategoryIcon(category.name)}</span>
                <span>{category.name} ({category.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bots Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-white text-xl">Loading bots...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBots.map((bot) => (
              <div
                key={bot.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${getCategoryColor(bot.category)} flex items-center justify-center text-2xl group-hover:scale-110 transition`}>
                    {getCategoryIcon(bot.category)}
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                    Active
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-2">{bot.name}</h3>
                <p className="text-white/70 text-sm mb-4 line-clamp-2">{bot.description}</p>
                
                <div className="flex items-center justify-between text-sm mb-4">
                  <div>
                    <span className="text-white/70">Category:</span>
                    <span className="text-white ml-2">{bot.category}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedBot(bot)}
                    className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition text-sm"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => executeBot(bot.id)}
                    disabled={executing}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition text-sm disabled:opacity-50"
                  >
                    {executing ? 'Running...' : 'Execute'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredBots.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-white/70">No bots found in this category.</p>
          </div>
        )}
      </div>

      {/* Bot Details Modal */}
      {selectedBot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-white/20 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${getCategoryColor(selectedBot.category)} flex items-center justify-center text-3xl`}>
                    {getCategoryIcon(selectedBot.category)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedBot.name}</h2>
                    <p className="text-white/70">{selectedBot.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBot(null)}
                  className="text-white/70 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                  <p className="text-white/70">{selectedBot.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Capabilities</h3>
                  <ul className="list-disc list-inside text-white/70 space-y-1">
                    {selectedBot.capabilities?.map((cap, idx) => (
                      <li key={idx}>{cap}</li>
                    )) || <li>Automated processing and data extraction</li>}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-white/70 text-sm">Status</p>
                    <p className="text-white font-semibold mt-1">Active</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-white/70 text-sm">Version</p>
                    <p className="text-white font-semibold mt-1">3.0.0</p>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      executeBot(selectedBot.id);
                      setSelectedBot(null);
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
                  >
                    Execute Bot
                  </button>
                  <button
                    onClick={() => setSelectedBot(null)}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ERPBots;
