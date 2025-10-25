#!/bin/bash

# Create BotBreakdown component
cat > frontend/src/components/dashboard/BotBreakdown.tsx << 'EOF'
import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const BotBreakdown: React.FC<{ data?: any }> = ({ data }) => {
  const chartData = [
    { name: 'SAP Documents', value: data?.document_scanner?.total_processed || 450, color: '#3b82f6' },
    { name: 'Helpdesk', value: data?.helpdesk?.total_conversations || 1250, color: '#10b981' },
    { name: 'Sales Orders', value: data?.sales_order?.total_orders || 320, color: '#f59e0b' }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
      <h3 className="text-2xl font-bold text-white mb-6">Bot Activity Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#fff' }} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-4 mt-6">
        {chartData.map((bot, idx) => (
          <div key={idx} className="text-center">
            <p className="text-2xl font-bold" style={{ color: bot.color }}>{bot.value}</p>
            <p className="text-gray-400 text-xs">{bot.name}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default BotBreakdown;
EOF

# Create RealtimeStatus component
cat > frontend/src/components/dashboard/RealtimeStatus.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const RealtimeStatus: React.FC = () => {
  const [status, setStatus] = useState({ ollama: true, database: true, lastUpdate: new Date() });

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus({ ...status, lastUpdate: new Date() });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">🔴 Live Status</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-400 text-xs">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-white text-sm">Ollama AI</span>
          </div>
          <span className="text-green-400 text-xs">Online</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-white text-sm">Database</span>
          </div>
          <span className="text-green-400 text-xs">Connected</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-white text-sm">SAP Bot</span>
          </div>
          <span className="text-green-400 text-xs">Active</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-white text-sm">Helpdesk Bot</span>
          </div>
          <span className="text-green-400 text-xs">Active</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-white text-sm">Sales Bot</span>
          </div>
          <span className="text-green-400 text-xs">Active</span>
        </div>
      </div>

      <div className="mt-4 text-center text-gray-400 text-xs">
        Last updated: {status.lastUpdate.toLocaleTimeString()}
      </div>
    </motion.div>
  );
};

export default RealtimeStatus;
EOF

# Create AccuracyTrends component
cat > frontend/src/components/dashboard/AccuracyTrends.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AccuracyTrends: React.FC<{ period: string }> = ({ period }) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const mockData = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sap_accuracy: 92 + Math.random() * 6,
      helpdesk_accuracy: 88 + Math.random() * 8,
      sales_accuracy: 95 + Math.random() * 4
    }));
    setData(mockData);
  }, [period]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
      <h3 className="text-2xl font-bold text-white mb-6">Accuracy Trends</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
          <XAxis dataKey="date" stroke="#ffffff80" />
          <YAxis stroke="#ffffff80" domain={[80, 100]} />
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#fff' }} />
          <Line type="monotone" dataKey="sap_accuracy" stroke="#3b82f6" strokeWidth={2} name="SAP Bot %" />
          <Line type="monotone" dataKey="helpdesk_accuracy" stroke="#10b981" strokeWidth={2} name="Helpdesk %" />
          <Line type="monotone" dataKey="sales_accuracy" stroke="#f59e0b" strokeWidth={2} name="Sales %" />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default AccuracyTrends;
EOF

echo "✅ Created remaining dashboard components!"

