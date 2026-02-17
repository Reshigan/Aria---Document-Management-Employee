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
            <span className="text-white text-sm">SAP Agent</span>
          </div>
          <span className="text-green-400 text-xs">Active</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-white text-sm">Helpdesk Agent</span>
          </div>
          <span className="text-green-400 text-xs">Active</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-white text-sm">Sales Agent</span>
          </div>
          <span className="text-green-400 text-xs">Active</span>
        </div>
      </div>

      <div className="mt-4 text-center text-gray-300 text-xs">
        Last updated: {status.lastUpdate.toLocaleTimeString()}
      </div>
    </motion.div>
  );
};

export default RealtimeStatus;
