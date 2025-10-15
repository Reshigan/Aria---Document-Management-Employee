import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const Office365Integration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [mailboxData, setMailboxData] = useState(null);
  const [botStatus, setBotStatus] = useState('inactive');
  const [settings, setSettings] = useState({
    monitorInbox: true,
    autoProcessAttachments: true,
    notificationEmail: '',
    processingRules: []
  });

  useEffect(() => {
    checkConnectionStatus();
    if (isConnected) {
      startMailboxMonitoring();
    }
  }, [isConnected]);

  const checkConnectionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/integrations/office365/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setConnectionStatus(data.status);
        setBotStatus(data.bot_status);
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Failed to check Office365 connection:', error);
    }
  };

  const connectToOffice365 = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/integrations/office365/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.auth_url) {
          window.open(data.auth_url, '_blank', 'width=600,height=700');
        }
      }
    } catch (error) {
      console.error('Failed to connect to Office365:', error);
    }
  };

  const startMailboxMonitoring = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/integrations/office365/start-monitoring', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setBotStatus('active');
        fetchMailboxData();
      }
    } catch (error) {
      console.error('Failed to start mailbox monitoring:', error);
    }
  };

  const fetchMailboxData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/integrations/office365/mailbox-data', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMailboxData(data);
      }
    } catch (error) {
      console.error('Failed to fetch mailbox data:', error);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/integrations/office365/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });

      if (response.ok) {
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold vx-text-gradient">Office365 Integration</h1>
          <p className="text-gray-400 mt-2">Automated mailbox monitoring and document processing</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-sm ${
            botStatus === 'active' ? 'bg-green-500/20 text-green-400' : 
            botStatus === 'inactive' ? 'bg-gray-500/20 text-gray-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            Bot: {botStatus}
          </div>
          <Button
            variant={isConnected ? "secondary" : "default"}
            onClick={isConnected ? checkConnectionStatus : connectToOffice365}
          >
            {isConnected ? 'Refresh Status' : 'Connect to Office365'}
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔗 Connection Status
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl mb-2">
                {isConnected ? '✅' : '❌'}
              </div>
              <p className="text-sm text-gray-400">Connection</p>
              <p className="font-semibold">{connectionStatus}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">
                {botStatus === 'active' ? '🤖' : '😴'}
              </div>
              <p className="text-sm text-gray-400">Bot Status</p>
              <p className="font-semibold">{botStatus}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">📧</div>
              <p className="text-sm text-gray-400">Emails Processed</p>
              <p className="font-semibold">{mailboxData?.processed_count || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mailbox Monitoring Settings */}
      <Card>
        <CardHeader>
          <CardTitle>⚙️ Monitoring Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Monitor Inbox</label>
                <input
                  type="checkbox"
                  checked={settings.monitorInbox}
                  onChange={(e) => setSettings({...settings, monitorInbox: e.target.checked})}
                  className="w-4 h-4"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Auto-process Attachments</label>
                <input
                  type="checkbox"
                  checked={settings.autoProcessAttachments}
                  onChange={(e) => setSettings({...settings, autoProcessAttachments: e.target.checked})}
                  className="w-4 h-4"
                />
              </div>
            </div>
            <div>
              <Input
                label="Notification Email"
                type="email"
                value={settings.notificationEmail}
                onChange={(e) => setSettings({...settings, notificationEmail: e.target.value})}
                placeholder="admin@company.com"
              />
            </div>
          </div>
          <Button
            onClick={() => updateSettings(settings)}
            className="w-full md:w-auto"
          >
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {isConnected && mailboxData && (
        <Card>
          <CardHeader>
            <CardTitle>📬 Recent Mailbox Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mailboxData.recent_emails?.map((email, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50"
                >
                  <div className="text-2xl">
                    {email.has_attachments ? '📎' : '📧'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{email.subject}</p>
                    <p className="text-sm text-gray-400">From: {email.sender}</p>
                    <p className="text-xs text-gray-500">{email.received_time}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    email.processed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {email.processed ? 'Processed' : 'Pending'}
                  </div>
                </motion.div>
              )) || (
                <div className="text-center py-8 text-gray-400">
                  No recent emails
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Rules */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Processing Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-700 rounded-lg">
                <h4 className="font-medium mb-2">📄 Document Types</h4>
                <p className="text-sm text-gray-400 mb-3">Auto-classify attachments by type</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm">PDF Documents</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm">Word Documents</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm">Excel Spreadsheets</span>
                  </label>
                </div>
              </div>
              <div className="p-4 border border-gray-700 rounded-lg">
                <h4 className="font-medium mb-2">🏷️ Auto-tagging</h4>
                <p className="text-sm text-gray-400 mb-3">Automatically tag documents based on content</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm">Invoice Detection</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm">Contract Analysis</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm">Report Classification</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Office365Integration;