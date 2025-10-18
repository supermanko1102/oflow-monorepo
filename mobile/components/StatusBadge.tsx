/**
 * Status Badge 組件 - 極簡風格
 * 與設置頁面風格一致：灰色背景 + 灰色文字
 * 只有 LINE 來源使用品牌色
 */

import React from 'react';
import { View, Text } from 'react-native';

type StatusType = 'pending' | 'processing' | 'completed' | 'cancelled';
type SourceType = 'line' | 'manual' | 'web';

interface StatusBadgeProps {
  type: 'status' | 'source';
  value: StatusType | SourceType;
}

const STATUS_CONFIG = {
  pending: { label: '待處理' },
  processing: { label: '處理中' },
  completed: { label: '已完成' },
  cancelled: { label: '已取消' },
};

const SOURCE_CONFIG = {
  line: { 
    label: 'LINE', 
    // LINE 使用品牌色
    bgColor: '#DCFCE7', 
    textColor: '#00B900',
    borderColor: '#00B90020',
  },
  manual: { label: '手動' },
  web: { label: '網站' },
};

export function StatusBadge({ type, value }: StatusBadgeProps) {
  if (type === 'status') {
    const config = STATUS_CONFIG[value as StatusType];
    if (!config) return null;

    // 狀態統一使用灰色風格
    return (
      <View className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200">
        <Text className="text-xs font-semibold text-gray-700">
          {config.label}
        </Text>
      </View>
    );
  }

  // 來源類型
  const config = SOURCE_CONFIG[value as SourceType];
  if (!config) return null;

  // LINE 使用品牌色，其他使用灰色
  if (value === 'line') {
    return (
      <View 
        className="px-3 py-1.5 rounded-lg"
      >
        <Text className="text-xs font-bold" >
          {config.label}
        </Text>
      </View>
    );
  }

  // manual 和 web 使用灰色
  return (
    <View className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200">
      <Text className="text-xs font-semibold text-gray-700">
        {config.label}
      </Text>
    </View>
  );
}
