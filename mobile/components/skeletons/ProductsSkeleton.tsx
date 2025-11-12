import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonBase, SkeletonCircle, SkeletonCard } from './SkeletonBase';
import { SHADOWS } from '@/constants/design';

/**
 * 商品頁面 Skeleton Loading 組件
 * 模擬商品列表的結構
 */
export function ProductsSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header Skeleton */}
      <View
        className="pb-5 px-6 bg-white border-b border-gray-100"
        style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
      >
        {/* Title and Action Icon */}
        <View className="flex-row justify-between items-center mb-2">
          {/* 大標題 */}
          <SkeletonBase width={120} height={40} />
          
          {/* 統計按鈕 */}
          <SkeletonCircle size={40} />
        </View>

        {/* 商品數量文字 */}
        <SkeletonBase width={80} height={20} />
      </View>

      {/* Category Tabs Skeleton */}
      <View className="bg-white px-6 py-3 border-b border-gray-100">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBase
              key={i}
              width={80}
              height={32}
              className="rounded-full"
            />
          ))}
        </ScrollView>
      </View>

      {/* Product List Skeleton */}
      <ScrollView className="flex-1">
        <View className="py-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i}>
              <View className="flex-row justify-between items-start mb-3">
                {/* 商品資訊 */}
                <View className="flex-1 mr-3">
                  {/* 商品名 + 下架標籤 */}
                  <View className="flex-row items-center mb-2">
                    <SkeletonBase width="60%" height={24} />
                  </View>

                  {/* 描述 */}
                  <SkeletonBase width="80%" height={16} className="mb-2" />

                  {/* 分類和庫存 */}
                  <View className="flex-row items-center gap-3">
                    <SkeletonBase width={60} height={16} />
                    <SkeletonBase width={70} height={16} />
                  </View>
                </View>

                {/* 價格 */}
                <View className="items-end">
                  <SkeletonBase width={80} height={32} />
                  <SkeletonBase width={40} height={16} className="mt-1" />
                </View>
              </View>

              {/* Actions - Switch 和按鈕 */}
              <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
                <View className="flex-row items-center">
                  <SkeletonBase width={60} height={16} className="mr-2" />
                  <SkeletonBase width={50} height={28} className="rounded-full" />
                </View>

                <View className="flex-row gap-2">
                  <SkeletonBase width={44} height={36} className="rounded-lg" />
                  <SkeletonBase width={44} height={36} className="rounded-lg" />
                </View>
              </View>
            </SkeletonCard>
          ))}
        </View>
      </ScrollView>

      {/* FAB Skeleton */}
      <View
        className="absolute bg-gray-200 animate-pulse rounded-full w-14 h-14"
        style={{
          right: 16,
          bottom: 16 + insets.bottom,
        }}
      />
    </View>
  );
}

