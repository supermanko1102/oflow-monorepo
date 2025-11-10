/**
 * Status Badge 組件 - 極簡風格
 * 與設置頁面風格一致：灰色背景 + 灰色文字
 * 只有 AI 自動來源使用品牌色
 */

import React from 'react';
import { View, Text } from 'react-native';
import type { OrderStatus, OrderSource } from '@/types/order';

interface StatusBadgeProps {
  type: 'status' | 'source';
  value: OrderStatus | OrderSource;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; bgColor?: string; textColor?: string; borderColor?: string }> = {
  pending: { label: '待付款' },
  paid: { 
    label: '已付款',
    bgColor: '#DBEAFE',
    textColor: '#2563EB',
    borderColor: '#2563EB20',
  },
  confirmed: { label: '已確認' },
  completed: { label: '已完成' },
  cancelled: { label: '已取消' },
};

const SOURCE_CONFIG: Record<OrderSource, { 
  label: string;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
}> = {
  auto: { 
    label: 'AI 自動', 
    // AI 自動使用品牌色
    bgColor: '#DCFCE7', 
    textColor: '#00B900',
    borderColor: '#00B90020',
  },
  'semi-auto': { 
    label: 'AI 輔助',
    bgColor: '#FEF3C7',
    textColor: '#D97706',
    borderColor: '#D9770620',
  },
  manual: { label: '手動' },
};

export function StatusBadge({ type, value }: StatusBadgeProps) {
  if (type === 'status') {
    const config = STATUS_CONFIG[value as OrderStatus];
    if (!config) return null;

    // paid 狀態使用藍色
    if (value === 'paid') {
      return (
        <View 
          className="px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: config.bgColor, borderWidth: 1, borderColor: config.borderColor }}
        >
          <Text className="text-xs font-bold" style={{ color: config.textColor }}>
            {config.label}
          </Text>
        </View>
      );
    }

    // 其他狀態統一使用灰色風格
    return (
      <View className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200">
        <Text className="text-xs font-semibold text-gray-700">
          {config.label}
        </Text>
      </View>
    );
  }

  // 來源類型
  const config = SOURCE_CONFIG[value as OrderSource];
  if (!config) return null;

  // auto (AI 自動) 使用綠色品牌色
  if (value === 'auto') {
    return (
      <View 
        className="px-3 py-1.5 rounded-lg"
        style={{ backgroundColor: config.bgColor, borderWidth: 1, borderColor: config.borderColor }}
      >
        <Text className="text-xs font-bold" style={{ color: config.textColor }}>
          {config.label}
        </Text>
      </View>
    );
  }

  // semi-auto (AI 輔助) 使用黃色
  if (value === 'semi-auto') {
    return (
      <View 
        className="px-3 py-1.5 rounded-lg"
        style={{ backgroundColor: config.bgColor, borderWidth: 1, borderColor: config.borderColor }}
      >
        <Text className="text-xs font-bold" style={{ color: config.textColor }}>
          {config.label}
        </Text>
      </View>
    );
  }

  // manual 使用灰色
  return (
    <View className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200">
      <Text className="text-xs font-semibold text-gray-700">
        {config.label}
      </Text>
    </View>
  );
}
