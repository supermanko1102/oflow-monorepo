import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = '載入中...' }: LoadingStateProps) {
  return (
    <View className="flex-1 justify-center items-center bg-gray-50">
      <ActivityIndicator size="large" color="#00B900" />
      <Text className="mt-4 text-base text-gray-700">{message}</Text>
    </View>
  );
}
