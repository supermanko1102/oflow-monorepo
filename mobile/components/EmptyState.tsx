import React from 'react';
import { View, Text } from 'react-native';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
}

export function EmptyState({ icon = '📭', title, description }: EmptyStateProps) {
  return (
    <View className="flex-1 justify-center items-center p-8">
      <Text className="text-6xl mb-4">{icon}</Text>
      <Text className="text-xl font-semibold text-gray-800 mb-2 text-center">
        {title}
      </Text>
      {description && (
        <Text className="text-sm text-gray-600 text-center">
          {description}
        </Text>
      )}
    </View>
  );
}

