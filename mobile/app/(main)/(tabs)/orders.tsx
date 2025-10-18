import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OrderCard } from '@/components/OrderCard';
import { EmptyState } from '@/components/EmptyState';
import { mockOrders } from '@/data/mockOrders';
import { OrderStatus } from '@/types/order';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { SHADOWS } from '@/constants/design';

type FilterType = 'all' | OrderStatus;

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
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
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB']}
        className="pb-5 px-6"
        style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
      >
        <Text className="text-3xl font-bold text-gray-900 mb-4">
          訂單管理
        </Text>
        
        {/* Filters */}
        <View className="flex-row gap-2">
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            textStyle={{ fontSize: 13, fontWeight: '600' }}
            selectedColor="#00B900"
            style={{ borderRadius: 20 }}
          >
            全部 ({mockOrders.length})
          </Chip>
          <Chip
            selected={filter === 'pending'}
            onPress={() => setFilter('pending')}
            textStyle={{ fontSize: 13, fontWeight: '600' }}
            selectedColor="#F59E0B"
            style={{ borderRadius: 20 }}
          >
            待處理 ({pendingCount})
          </Chip>
          <Chip
            selected={filter === 'completed'}
            onPress={() => setFilter('completed')}
            textStyle={{ fontSize: 13, fontWeight: '600' }}
            selectedColor="#10B981"
            style={{ borderRadius: 20 }}
          >
            已完成 ({completedCount})
          </Chip>
        </View>
      </LinearGradient>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        filter === 'all' ? (
          <EmptyState
            title="還沒有訂單"
            description="開始使用 LINE 或手動建立第一筆訂單"
          />
        ) : filter === 'pending' ? (
          <EmptyState
            title="沒有待處理訂單"
            description="所有訂單都已處理完成"
          />
        ) : (
          <EmptyState
            title="還沒有已完成訂單"
            description="完成訂單後會顯示在這裡"
          />
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

