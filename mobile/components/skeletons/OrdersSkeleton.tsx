import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonBase, SkeletonCircle, SkeletonCard } from './SkeletonBase';
import { SHADOWS } from '@/constants/design';

/**
 * 訂單頁面 Skeleton Loading 組件
 * 模擬訂單列表的結構
 */
export function OrdersSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header Skeleton */}
      <View
        className="pb-5 px-6 bg-white border-b border-gray-100"
        style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
      >
        {/* Title and Action Icons */}
        <View className="flex-row justify-between items-center mb-4">
          {/* 大標題 */}
          <SkeletonBase width={120} height={40} />
          
          {/* 三個功能按鈕 */}
          <View className="flex-row gap-3">
            <SkeletonCircle size={40} />
            <SkeletonCircle size={40} />
            <SkeletonCircle size={40} />
          </View>
        </View>

        {/* Status Filters - Chip 列表 */}
        <View className="flex-row gap-2">
          <SkeletonBase width={100} height={32} className="rounded-full" />
          <SkeletonBase width={100} height={32} className="rounded-full" />
        </View>
      </View>

      {/* Orders List Skeleton */}
      <ScrollView className="flex-1">
        <View className="py-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i}>
              {/* Header: 客戶名 + 狀態徽章 */}
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <SkeletonBase width="70%" height={24} className="mb-2" />
                  <SkeletonBase width="50%" height={16} />
                </View>
                <View className="flex-row gap-2">
                  <SkeletonBase width={50} height={24} className="rounded-full" />
                  <SkeletonBase width={50} height={24} className="rounded-full" />
                </View>
              </View>

              {/* 時間、配送方式和金額 */}
              <View className="flex-row justify-between items-center mb-4">
                <View className="gap-2">
                  <SkeletonBase width={120} height={28} className="rounded-lg" />
                  <SkeletonBase width={80} height={28} className="rounded-lg" />
                </View>
                <SkeletonBase width={80} height={36} />
              </View>

              {/* 完成按鈕 (只在前兩張卡片顯示，模擬 pending 狀態) */}
              {i <= 2 && (
                <View className="pt-4 border-t border-gray-100">
                  <SkeletonBase height={44} className="rounded-xl" />
                </View>
              )}
            </SkeletonCard>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

