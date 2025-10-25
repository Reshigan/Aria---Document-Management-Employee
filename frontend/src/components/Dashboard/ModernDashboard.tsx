/**
 * Modern Analytics Dashboard - World-class UI
 */
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, FileText, Bot, Clock, CheckCircle, Users } from 'lucide-react';

export const ModernDashboard: React.FC = () => {
  const [stats, setStats] = useState({ totalDocuments: 1247, processedToday: 89, activeConversations: 23, successRate: 98.5 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Documents" value={stats.totalDocuments} icon={<FileText />} color="blue" />
          <StatCard title="Processed Today" value={stats.processedToday} icon={<CheckCircle />} color="green" />
          <StatCard title="Active Chats" value={stats.activeConversations} icon={<Bot />} color="purple" />
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<any> = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-2xl shadow-xl p-6">
    <div className="flex items-center justify-between">
      <div><h3 className="text-2xl font-bold">{value}</h3><p className="text-sm text-gray-600">{title}</p></div>
      <div className={`w-12 h-12 rounded-xl bg-${color}-500 flex items-center justify-center text-white`}>{icon}</div>
    </div>
  </div>
);

export default ModernDashboard;
