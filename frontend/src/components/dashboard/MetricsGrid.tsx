import React from 'react';
import { motion } from 'framer-motion';

interface MetricsGridProps {
  data?: {
    total_interactions?: number;
    success_rate?: number;
    avg_confidence?: number;
    time_saved_hours?: number;
    cost_saved?: number;
    roi_percentage?: number;
  };
}

const MetricsGrid: React.FC<MetricsGridProps> = ({ data }) => {
  const metrics = [
    {
      label: 'Total Interactions',
      value: data?.total_interactions?.toLocaleString() || '0',
      change: '+12%',
      icon: '📊',
      color: 'from-blue-600 to-cyan-600'
    },
    {
      label: 'Success Rate',
      value: `${(data?.success_rate || 0).toFixed(1)}%`,
      change: '+5%',
      icon: '✅',
      color: 'from-green-600 to-emerald-600'
    },
    {
      label: 'Avg Confidence',
      value: `${((data?.avg_confidence || 0) * 100).toFixed(1)}%`,
      change: '+3%',
      icon: '🎯',
      color: 'from-purple-600 to-pink-600'
    },
    {
      label: 'Time Saved',
      value: `${(data?.time_saved_hours || 0).toFixed(0)}h`,
      change: '+18%',
      icon: '⚡',
      color: 'from-yellow-600 to-orange-600'
    },
    {
      label: 'Cost Saved',
      value: `$${(data?.cost_saved || 0).toLocaleString()}`,
      change: '+22%',
      icon: '💰',
      color: 'from-green-600 to-teal-600'
    },
    {
      label: 'ROI',
      value: `${(data?.roi_percentage || 0).toFixed(0)}%`,
      change: '+15%',
      icon: '📈',
      color: 'from-indigo-600 to-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl">{metric.icon}</span>
            <span className="text-green-400 text-sm font-semibold">
              {metric.change}
            </span>
          </div>
          <h3 className="text-gray-300 text-sm mb-2">{metric.label}</h3>
          <p className={`text-3xl font-bold bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}>
            {metric.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

export default MetricsGrid;
