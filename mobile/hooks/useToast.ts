/**
 * Toast Hook
 * 提供全局 Toast 通知功能
 */

import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastConfig {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// 全局 toast 狀態管理
let toastCallbacks: ((config: ToastConfig) => void)[] = [];
let dismissCallbacks: ((id: string) => void)[] = [];

export function useToast() {
  const show = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = Date.now().toString();
    const config: ToastConfig = { id, type, message, duration };
    
    // 通知所有監聽者
    toastCallbacks.forEach(callback => callback(config));
    
    // 自動消失
    if (duration > 0) {
      setTimeout(() => {
        dismissCallbacks.forEach(callback => callback(id));
      }, duration);
    }
    
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    dismissCallbacks.forEach(callback => callback(id));
  }, []);

  return {
    success: (message: string, duration?: number) => show('success', message, duration),
    error: (message: string, duration?: number) => show('error', message, duration),
    info: (message: string, duration?: number) => show('info', message, duration),
    warning: (message: string, duration?: number) => show('warning', message, duration),
    dismiss,
  };
}

// Toast Provider 使用的內部 hook
export function useToastProvider() {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const addToast = useCallback((config: ToastConfig) => {
    setToasts(prev => [...prev, config]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // 註冊全局回調
  useState(() => {
    toastCallbacks.push(addToast);
    dismissCallbacks.push(removeToast);

    return () => {
      toastCallbacks = toastCallbacks.filter(cb => cb !== addToast);
      dismissCallbacks = dismissCallbacks.filter(cb => cb !== removeToast);
    };
  });

  return { toasts, removeToast };
}

