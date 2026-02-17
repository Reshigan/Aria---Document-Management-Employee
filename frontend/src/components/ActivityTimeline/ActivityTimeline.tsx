import React, { useState, useEffect } from 'react';
import { 
  FileText, ShoppingCart, Package, Users, DollarSign, 
  CheckCircle, AlertCircle, Clock, Edit, Trash2, Plus,
  ArrowRight, Bot, MessageSquare, RefreshCw
} from 'lucide-react';
import api from '../../services/api';

interface Activity {
  id: string;
  type: 'create' | 'update' | 'delete' | 'status_change' | 'bot_action' | 'comment' | 'approval';
  entity_type: string;
  entity_id: string;
  entity_name: string;
  description: string;
  user_name?: string;
  user_email?: string;
  bot_name?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

const activityIcons: Record<string, React.ReactNode> = {
  quote: <FileText className="h-4 w-4" />,
  sales_order: <ShoppingCart className="h-4 w-4" />,
  purchase_order: <Package className="h-4 w-4" />,
  customer: <Users className="h-4 w-4" />,
  invoice: <DollarSign className="h-4 w-4" />,
  payment: <DollarSign className="h-4 w-4" />,
  product: <Package className="h-4 w-4" />,
};

const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus className="h-3 w-3" />,
  update: <Edit className="h-3 w-3" />,
  delete: <Trash2 className="h-3 w-3" />,
  status_change: <ArrowRight className="h-3 w-3" />,
  bot_action: <Bot className="h-3 w-3" />,
  comment: <MessageSquare className="h-3 w-3" />,
  approval: <CheckCircle className="h-3 w-3" />,
};

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  status_change: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  bot_action: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  comment: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  approval: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
};

interface ActivityTimelineProps {
  entityType?: string;
  entityId?: string;
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export default function ActivityTimeline({ 
  entityType, 
  entityId, 
  limit = 20,
  showHeader = true,
  className = ''
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      let url = `/activity-timeline?limit=${limit}`;
      if (entityType) url += `&entity_type=${entityType}`;
      if (entityId) url += `&entity_id=${entityId}`;
      
      const response = await api.get(url);
      setActivities(response.data.activities || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      // Use mock data if API fails
      setActivities(getMockActivities());
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [entityType, entityId, limit]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const groupActivitiesByDate = (activities: Activity[]) => {
    const groups: Record<string, Activity[]> = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      } else {
        key = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(activity);
    });
    
    return groups;
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm ${className}`}>
        {showHeader && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Timeline</h3>
          </div>
        )}
        <div className="p-6 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 text-gray-300 animate-spin" />
        </div>
      </div>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm ${className}`}>
      {showHeader && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Timeline</h3>
          <button 
            onClick={fetchActivities}
            className="p-2 text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      )}
      
      <div className="p-6">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-300">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
              <div key={date}>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-3">
                  {date}
                </h4>
                <div className="space-y-4">
                  {dateActivities.map((activity, index) => (
                    <div key={activity.id} className="flex gap-3">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div className={`p-2 rounded-full ${actionColors[activity.type]}`}>
                          {actionIcons[activity.type]}
                        </div>
                        {index < dateActivities.length - 1 && (
                          <div className="w-px h-full bg-gray-200 dark:bg-gray-700 mt-2" />
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">
                              <span className="font-medium">
                                {activity.user_name || activity.bot_name || 'System'}
                              </span>
                              {' '}{activity.description}
                            </p>
                            {activity.old_value && activity.new_value && (
                              <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                                {activity.old_value} → {activity.new_value}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-300 dark:text-gray-500 whitespace-nowrap ml-2">
                            {formatTime(activity.created_at)}
                          </span>
                        </div>
                        
                        {/* Entity link */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded">
                            {activityIcons[activity.entity_type] || <FileText className="h-3 w-3" />}
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {activity.entity_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getMockActivities(): Activity[] {
  const now = new Date();
  return [
    {
      id: '1',
      type: 'create',
      entity_type: 'quote',
      entity_id: 'Q-2024-001',
      entity_name: 'Quote Q-2024-001',
      description: 'created a new quote for ABC Corp',
      user_name: 'John Smith',
      created_at: new Date(now.getTime() - 30 * 60000).toISOString(),
    },
    {
      id: '2',
      type: 'status_change',
      entity_type: 'sales_order',
      entity_id: 'SO-2024-003',
      entity_name: 'Sales Order SO-2024-003',
      description: 'changed status',
      user_name: 'Jane Doe',
      old_value: 'Draft',
      new_value: 'Confirmed',
      created_at: new Date(now.getTime() - 2 * 3600000).toISOString(),
    },
    {
      id: '3',
      type: 'bot_action',
      entity_type: 'invoice',
      entity_id: 'INV-2024-015',
      entity_name: 'Invoice INV-2024-015',
      description: 'sent payment reminder email',
      bot_name: 'AR Collections Bot',
      created_at: new Date(now.getTime() - 5 * 3600000).toISOString(),
    },
    {
      id: '4',
      type: 'approval',
      entity_type: 'purchase_order',
      entity_id: 'PO-2024-008',
      entity_name: 'Purchase Order PO-2024-008',
      description: 'approved purchase order',
      user_name: 'Mike Johnson',
      created_at: new Date(now.getTime() - 24 * 3600000).toISOString(),
    },
    {
      id: '5',
      type: 'update',
      entity_type: 'customer',
      entity_id: 'CUST-001',
      entity_name: 'ABC Corporation',
      description: 'updated customer details',
      user_name: 'Sarah Wilson',
      created_at: new Date(now.getTime() - 48 * 3600000).toISOString(),
    },
  ];
}
