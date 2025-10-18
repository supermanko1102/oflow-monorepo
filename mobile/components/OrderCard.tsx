import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import { SHADOWS } from '@/constants/design';

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

  return (
    <TouchableOpacity 
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      <Card 
        className="mb-4 mx-4 bg-white overflow-hidden" 
        style={[
          SHADOWS.card,
          {
            borderLeftWidth: 4,
            borderLeftColor: urgencyLevel === 'urgent' ? urgencyConfig.color : 'transparent',
          }
        ]}
      >
        <Card.Content className="p-5">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900 mb-1">
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
            <View className="bg-warning-light py-2 px-3 rounded-xl mb-3 border border-warning/20">
              <Text className="text-xs font-bold text-warning-dark text-center">
                ⚠️ 非營業時間
              </Text>
            </View>
          )}
          
          {/* Time and Amount */}
          <View className="flex-row justify-between items-center mb-4">
            <View 
              className="flex-row items-center px-4 py-2 rounded-full"
              style={{ backgroundColor: urgencyConfig.bgColor }}
            >
              <Text className="text-lg mr-1.5">{urgencyEmoji}</Text>
              <Text 
                className="text-sm font-bold"
                style={{ color: urgencyConfig.textColor }}
              >
                {relativeTime}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-primary-500">
              ${order.totalAmount}
            </Text>
          </View>

          {/* Quick Actions */}
          {order.status === 'pending' && (
            <View className="flex-row gap-3 pt-4 border-t border-neutral-100">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-success-light py-3 rounded-xl"
                onPress={handleComplete}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
                <Text className="ml-2 text-sm font-bold text-success">完成</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="w-12 h-12 items-center justify-center bg-info-light rounded-xl"
                onPress={handleCall}
                disabled={!order.customerPhone}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="phone" size={20} color="#3B82F6" />
              </TouchableOpacity>
              
              <TouchableOpacity
                className="w-12 h-12 items-center justify-center bg-purple-100 rounded-xl"
                onPress={handleMessage}
                disabled={!order.customerPhone}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="message-text" size={20} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}
