import React from 'react';
import { View, Text } from 'react-native';
import { Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { EMPTY_STATES, EmptyStateType } from '@/constants/emptyStates';
import { useHaptics } from '@/hooks/useHaptics';

interface EmptyStateProps {
  // 使用預設配置
  type?: EmptyStateType;
  // 或自訂內容
  icon?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionRoute?: string;
}

export function EmptyState({ 
  type,
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionRoute,
}: EmptyStateProps) {
  const router = useRouter();
  const haptics = useHaptics();

  // 如果提供了 type，使用預設配置
  const config = type ? EMPTY_STATES[type] : null;
  
  const finalIcon = icon || config?.icon || '📭';
  const finalTitle = title || config?.title || '';
  const finalDescription = description || config?.description;
  const finalActionLabel = actionLabel || config?.actionLabel;
  const finalActionRoute = actionRoute || config?.actionRoute;

  const handleAction = () => {
    haptics.light();
    if (onAction) {
      onAction();
    } else if (finalActionRoute) {
      router.push(finalActionRoute as any);
    }
  };

  return (
    <View className="flex-1 justify-center items-center p-8">
      <Text className="text-6xl mb-4">{finalIcon}</Text>
      <Text className="text-xl font-semibold text-gray-800 mb-2 text-center">
        {finalTitle}
      </Text>
      {finalDescription && (
        <Text className="text-sm text-gray-600 text-center mb-6">
          {finalDescription}
        </Text>
      )}
      {finalActionLabel && (onAction || finalActionRoute) && (
        <Button
          mode="contained"
          onPress={handleAction}
          buttonColor="#00B900"
          style={{ paddingHorizontal: 16 }}
        >
          {finalActionLabel}
        </Button>
      )}
    </View>
  );
}

