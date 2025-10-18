import React from 'react';
import { View, Text } from 'react-native';
import { OrderSource, OrderStatus } from '@/types/order';

interface StatusBadgeProps {
  type: 'source' | 'status';
  value: OrderSource | OrderStatus;
}

export function StatusBadge({ type, value }: StatusBadgeProps) {
  const getSourceStyle = (source: OrderSource) => {
    switch (source) {
      case 'auto':
        return 'bg-blue-100 dark:bg-blue-900';
      case 'semi-auto':
        return 'bg-purple-100 dark:bg-purple-900';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const getSourceText = (source: OrderSource) => {
    switch (source) {
      case 'auto':
        return '全自動';
      case 'semi-auto':
        return '半自動';
      default:
        return '';
    }
  };

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 dark:bg-orange-900';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return '待處理';
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return '';
    }
  };

  const style = type === 'source' ? getSourceStyle(value as OrderSource) : getStatusStyle(value as OrderStatus);
  const text = type === 'source' ? getSourceText(value as OrderSource) : getStatusText(value as OrderStatus);

  return (
    <View className={`px-2 py-1 rounded-full ${style}`}>
      <Text className="text-xs font-medium dark:text-white">{text}</Text>
    </View>
  );
}

