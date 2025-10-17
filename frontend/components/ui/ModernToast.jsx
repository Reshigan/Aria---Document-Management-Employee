import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const Toast = ({ toast, onRemove }) => {
  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  };

  const Icon = icons[toast.type];

  const toastVariants = {
    initial: { 
      opacity: 0, 
      x: 300,
      scale: 0.8
    },
    animate: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: { 
      opacity: 0, 
      x: 300,
      scale: 0.8,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <motion.div
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`
        max-w-sm w-full shadow-lg rounded-lg pointer-events-auto 
        border ${colors[toast.type]} backdrop-blur-sm
      `}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${iconColors[toast.type]}`} />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            {toast.title && (
              <p className="text-sm font-medium">
                {toast.title}
              </p>
            )}
            {toast.message && (
              <p className={`text-sm ${toast.title ? 'mt-1' : ''}`}>
                {toast.message}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="rounded-md inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => onRemove(toast.id)}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info',
      duration: 5000,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);

    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'success' });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'error' });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'warning' });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'info' });
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    success,
    error,
    warning,
    info
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-4">
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              toast={toast}
              onRemove={removeToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;