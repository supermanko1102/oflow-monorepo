import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Chip } from 'react-native-paper';
import { OrderCard } from '@/components/OrderCard';
import { EmptyState } from '@/components/EmptyState';
import { mockOrders } from '@/data/mockOrders';
import { OrderStatus } from '@/types/order';

type FilterType = 'all' | OrderStatus;

export default function OrdersScreen() {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredOrders = filter === 'all' 
    ? mockOrders 
    : mockOrders.filter(order => order.status === filter);

  const pendingCount = mockOrders.filter(o => o.status === 'pending').length;
  const completedCount = mockOrders.filter(o => o.status === 'completed').length;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 pt-12 pb-4 px-4 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          訂單管理
        </Text>
        
        {/* Filters */}
        <View className="flex-row gap-2">
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            textStyle={{ fontSize: 12 }}
          >
            全部 ({mockOrders.length})
          </Chip>
          <Chip
            selected={filter === 'pending'}
            onPress={() => setFilter('pending')}
            textStyle={{ fontSize: 12 }}
          >
            待處理 ({pendingCount})
          </Chip>
          <Chip
            selected={filter === 'completed'}
            onPress={() => setFilter('completed')}
            textStyle={{ fontSize: 12 }}
          >
            已完成 ({completedCount})
          </Chip>
        </View>
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="沒有訂單"
          description={`目前沒有${filter === 'pending' ? '待處理' : filter === 'completed' ? '已完成' : ''}訂單`}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={({ item }) => <OrderCard order={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16 }}
        />
      )}
    </View>
  );
}

