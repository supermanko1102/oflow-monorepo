import React from 'react';
import { View, Text } from 'react-native';

type StatusType = 'pending' | 'processing' | 'completed' | 'cancelled';
type SourceType = 'line' | 'manual' | 'web';

interface StatusBadgeProps {
  type: 'status' | 'source';
  value: StatusType | SourceType;
}

const STATUS_CONFIG = {
  pending: { 
    label: '待處理', 
    bgColor: '#FEF3C7', 
    textColor: '#D97706',
    borderColor: '#F59E0B20',
  },
  processing: { 
    label: '處理中', 
    bgColor: '#DBEAFE', 
    textColor: '#1D4ED8',
    borderColor: '#3B82F620',
  },
  completed: { 
    label: '已完成', 
    bgColor: '#D1FAE5', 
    textColor: '#047857',
    borderColor: '#10B98120',
  },
  cancelled: { 
    label: '已取消', 
    bgColor: '#FEE2E2', 
    textColor: '#DC2626',
    borderColor: '#EF444420',
  },
};

const SOURCE_CONFIG = {
  line: { 
    label: 'LINE', 
    bgColor: '#DCFCE7', 
    textColor: '#00B900',
    borderColor: '#00B90020',
  },
  manual: { 
    label: '手動', 
    bgColor: '#F5F5F5', 
    textColor: '#525252',
    borderColor: '#A3A3A320',
  },
  web: { 
    label: '網站', 
    bgColor: '#EFF6FF', 
    textColor: '#1D4ED8',
    borderColor: '#3B82F620',
  },
};

export function StatusBadge({ type, value }: StatusBadgeProps) {
  const config = type === 'status' 
    ? STATUS_CONFIG[value as StatusType]
    : SOURCE_CONFIG[value as SourceType];

  if (!config) return null;

  return (
    <View 
      className="px-3 py-1.5 rounded-lg"
      style={{ 
        backgroundColor: config.bgColor,
        borderWidth: 1,
        borderColor: config.borderColor,
      }}
    >
      <Text 
        className="text-xs font-bold"
        style={{ color: config.textColor }}
      >
        {config.label}
      </Text>
    </View>
  );
}
