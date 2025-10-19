import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Order } from '@/types/order';
import { TodoOrderItem } from './TodoOrderItem';
import { EmptyState } from './EmptyState';

interface TodayTodoListProps {
  pendingOrders: Order[];
  completedOrders: Order[];
  onToggleComplete: (orderId: string) => void;
}

export function TodayTodoList({ 
  pendingOrders, 
  completedOrders,
  onToggleComplete 
}: TodayTodoListProps) {
  const [showCompleted, setShowCompleted] = useState(true);

  // 如果沒有任何訂單
  if (pendingOrders.length === 0 && completedOrders.length === 0) {
    return (
      <EmptyState
        title="今天沒有訂單"
        description="好好休息一下，準備迎接下一個忙碌的日子！"
      />
    );
  }

  return (
    <View>
      {/* 待處理訂單 */}
      {pendingOrders.length > 0 && (
        <View>
          <View className="px-4 py-3 bg-gray-100">
            <Text className="text-sm font-semibold text-gray-700">
              待處理 ({pendingOrders.length})
            </Text>
          </View>

          {pendingOrders.map((order) => (
            <TodoOrderItem
              key={order.id}
              order={order}
              isCompleted={false}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </View>
      )}

      {/* 已完成訂單（可摺疊） */}
      {completedOrders.length > 0 && (
        <View>
          <TouchableOpacity
            onPress={() => setShowCompleted(!showCompleted)}
            className="px-4 py-3 bg-gray-100 flex-row items-center justify-between"
            activeOpacity={0.7}
          >
            <Text className="text-sm font-semibold text-gray-700">
              已完成 ({completedOrders.length})
            </Text>
            <MaterialCommunityIcons
              name={showCompleted ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>

          {showCompleted && completedOrders.map((order) => (
            <TodoOrderItem
              key={order.id}
              order={order}
              isCompleted={true}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </View>
      )}

      {/* 全部完成訊息 */}
      {pendingOrders.length === 0 && completedOrders.length > 0 && (
        <View className="mx-4 mt-4 mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color="#00B900"
            />
            <Text className="ml-2 text-base font-semibold text-gray-900">
              今天的訂單都完成了
            </Text>
          </View>
          <Text className="mt-2 text-sm text-gray-600">
            總共完成 {completedOrders.length} 筆訂單
          </Text>
        </View>
      )}
    </View>
  );
}

