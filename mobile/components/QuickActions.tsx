/**
 * 快速操作區塊
 * 提供主要功能的快速入口
 */

import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/native/Button';

export function QuickActions() {
  const router = useRouter();
  
  return (
    <View className="px-6 mt-4">
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            onPress={() => router.push('/(main)/(tabs)/orders')}
            variant="primary"
            fullWidth
          >
            查看所有訂單
          </Button>
        </View>
        <View className="flex-1">
          <Button
            onPress={() => {}}
            variant="secondary"
            fullWidth
          >
            手動新增
          </Button>
        </View>
      </View>
    </View>
  );
}

