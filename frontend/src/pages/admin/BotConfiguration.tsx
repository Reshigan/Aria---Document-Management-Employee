import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Bot, Settings, Bell, CheckCircle, XCircle, DollarSign, Mail, MessageSquare } from 'lucide-react';
import api from '../../lib/api';

interface BotConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  auto_approval_limit?: number;
  notifications: {
    email: boolean;
    whatsapp: boolean;
    in_app: boolean;
  };
  settings: Record<string, any>;
}

export default function BotConfigurationPage() {
  const [agents, setBots] = useState<BotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBotConfigs();
  }, []);

  const fetchBotConfigs = async () => {
    try {
      const data = await api.get('/admin/agents/config');
      setBots(data.agents || []);
    } catch (error) {
      console.error('Error fetching agent configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBot = async (botId: string, enabled: boolean) => {
    try {
      await api.post(`/admin/agents/${botId}/toggle`, { enabled });
      setBots(agents.map(agent => agent.id === botId ? { ...agent, enabled } : agent));
    } catch (error) {
      console.error('Error toggling agent:', error);
    }
  };

  const handleUpdateLimit = async (botId: string, limit: number) => {
    setBots(agents.map(agent => agent.id === botId ? { ...agent, auto_approval_limit: limit } : agent));
  };

  const handleUpdateNotifications = async (botId: string, channel: string, value: boolean) => {
    setBots(agents.map(agent => {
      if (agent.id === botId) {
        return {
          ...agent,
          notifications: { ...agent.notifications, [channel]: value }
        };
      }
      return agent;
    }));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await api.put('/admin/agents/config', { agents });
      alert('Agent configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <Agent className="h-8 w-8" />
          Agent Configuration
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Configure AI agents and automation settings</p>
      </div>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6 space-y-6">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{agent.name}</h3>
                  {agent.enabled ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Enabled
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm">
                      <XCircle className="h-4 w-4" />
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400">{agent.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={agent.enabled}
                  onChange={(e) => handleToggleBot(agent.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white dark:bg-gray-800 after:border-gray-300 dark:border-gray-600 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 dark:bg-blue-500"></div>
              </label>
            </div>

            {agent.enabled && (
              <div className="border-t pt-4 space-y-4">
                {agent.auto_approval_limit !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Auto-Approval Limit (ZAR)
                    </label>
                    <input
                      type="number"
                      value={agent.auto_approval_limit}
                      onChange={(e) => handleUpdateLimit(agent.id, parseFloat(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                      placeholder="10000"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Automatically approve transactions below this amount
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notification Channels
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={agent.notifications.email}
                        onChange={(e) => handleUpdateNotifications(agent.id, 'email', e.target.checked)}
                        className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded"
                      />
                      <Mail className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">Email Notifications</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={agent.notifications.whatsapp}
                        onChange={(e) => handleUpdateNotifications(agent.id, 'whatsapp', e.target.checked)}
                        className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded"
                      />
                      <MessageSquare className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">WhatsApp Notifications</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={agent.notifications.in_app}
                        onChange={(e) => handleUpdateNotifications(agent.id, 'in_app', e.target.checked)}
                        className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded"
                      />
                      <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">In-App Notifications</span>
                    </label>
                  </div>
                </div>

                {agent.id === 'invoice_bot' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Matching Confidence Threshold (%)
                    </label>
                    <input
                      type="number"
                      min="70"
                      max="100"
                      defaultValue="95"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Minimum confidence level for auto-matching invoices
                    </p>
                  </div>
                )}

                {agent.id === 'bbbee_bot' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Certificate Expiry Reminder (days before)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      defaultValue="30"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
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
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
