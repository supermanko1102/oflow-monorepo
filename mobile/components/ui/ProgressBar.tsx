/**
 * ProgressBar 組件
 * 顯示多步驟流程的進度
 */

import React from "react";
import { Text, View } from "react-native";

interface ProgressBarProps {
  current: number; // 當前步驟（1-based）
  total: number; // 總步驟數
  showLabel?: boolean; // 是否顯示文字標籤
}

export function ProgressBar({
  current,
  total,
  showLabel = true,
}: ProgressBarProps) {
  const percentage = Math.min((current / total) * 100, 100);

  return (
    <View className="w-full">
      {/* 進度文字 */}
      {showLabel && (
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-sm font-semibold text-gray-700">
            步驟 {current} / {total}
          </Text>
          <Text className="text-sm text-gray-500">{Math.round(percentage)}%</Text>
        </View>
      )}

      {/* 進度條背景 */}
      <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        {/* 進度條填充 */}
        <View
          className="h-full bg-line-green rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </View>
    </View>
  );
}

