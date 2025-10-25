import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../utils/api';

interface PerformanceChartProps {
  period: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ period }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      // Mock data for now
      const mockData = Array.from({ length: parseInt(period) || 7 }, (_, i) => ({
        date: new Date(Date.now() - (parseInt(period) - i - 1) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        success_rate: 85 + Math.random() * 10,
        avg_confidence: 80 + Math.random() * 15,
        interactions: Math.floor(50 + Math.random() * 100)
      }));
      setData(mockData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
    >
      <h3 className="text-2xl font-bold text-white mb-6">Performance Over Time</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
          <XAxis dataKey="date" stroke="#ffffff80" />
          <YAxis stroke="#ffffff80" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#fff'
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="success_rate"
            stroke="#10b981"
            fillOpacity={1}
            fill="url(#successGradient)"
            name="Success Rate %"
          />
          <Area
            type="monotone"
            dataKey="avg_confidence"
            stroke="#8b5cf6"
            fillOpacity={1}
            fill="url(#confidenceGradient)"
            name="Avg Confidence %"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default PerformanceChart;
