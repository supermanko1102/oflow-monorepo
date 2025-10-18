import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';
import { useToastStore, ToastType } from '@/hooks/useToast';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ToastConfig {
  icon: string;
  color: string;
  bgColor: string;
}

const TOAST_CONFIG: Record<ToastType, ToastConfig> = {
  success: { icon: 'check-circle', color: '#10B981', bgColor: '#ECFDF5' },
  error: { icon: 'alert-circle', color: '#EF4444', bgColor: '#FEF2F2' },
  warning: { icon: 'alert', color: '#F59E0B', bgColor: '#FFFBEB' },
  info: { icon: 'information', color: '#3B82F6', bgColor: '#EFF6FF' },
};

interface ToastItemProps {
  id: string;
  type: ToastType;
  message: string;
  onDismiss: () => void;
}

function ToastItem({ id, type, message, onDismiss }: ToastItemProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    // 入場動畫
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // 3 秒後退場
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss());
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, translateYAnim, onDismiss]);

  const config = TOAST_CONFIG[type];

  return (
    <Animated.View
      className="absolute top-14 left-5 right-5 rounded-lg p-3 flex-row items-center shadow-lg z-50"
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: translateYAnim }],
        backgroundColor: config.bgColor,
      }}
    >
      <MaterialCommunityIcons 
        name={config.icon as any} 
        size={20} 
        color={config.color} 
        className="mr-2"
      />
      <Text className="flex-1 text-sm font-semibold" style={{ color: config.color }}>
        {message}
      </Text>
    </Animated.View>
  );
}

/**
 * Toast Container
 * 
 * 顯示所有活動的 toast 通知
 * 使用 Zustand 管理狀態
 */
export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const hide = useToastStore((state) => state.hide);

  return (
    <>
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          onDismiss={() => hide(toast.id)}
        />
      ))}
    </>
  );
}
