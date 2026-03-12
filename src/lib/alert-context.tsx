'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertDialog {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
}

interface AlertContextType {
  showAlertDialog: (options: {
    title: string;
    message: string;
    type?: AlertType;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => void;
  showConfirm: (options: {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<AlertDialog[]>([]);

  const showAlertDialog = useCallback((options: {
    title: string;
    message: string;
    type?: AlertType;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => {
    const id = Math.random().toString(36).substring(7);
    const newAlert: AlertDialog = {
      id,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      showCancel: options.onCancel !== undefined,
      confirmText: options.confirmText || (options.onCancel !== undefined ? '确认' : '确定'),
      cancelText: options.cancelText || '取消',
      onConfirm: () => {
        options.onConfirm?.();
        setAlerts(prev => prev.filter(alert => alert.id !== id));
      },
      onCancel: () => {
        options.onCancel?.();
        setAlerts(prev => prev.filter(alert => alert.id !== id));
      },
    };
    setAlerts(prev => [...prev, newAlert]);
  }, []);

  const showConfirm = useCallback((options: {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => {
    showAlertDialog({
      title: options.title,
      message: options.message,
      type: 'warning',
      confirmText: '确定',
      cancelText: '取消',
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  }, [showAlertDialog]);

  const showSuccess = useCallback((message: string, title = '成功') => {
    showAlertDialog({
      title,
      message,
      type: 'success',
      confirmText: '确定',
    });
  }, [showAlertDialog]);

  const showError = useCallback((message: string, title = '错误') => {
    showAlertDialog({
      title,
      message,
      type: 'error',
      confirmText: '确定',
    });
  }, [showAlertDialog]);

  const showInfo = useCallback((message: string, title = '提示') => {
    showAlertDialog({
      title,
      message,
      type: 'info',
      confirmText: '确定',
    });
  }, [showAlertDialog]);

  const showWarning = useCallback((message: string, title = '警告') => {
    showAlertDialog({
      title,
      message,
      type: 'warning',
      confirmText: '确定',
    });
  }, [showAlertDialog]);

  return (
    <AlertContext.Provider value={{
      showAlertDialog,
      showConfirm,
      showSuccess,
      showError,
      showInfo,
      showWarning,
    }}>
      {children}
      {alerts.map(alert => (
        <AlertDialogComponent key={alert.id} alert={alert} />
      ))}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

function AlertDialogComponent({ alert }: { alert: AlertDialog }) {
  const getIcon = () => {
    switch (alert.type) {
      case 'success':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={alert.onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all">
        {getIcon()}

        <div className="px-6 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            {alert.title}
          </h3>
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            {alert.message}
          </p>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {alert.showCancel && (
            <button
              type="button"
              onClick={alert.onCancel}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              {alert.cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={alert.onConfirm}
            className={`w-full sm:w-auto px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              alert.type === 'error' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
              alert.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' :
              alert.type === 'success' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
              'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {alert.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
