import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '@/components/ui/Toast';

interface ToastConfig {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  showToast: (config: ToastConfig) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<(ToastConfig & { visible: boolean }) | null>(null);

  const showToast = useCallback((config: ToastConfig) => {
    setToast({ ...config, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          action={toast.action}
          onHide={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
};