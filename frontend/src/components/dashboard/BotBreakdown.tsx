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
      <h3 className="text-2xl font-bold text-white mb-6">Agent Activity Breakdown</h3>
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
        {chartData.map((agent, idx) => (
          <div key={idx} className="text-center">
            <p className="text-2xl font-bold" style={{ color: agent.color }}>{agent.value}</p>
            <p className="text-gray-400 text-xs">{agent.name}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default BotBreakdown;
