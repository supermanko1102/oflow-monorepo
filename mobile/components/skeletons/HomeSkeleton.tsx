import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonBase, SkeletonCircle, SkeletonCard } from './SkeletonBase';
import { SHADOWS } from '@/constants/design';

/**
 * 首頁 Skeleton Loading 組件
 * 模擬 TodaySummaryCard 和 TodayTodoList 的結構
 */
export function HomeSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header Skeleton */}
      <View
        className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-100"
        style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
      >
        {/* 時間選擇器 Skeleton */}
        <SkeletonBase width={100} height={36} className="rounded-lg" />
        
        {/* 通知按鈕 Skeleton */}
        <SkeletonCircle size={24} />
      </View>

      <ScrollView className="flex-1">
        {/* TodaySummaryCard Skeleton */}
        <SkeletonCard className="mt-4 mb-3">
          {/* 標題 */}
          <View className="mb-3 items-center">
            <SkeletonBase width={120} height={16} />
          </View>

          <View className="flex-row justify-between items-center">
            {/* 訂單數量 */}
            <View className="flex-1 items-center">
              <SkeletonCircle size={28} />
              <SkeletonBase width={60} height={28} className="mt-2" />
              <SkeletonBase width={40} height={12} className="mt-1" />
            </View>

            {/* 分隔線 */}
            <View className="w-px h-16 bg-gray-200" />

            {/* 總營收 */}
            <View className="flex-1 items-center">
              <SkeletonCircle size={28} />
              <SkeletonBase width={80} height={28} className="mt-2" />
              <SkeletonBase width={40} height={12} className="mt-1" />
            </View>
          </View>

          {/* 付款方式統計 */}
          <View className="mt-4 pt-4 border-t border-gray-200">
            <View className="items-center mb-2">
              <SkeletonBase width={80} height={12} />
            </View>
            <View className="flex-row justify-around">
              {[1, 2, 3].map((i) => (
                <View key={i} className="items-center">
                  <SkeletonBase width={50} height={12} />
                  <SkeletonBase width={60} height={16} className="mt-1" />
                </View>
              ))}
            </View>
          </View>
        </SkeletonCard>

        {/* TodayTodoList Section Title Skeleton */}
        <View className="px-4 mb-3">
          <SkeletonBase width={120} height={20} />
        </View>

        {/* Order Cards Skeleton */}
        {[1, 2, 3].map((i) => (
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

            {/* 時間和配送方式 */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="gap-2">
                <SkeletonBase width={120} height={28} className="rounded-lg" />
                <SkeletonBase width={80} height={28} className="rounded-lg" />
              </View>
              <SkeletonBase width={80} height={36} />
            </View>

            {/* 完成按鈕 (只在第一張卡片顯示，模擬 pending 狀態) */}
            {i === 1 && (
              <View className="pt-4 border-t border-gray-100">
                <SkeletonBase height={44} className="rounded-xl" />
              </View>
            )}
          </SkeletonCard>
        ))}

        {/* 底部間距 */}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}

