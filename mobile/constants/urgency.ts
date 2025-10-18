/**
 * 緊急度相關配置
 */

import { UrgencyLevel } from '@/utils/timeHelpers';

export interface UrgencyConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  emoji: string;
  label: string;
}

export const URGENCY_CONFIG: Record<UrgencyLevel, UrgencyConfig> = {
  urgent: {
    color: '#EF4444',      // red-500
    bgColor: '#FEE2E2',    // red-100
    borderColor: '#EF4444', // red-500
    textColor: '#991B1B',  // red-800
    emoji: '🔴',
    label: '緊急',
  },
  soon: {
    color: '#F59E0B',      // amber-500
    bgColor: '#FEF3C7',    // amber-100
    borderColor: '#F59E0B', // amber-500
    textColor: '#92400E',  // amber-800
    emoji: '🟡',
    label: '即將',
  },
  normal: {
    color: '#10B981',      // green-500
    bgColor: '#D1FAE5',    // green-100
    borderColor: '#E5E7EB', // gray-200 (不強調)
    textColor: '#065F46',  // green-800
    emoji: '🟢',
    label: '正常',
  },
};

