import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from "@/components/native/Card";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Order, PaymentMethod } from '@/types/order';
import { StatusBadge } from './StatusBadge';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { useHaptics } from '@/hooks/useHaptics';

interface TodoOrderItemProps {
  order: Order;
  isCompleted: boolean;
  onToggleComplete: (orderId: string, paymentMethod?: PaymentMethod) => void;
}

export function TodoOrderItem({ 
  order, 
  isCompleted, 
  onToggleComplete 
}: TodoOrderItemProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);

  const handleCheckboxPress = () => {
    haptics.light();
    
    // 如果是要標記為完成，顯示付款方式選擇器
    if (!isCompleted) {
      setShowPaymentSelector(true);
    } else {
      // 如果是要取消完成，直接執行
      onToggleComplete(order.id);
    }
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    onToggleComplete(order.id, method);
  };

  const handleCardPress = () => {
    haptics.light();
    router.push(`/order/${order.id}`);
  };

  // 取得訂單項目摘要
  const getItemsSummary = () => {
    if (order.items.length === 1) {
      const item = order.items[0];
      return `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`;
    }
    return `${order.items[0].name} 等 ${order.items.length} 項`;
  };

  return (
    <>
      <Card 
        className={`mx-4 mb-3 ${isCompleted ? 'bg-gray-50' : 'bg-white'}`}
      >
        <View className="flex-row items-center p-4">
          {/* 勾選框 */}
          <TouchableOpacity
            onPress={handleCheckboxPress}
            className="w-6 h-6 rounded border-2 items-center justify-center mr-3"
            style={{
              borderColor: isCompleted ? '#00B900' : '#D1D5DB',
              backgroundColor: isCompleted ? '#00B900' : 'transparent',
            }}
          >
            {isCompleted && (
              <MaterialCommunityIcons name="check" size={16} color="white" />
            )}
          </TouchableOpacity>

          {/* 訂單內容 */}
          <TouchableOpacity 
            onPress={handleCardPress}
            className="flex-1 ml-2"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between mb-2">
              {/* 時間 + 客戶名稱 */}
              <View className="flex-row items-center flex-1">
                <MaterialCommunityIcons 
                  name="clock-outline" 
                  size={16} 
                  color={isCompleted ? '#9CA3AF' : '#00B900'}
                />
                <Text 
                  className={`ml-1 font-bold ${
                    isCompleted ? 'text-gray-400' : 'text-gray-900'
                  }`}
                >
                  {order.pickupTime}
                </Text>
                <Text 
                  className={`ml-2 text-base font-semibold ${
                    isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'
                  }`}
                >
                  {order.customerName}
                </Text>
              </View>

              {/* 來源標籤 */}
              <StatusBadge 
                type="source" 
                value={order.source} 
              />
            </View>

            {/* 訂單項目 */}
            <Text 
              className={`text-sm mb-2 ${
                isCompleted ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {getItemsSummary()}
            </Text>

            {/* 金額 */}
            <View className="flex-row items-center justify-between">
              <Text 
                className={`text-base font-bold ${
                  isCompleted ? 'text-gray-400' : 'text-line-green'
                }`}
              >
                ${order.totalAmount}
              </Text>

              {/* 查看詳情提示 */}
              <View className="flex-row items-center">
                <Text className="text-xs text-gray-400 mr-1">
                  查看詳情
                </Text>
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={16} 
                  color="#9CA3AF" 
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </Card>

      {/* 付款方式選擇器 */}
      <PaymentMethodSelector
        visible={showPaymentSelector}
        onClose={() => setShowPaymentSelector(false)}
        onSelect={handlePaymentMethodSelect}
        title="選擇付款方式"
      />
    </>
  );
}

