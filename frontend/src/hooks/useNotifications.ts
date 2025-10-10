import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { Notification, NotificationFilters } from '../types/notification';
import NotificationService from '../services/notificationService';
import { useSocketIO } from './useSocketIO';

export const useNotifications = (filters?: NotificationFilters) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Socket.IO integration for real-time updates
  const { isConnected, connectionError } = useSocketIO({
    onNotification: (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification for high priority notifications
      if (notification.priority === 'HIGH' || notification.priority === 'URGENT') {
        message.warning({
          content: notification.title,
          duration: 5,
          key: `notification-${notification.id}`,
        });
      } else {
        message.info({
          content: notification.title,
          duration: 3,
          key: `notification-${notification.id}`,
        });
      }
    },
    onNotificationUpdate: (updatedNotification: Notification) => {
      setNotifications(prev => 
        prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
      );
      
      // Update unread count if read status changed
      if (updatedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    },
    onNotificationDelete: (notificationId: number) => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      // Update unread count if deleted notification was unread
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    },
    onConnectionChange: (connected: boolean) => {
      if (connected) {
        // Refresh notifications when reconnected
        fetchNotifications();
      }
    }
  });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await NotificationService.getNotifications(filters);
      setNotifications(data);
      
      // Update unread count
      const unread = data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      const updatedNotification = await NotificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? updatedNotification : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark as read';
      message.error(errorMessage);
    }
  }, []);

  const markAsUnread = useCallback(async (id: number) => {
    try {
      const updatedNotification = await NotificationService.markAsUnread(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? updatedNotification : n)
      );
      setUnreadCount(prev => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark as unread';
      message.error(errorMessage);
    }
  }, []);

  const markAsArchived = useCallback(async (id: number) => {
    try {
      await NotificationService.markAsArchived(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Update unread count if archived notification was unread
      const archivedNotification = notifications.find(n => n.id === id);
      if (archivedNotification && !archivedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      message.success('Notification archived');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive notification';
      message.error(errorMessage);
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      message.success('All notifications marked as read');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark all as read';
      message.error(errorMessage);
    }
  }, []);

  const deleteNotification = useCallback(async (id: number) => {
    try {
      await NotificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Update unread count if deleted notification was unread
      const deletedNotification = notifications.find(n => n.id === id);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      message.success('Notification deleted');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete notification';
      message.error(errorMessage);
    }
  }, [notifications]);

  const bulkMarkAsRead = useCallback(async (ids: number[]) => {
    try {
      await NotificationService.bulkMarkAsRead(ids);
      setNotifications(prev => 
        prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n)
      );
      
      // Update unread count
      const unreadInBulk = notifications.filter(n => ids.includes(n.id) && !n.is_read).length;
      setUnreadCount(prev => Math.max(0, prev - unreadInBulk));
      
      message.success(`${ids.length} notifications marked as read`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark notifications as read';
      message.error(errorMessage);
    }
  }, [notifications]);

  const bulkArchive = useCallback(async (ids: number[]) => {
    try {
      await NotificationService.bulkArchive(ids);
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      
      // Update unread count
      const unreadInBulk = notifications.filter(n => ids.includes(n.id) && !n.is_read).length;
      setUnreadCount(prev => Math.max(0, prev - unreadInBulk));
      
      message.success(`${ids.length} notifications archived`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive notifications';
      message.error(errorMessage);
    }
  }, [notifications]);

  const bulkDelete = useCallback(async (ids: number[]) => {
    try {
      await NotificationService.bulkDelete(ids);
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      
      // Update unread count
      const unreadInBulk = notifications.filter(n => ids.includes(n.id) && !n.is_read).length;
      setUnreadCount(prev => Math.max(0, prev - unreadInBulk));
      
      message.success(`${ids.length} notifications deleted`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete notifications';
      message.error(errorMessage);
    }
  }, [notifications]);

  const refresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Periodic unread count refresh (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    isConnected,
    connectionError,
    actions: {
      markAsRead,
      markAsUnread,
      markAsArchived,
      markAllAsRead,
      deleteNotification,
      bulkMarkAsRead,
      bulkArchive,
      bulkDelete,
      refresh
    }
  };
};