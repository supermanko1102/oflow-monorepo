import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SectionHeaderProps {
  iconName: string;
  title: string;
  iconColor?: string;
  iconSize?: number;
  action?: ReactNode;
}

/**
 * SectionHeader 組件
 * 
 * 統一的區塊標題樣式，使用 MaterialCommunityIcons
 */
export function SectionHeader({
  iconName,
  title,
  iconColor = '#00B900',
  iconSize = 24,
  action,
}: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-row items-center">
        <MaterialCommunityIcons
          name={iconName as any}
          size={iconSize}
          color={iconColor}
          style={{ marginRight: 8 }}
        />
        <Text className="text-lg font-bold text-gray-900">
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}

