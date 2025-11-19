/**
 * Customer Admin Dashboard
 * Manage organization, billing, templates, usage, and growth
 */
import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Agent, DollarSign, Target, AlertCircle,
  CheckCircle, ArrowUp, ArrowDown, Zap, Settings
} from 'lucide-react';

interface UsageMetrics {
  embeddingScore: number;
  activeTemplates: number;
  customBots: number;
  departmentsCovered: number;
  avgDailyActiveUsers: number;
  status: string;
}

interface HealthScore {
  healthScore: number;
  churnRisk: string;
  riskFactors: string[];
  positiveIndicators: string[];
  recommendedActions: string[];
}

interface Opportunity {
  type: string;
  priority: string;
  description: string;
  estimatedValue: number;
  effort: string;
}

export const CustomerDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Load metrics
      const metricsRes = await fetch('/api/aria/growth/embedding-score', { headers });
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);

      // Load health
      const healthRes = await fetch('/api/aria/growth/health', { headers });
      const healthData = await healthRes.json();
      setHealth(healthData);

      // Load opportunities
      const oppRes = await fetch('/api/aria/growth/opportunities', { headers });
      const oppData = await oppRes.json();
      setOpportunities(oppData.opportunities);

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmbeddingStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'deeply_embedded': 'text-green-600 bg-green-100',
      'well_integrated': 'text-blue-600 bg-blue-100',
      'growing': 'text-yellow-600 bg-yellow-100',
      'early_adoption': 'text-orange-600 bg-orange-100',
      'trial': 'text-gray-600 bg-gray-100'
    };
    return colors[status] || colors.trial;
  };

  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      'low': 'text-green-600 bg-green-100',
      'medium': 'text-yellow-600 bg-yellow-100',
      'high': 'text-red-600 bg-red-100'
    };
    return colors[risk] || colors.medium;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Customer Growth Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track Aria's integration and discover expansion opportunities
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Embedding Score */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Embedding Score
              </h3>
              <Target className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {metrics?.embeddingScore || 0}
              </span>
              <span className="text-sm text-gray-500 pb-1">/100</span>
            </div>
            {metrics && (
              <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getEmbeddingStatusColor(metrics.status)}`}>
                {metrics.status.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>

          {/* Health Score */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Health Score
              </h3>
              <Zap className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {health?.healthScore || 0}
              </span>
              <span className="text-sm text-gray-500 pb-1">/100</span>
            </div>
            {health && (
              <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(health.churnRisk)}`}>
                {health.churnRisk.toUpperCase()} RISK
              </span>
            )}
          </div>

          {/* Active Users */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Daily Active Users
              </h3>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {metrics?.avgDailyActiveUsers || 0}
              </span>
            </div>
            <div className="flex items-center mt-2 text-sm text-green-600">
              <ArrowUp className="w-4 h-4 mr-1" />
              <span>12% from last week</span>
            </div>
          </div>

          {/* Departments */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Departments
              </h3>
              <Agent className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {metrics?.departmentsCovered || 0}
              </span>
              <span className="text-sm text-gray-500 pb-1">/7</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {metrics?.customBots || 0} custom agents deployed
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Health Indicators */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Health Indicators
            </h3>
            
            {/* Positive Indicators */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                ✅ Positive Signals
              </h4>
              <div className="space-y-2">
                {health?.positiveIndicators.map((indicator, i) => (
                  <div key={i} className="flex items-start space-x-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{indicator}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Factors */}
            {health && health.riskFactors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  ⚠️ Risk Factors
                </h4>
                <div className="space-y-2">
                  {health.riskFactors.map((factor, i) => (
                    <div key={i} className="flex items-start space-x-2 text-sm text-red-700 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Recommended Actions
              </h4>
              <ul className="space-y-1">
                {health?.recommendedActions.map((action, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400">
                    • {action}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Expansion Opportunities */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
              Growth Opportunities
            </h3>

            <div className="space-y-3">
              {opportunities.slice(0, 5).map((opp, i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className={`
                        inline-block px-2 py-0.5 rounded text-xs font-medium mb-1
                        ${opp.priority === 'high' ? 'bg-red-100 text-red-700' : 
                          opp.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-gray-100 text-gray-700'}
                      `}>
                        {opp.priority.toUpperCase()}
                      </span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {opp.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        ${opp.estimatedValue}
                      </p>
                      <p className="text-xs text-gray-500">value/mo</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Type: {opp.type.replace('_', ' ')}</span>
                    <span className="flex items-center">
                      <span className={`
                        inline-block w-2 h-2 rounded-full mr-1
                        ${opp.effort === 'low' ? 'bg-green-500' : 
                          opp.effort === 'medium' ? 'bg-yellow-500' : 
                          'bg-red-500'}
                      `} />
                      {opp.effort} effort
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
              View All Opportunities
            </button>
          </div>
        </div>

        {/* Department Coverage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Department Coverage
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Sales', 'Marketing', 'HR', 'Finance', 'Legal', 'Operations', 'Support', 'Engineering'].map((dept) => {
              const isActive = Math.random() > 0.5; // Placeholder
              return (
                <div
                  key={dept}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${isActive 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20'}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {dept}
                    </span>
                    {isActive && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {isActive ? 'Active' : 'Available'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
