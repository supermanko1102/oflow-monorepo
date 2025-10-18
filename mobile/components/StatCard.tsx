import React from 'react';
import { View, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { PackageIcon, CashIcon, ClockIcon } from '@/components/icons';
import { SHADOWS } from '@/constants/design';

interface StatCardProps {
  icon: 'package' | 'cash' | 'clock';
  label: string;
  value: string | number;
  color?: 'primary' | 'success' | 'warning' | 'info';
}

const ICON_COLORS = {
  primary: '#00B900',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
};

const ICON_COMPONENTS = {
  package: PackageIcon,
  cash: CashIcon,
  clock: ClockIcon,
};

/**
 * StatCard 組件 - 極簡風格
 * 
 * 設計原則：
 * - 白色卡片背景
 * - 單色 icon（不用漸層）
 * - 灰黑色文字
 * - 與 Settings 頁面風格一致
 */
export function StatCard({ icon, label, value, color = 'primary' }: StatCardProps) {
  const IconComponent = ICON_COMPONENTS[icon];
  const iconColor = ICON_COLORS[color];

  return (
    <Card className="flex-1 bg-white" style={SHADOWS.card}>
      <Card.Content className="p-4">
        {/* Icon */}
        <View className="mb-3">
          <IconComponent size={24} color={iconColor} />
        </View>

        {/* Value */}
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          {value}
        </Text>

        {/* Label */}
        <Text className="text-sm text-gray-600">
          {label}
        </Text>
      </Card.Content>
    </Card>
  );
}
