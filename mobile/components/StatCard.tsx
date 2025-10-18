import React from 'react';
import { View, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { PackageIcon, CashIcon, ClockIcon } from '@/components/icons';
import { SHADOWS, GRADIENTS } from '@/constants/design';

interface StatCardProps {
  icon: 'package' | 'cash' | 'clock';
  label: string;
  value: string | number;
  color?: 'primary' | 'success' | 'warning' | 'info';
}

const COLOR_GRADIENTS = {
  primary: GRADIENTS.primary,
  success: GRADIENTS.success,
  warning: GRADIENTS.warning,
  info: GRADIENTS.info,
};

const ICON_COMPONENTS = {
  package: PackageIcon,
  cash: CashIcon,
  clock: ClockIcon,
};

export function StatCard({ icon, label, value, color = 'primary' }: StatCardProps) {
  const gradientColors = COLOR_GRADIENTS[color];
  const IconComponent = ICON_COMPONENTS[icon];

  return (
    <Card className="flex-1 min-w-[100px] overflow-hidden" style={SHADOWS.card}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-4"
      >
        {/* Icon Container */}
        <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mb-3">
          <IconComponent size={24} color="#FFFFFF" />
        </View>

        {/* Value */}
        <Text className="text-3xl font-bold text-white mb-1">
          {value}
        </Text>

        {/* Label */}
        <Text className="text-sm text-white/80">
          {label}
        </Text>
      </LinearGradient>
    </Card>
  );
}
