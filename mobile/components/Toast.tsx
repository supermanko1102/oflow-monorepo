/**
 * Toast 通知組件
 * 顯示全局提示訊息
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useToastProvider, ToastConfig } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface ToastItemProps {
  toast: ToastConfig;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const translateY = React.useRef(new Animated.Value(-100)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 進場動畫
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // 離場動畫
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss(toast.id);
      });
    }, (toast.duration || 3000) - 250);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, translateY, opacity, onDismiss]);

  const config = getToastConfig(toast.type);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: config.bgColor, transform: [{ translateY }], opacity },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
        <MaterialCommunityIcons name={config.icon} size={20} color="#FFFFFF" />
      </View>
      <Text style={[styles.message, { color: config.textColor }]}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastProvider();

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </View>
  );
}

function getToastConfig(type: ToastConfig['type']) {
  const configs = {
    success: {
      icon: 'check-circle' as const,
      color: '#10B981',
      bgColor: '#D1FAE5',
      textColor: '#065F46',
    },
    error: {
      icon: 'close-circle' as const,
      color: '#EF4444',
      bgColor: '#FEE2E2',
      textColor: '#991B1B',
    },
    warning: {
      icon: 'alert-circle' as const,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      textColor: '#92400E',
    },
    info: {
      icon: 'information' as const,
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      textColor: '#1E40AF',
    },
  };
  return configs[type];
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    width: width - 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});

