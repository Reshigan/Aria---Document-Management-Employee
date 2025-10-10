import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification } from '../types/notification';

interface SocketIOOptions {
  onNotification?: (notification: Notification) => void;
  onNotificationUpdate?: (notification: Notification) => void;
  onNotificationDelete?: (notificationId: number) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

export const useSocketIO = (options: SocketIOOptions = {}) => {
  const {
    onNotification,
    onNotificationUpdate,
    onNotificationDelete,
    onConnectionChange,
    onError,
    autoConnect = true
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const socketRef = useRef<Socket | null>(null);

  const getSocketUrl = useCallback(() => {
    return process.env.NEXT_PUBLIC_WS_URL || window.location.origin;
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const socketUrl = getSocketUrl();
      
      socketRef.current = io(socketUrl, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('Socket.IO connected');
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
        onConnectionChange?.(true);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        setIsConnected(false);
        onConnectionChange?.(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        setConnectionError(error.message);
        onError?.(error.message);
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('Socket.IO reconnected after', attemptNumber, 'attempts');
        setReconnectAttempts(attemptNumber);
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Socket.IO reconnect attempt', attemptNumber);
        setReconnectAttempts(attemptNumber);
      });

      socket.on('reconnect_error', (error) => {
        console.error('Socket.IO reconnect error:', error);
        setConnectionError(error.message);
      });

      socket.on('reconnect_failed', () => {
        console.error('Socket.IO reconnect failed');
        setConnectionError('Failed to reconnect after maximum attempts');
      });

      // Notification events
      socket.on('notification:new', (notification: Notification) => {
        console.log('New notification received:', notification);
        onNotification?.(notification);
      });

      socket.on('notification:updated', (notification: Notification) => {
        console.log('Notification updated:', notification);
        onNotificationUpdate?.(notification);
      });

      socket.on('notification:deleted', (data: { id: number }) => {
        console.log('Notification deleted:', data.id);
        onNotificationDelete?.(data.id);
      });

      // Join user's notification room
      socket.emit('join:notifications');

    } catch (error) {
      console.error('Failed to create Socket.IO connection:', error);
      setConnectionError('Failed to connect');
      onError?.('Failed to connect');
    }
  }, [getSocketUrl, onNotification, onNotificationUpdate, onNotificationDelete, onConnectionChange, onError]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setReconnectAttempts(0);
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    return false;
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, autoConnect]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && autoConnect) {
        reconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, reconnect, autoConnect]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (!isConnected && autoConnect) {
        reconnect();
      }
    };

    const handleOffline = () => {
      setConnectionError('Network connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isConnected, reconnect, autoConnect]);

  return {
    isConnected,
    connectionError,
    reconnectAttempts,
    connect,
    disconnect,
    reconnect,
    emit,
    on,
    off,
    socket: socketRef.current
  };
};