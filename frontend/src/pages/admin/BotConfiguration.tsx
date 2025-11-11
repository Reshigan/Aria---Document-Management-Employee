import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Bot, Settings, Bell, CheckCircle, XCircle, DollarSign, Mail, MessageSquare } from 'lucide-react';

interface BotConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  auto_approval_limit?: number;
  notification_email: boolean;
  notification_whatsapp: boolean;
  notification_in_app: boolean;
  executions_count: number;
  last_executed?: string;
}

export default function BotConfigurationPage() {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBotConfigs();
  }, []);

  const fetchBotConfigs = async () => {
    try {
      const response = await fetch('/api/admin/bots/config', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBots(data.bots);
      }
    } catch (error) {
      console.error('Error fetching bot configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBot = async (botId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/bots/${botId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        setBots(bots.map(bot => bot.id === botId ? { ...bot, enabled } : bot));
      }
    } catch (error) {
      console.error('Error toggling bot:', error);
    }
  };

  const handleUpdateLimit = async (botId: string, limit: number) => {
    setBots(bots.map(bot => bot.id === botId ? { ...bot, auto_approval_limit: limit } : bot));
  };

  const handleUpdateNotifications = async (botId: string, channel: string, value: boolean) => {
    setBots(bots.map(bot => {
      if (bot.id === botId) {
        const fieldName = `notification_${channel}` as keyof BotConfig;
        return {
          ...bot,
          [fieldName]: value
        };
      }
      return bot;
    }));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      for (const bot of bots) {
        await fetch(`/api/admin/bots/${bot.id}/config`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({
            enabled: bot.enabled,
            auto_approval_limit: bot.auto_approval_limit,
            notification_email: bot.notification_email,
            notification_whatsapp: bot.notification_whatsapp,
            notification_in_app: bot.notification_in_app
          })
        });
      }
      alert('Bot configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(bots.map(b => b.category)))];
  
  const filteredBots = bots.filter(bot => {
    const matchesCategory = selectedCategory === 'All' || bot.category === selectedCategory;
    const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bot.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Bot className="h-8 w-8" />
          Bot Configuration
        </h1>
        <p className="text-gray-600 mt-2">Configure all 67 AI bots and automation settings</p>
      </div>

      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search bots..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredBots.length} of {bots.length} bots
      </div>

      <div className="space-y-6">
        {filteredBots.map((bot) => (
          <div key={bot.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{bot.name}</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                    {bot.category}
                  </span>
                  {bot.enabled ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Enabled
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-600 text-sm">
                      <XCircle className="h-4 w-4" />
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{bot.description}</p>
                <div className="mt-2 flex gap-4 text-sm text-gray-500">
                  <span>Executions: {bot.executions_count}</span>
                  {bot.last_executed && (
                    <span>Last used: {new Date(bot.last_executed).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={bot.enabled}
                  onChange={(e) => handleToggleBot(bot.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {bot.enabled && (
              <div className="border-t pt-4 space-y-4">
                {bot.auto_approval_limit !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Auto-Approval Limit (ZAR)
                    </label>
                    <input
                      type="number"
                      value={bot.auto_approval_limit}
                      onChange={(e) => handleUpdateLimit(bot.id, parseFloat(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                      placeholder="10000"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Automatically approve transactions below this amount
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notification Channels
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={bot.notification_email}
                        onChange={(e) => handleUpdateNotifications(bot.id, 'email', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <Mail className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-700">Email Notifications</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={bot.notification_whatsapp}
                        onChange={(e) => handleUpdateNotifications(bot.id, 'whatsapp', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <MessageSquare className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-700">WhatsApp Notifications</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={bot.notification_in_app}
                        onChange={(e) => handleUpdateNotifications(bot.id, 'in_app', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <Bell className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-700">In-App Notifications</span>
                    </label>
                  </div>
                </div>

                {bot.id === 'invoice_bot' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Matching Confidence Threshold (%)
                    </label>
                    <input
                      type="number"
                      min="70"
                      max="100"
                      defaultValue="95"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Minimum confidence level for auto-matching invoices
                    </p>
                  </div>
                )}

                {bot.id === 'bbbee_bot' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certificate Expiry Reminder (days before)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      defaultValue="30"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <Button variant="outline" onClick={fetchBotConfigs}>
          Reset
        </Button>
        <Button
          onClick={handleSaveConfig}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
