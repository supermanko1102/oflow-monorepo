import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { Chip } from 'react-native-paper';
import { OrderCard } from '@/components/OrderCard';
import { EmptyState } from '@/components/EmptyState';
import { mockOrders } from '@/data/mockOrders';
import { OrderStatus } from '@/types/order';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';

type FilterType = 'all' | OrderStatus;

export default function OrdersScreen() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();
  const haptics = useHaptics();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.light();
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setRefreshing(false);
    toast.success('訂單已更新');
  }, [haptics, toast]);

  const filteredOrders = filter === 'all' 
    ? mockOrders 
    : mockOrders.filter(order => order.status === filter);

  const pendingCount = mockOrders.filter(o => o.status === 'pending').length;
  const completedCount = mockOrders.filter(o => o.status === 'completed').length;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
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
        filter === 'all' ? (
          <EmptyState type="noOrders" />
        ) : filter === 'pending' ? (
          <EmptyState type="noPendingOrders" />
        ) : (
          <EmptyState type="noCompletedOrders" />
        )
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={({ item }) => <OrderCard order={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00B900"
              colors={['#00B900']}
            />
          }
        />
      )}
    </View>
  );
}

