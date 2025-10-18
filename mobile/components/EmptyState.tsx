import React from 'react';
import { View, Text } from 'react-native';
import { Button } from 'react-native-paper';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * EmptyState 組件（精簡版）
 * 
 * 移除了裝飾性 emoji/icon，使用純文字更簡潔專業
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 justify-center items-center py-16 px-6">
      {/* Title */}
      <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
        {title}
      </Text>

      {/* Description */}
      {description && (
        <Text className="text-base text-gray-600 text-center mb-8 max-w-sm">
          {description}
        </Text>
      )}

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button
          mode="contained"
          onPress={onAction}
          buttonColor="#00B900"
          contentStyle={{ paddingVertical: 8, paddingHorizontal: 24 }}
          style={{ borderRadius: 12 }}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
