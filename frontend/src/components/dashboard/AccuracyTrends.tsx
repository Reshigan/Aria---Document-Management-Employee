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
          <Line type="monotone" dataKey="sap_accuracy" stroke="#3b82f6" strokeWidth={2} name="SAP Agent %" />
          <Line type="monotone" dataKey="helpdesk_accuracy" stroke="#10b981" strokeWidth={2} name="Helpdesk %" />
          <Line type="monotone" dataKey="sales_accuracy" stroke="#f59e0b" strokeWidth={2} name="Sales %" />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default AccuracyTrends;
