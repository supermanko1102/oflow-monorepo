import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore, ToastType } from '@/hooks/useToast';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SHADOWS } from '@/constants/design';

interface ToastConfig {
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const TOAST_CONFIG: Record<ToastType, ToastConfig> = {
  success: { 
    icon: 'check-circle', 
    color: '#10B981', 
    bgColor: '#D1FAE5',
    borderColor: '#10B98140',
  },
  error: { 
    icon: 'alert-circle', 
    color: '#EF4444', 
    bgColor: '#FEE2E2',
    borderColor: '#EF444440',
  },
  warning: { 
    icon: 'alert', 
    color: '#F59E0B', 
    bgColor: '#FEF3C7',
    borderColor: '#F59E0B40',
  },
  info: { 
    icon: 'information', 
    color: '#3B82F6', 
    bgColor: '#DBEAFE',
    borderColor: '#3B82F640',
  },
};

interface ToastItemProps {
  id: string;
  type: ToastType;
  message: string;
  onDismiss: () => void;
}

function ToastItem({ id, type, message, onDismiss }: ToastItemProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // 彈性入場動畫
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // 3 秒後退場
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -30,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss());
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, translateYAnim, scaleAnim, onDismiss]);

  const config = TOAST_CONFIG[type];

  return (
    <Animated.View
      className="absolute left-6 right-6 rounded-2xl p-4 flex-row items-center z-50"
      style={{
        top: insets.top + 8,
        opacity: fadeAnim,
        transform: [
          { translateY: translateYAnim },
          { scale: scaleAnim },
        ],
        backgroundColor: config.bgColor,
        borderWidth: 1,
        borderColor: config.borderColor,
        ...SHADOWS.elevated,
      }}
    >
      <MaterialCommunityIcons 
        name={config.icon as any} 
        size={22} 
        color={config.color} 
        style={{ marginRight: 12 }}
      />
      <Text className="flex-1 text-sm font-bold" style={{ color: config.color }}>
        {message}
      </Text>
    </Animated.View>
  );
}

/**
 * Toast Container
 * 
 * 顯示所有活動的 toast 通知
 * 使用 Zustand 管理狀態，支援彈性動畫
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
