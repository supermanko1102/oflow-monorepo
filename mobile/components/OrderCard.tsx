import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Card, IconButton } from 'react-native-paper';
import { Order } from '@/types/order';
import { StatusBadge } from './StatusBadge';
import { useRouter } from 'expo-router';
import { 
  getUrgencyLevel, 
  formatRelativeTime, 
  getUrgencyEmoji 
} from '@/utils/timeHelpers';
import { URGENCY_CONFIG } from '@/constants/urgency';
import { useHaptics } from '@/hooks/useHaptics';
import { useToast } from '@/hooks/useToast';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { isWithinBusinessHours } from '@/utils/scheduleHelpers';

interface OrderCardProps {
  order: Order;
  onComplete?: (orderId: string) => void;
}

export function OrderCard({ order, onComplete }: OrderCardProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const toast = useToast();
  const schedule = useScheduleStore((state) => state.schedule);
  
  const urgencyLevel = getUrgencyLevel(order.pickupDate);
  const urgencyConfig = URGENCY_CONFIG[urgencyLevel];
  const relativeTime = formatRelativeTime(order.pickupDate, order.pickupTime);
  const urgencyEmoji = getUrgencyEmoji(urgencyLevel);

  // 檢查訂單是否在營業時間內
  const isWithinHours = schedule ? isWithinBusinessHours(order.pickupDate, order.pickupTime, schedule) : true;

  const itemsSummary = order.items.length === 1 
    ? order.items[0].name 
    : `${order.items[0].name} 等 ${order.items.length} 項`;

  const handleCardPress = () => {
    haptics.light();
    router.push(`/(main)/order/${order.id}`);
  };

  const handleComplete = (e: any) => {
    e.stopPropagation();
    haptics.success();
    toast.success('訂單已標記為完成 ✅');
    onComplete?.(order.id);
  };

  const handleCall = (e: any) => {
    e.stopPropagation();
    haptics.light();
    if (order.customerPhone) {
      Linking.openURL(`tel:${order.customerPhone}`);
      toast.info('已撥打電話');
    } else {
      toast.warning('沒有客戶電話');
    }
  };

  const handleMessage = (e: any) => {
    e.stopPropagation();
    haptics.light();
    if (order.customerPhone) {
      Linking.openURL(`sms:${order.customerPhone}`);
      toast.info('已開啟簡訊');
    } else {
      toast.warning('沒有客戶電話');
    }
  };

  // 根據緊急程度決定邊框樣式
  const borderStyle = urgencyLevel === 'urgent' 
    ? { borderLeftWidth: 4, borderLeftColor: urgencyConfig.color }
    : {};

  return (
    <TouchableOpacity 
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      <Card style={[styles.card, borderStyle]} className="mb-3 mx-4">
        <Card.Content className="p-4">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 mb-1">
                {order.customerName}
              </Text>
              <Text className="text-sm text-gray-600">
                {itemsSummary}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <StatusBadge type="source" value={order.source} />
              <StatusBadge type="status" value={order.status} />
            </View>
          </View>

          {/* 非營業時間警告 */}
          {!isWithinHours && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>⚠️ 非營業時間</Text>
            </View>
          )}
          
          {/* Time and Amount */}
          <View className="flex-row justify-between items-center mb-3">
            <View 
              className="flex-row items-center px-3 py-1 rounded-full"
              style={{ backgroundColor: urgencyConfig.bgColor }}
            >
              <Text className="text-base mr-1">{urgencyEmoji}</Text>
              <Text 
                className="text-sm font-medium"
                style={{ color: urgencyConfig.textColor }}
              >
                {relativeTime}
              </Text>
            </View>
            <Text className="text-lg font-bold text-line-green">
              ${order.totalAmount}
            </Text>
          </View>

          {/* Quick Actions */}
          {order.status === 'pending' && (
            <View className="flex-row gap-2 pt-2 border-t border-gray-100">
              <IconButton
                icon="check-circle"
                size={20}
                iconColor="#10B981"
                onPress={handleComplete}
                style={styles.quickAction}
              />
              <IconButton
                icon="phone"
                size={20}
                iconColor="#3B82F6"
                onPress={handleCall}
                style={styles.quickAction}
                disabled={!order.customerPhone}
              />
              <IconButton
                icon="message-text"
                size={20}
                iconColor="#8B5CF6"
                onPress={handleMessage}
                style={styles.quickAction}
                disabled={!order.customerPhone}
              />
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
  },
  quickAction: {
    margin: 0,
    backgroundColor: '#F3F4F6',
  },
  warningBanner: {
    backgroundColor: '#FFFBEB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
  },
});

