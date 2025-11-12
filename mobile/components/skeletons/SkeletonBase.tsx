import React from "react";
import { View, ViewStyle } from "react-native";

interface SkeletonBaseProps {
  width?: number | string;
  height?: number;
  className?: string;
  style?: ViewStyle;
}

/**
 * 基礎骨架組件
 * 使用 NativeWind 的 animate-pulse 提供動畫效果
 */
export function SkeletonBase({
  width = "100%",
  height = 20,
  className = "",
  style,
}: SkeletonBaseProps) {
  return (
    <View
      className={`bg-gray-200 animate-pulse rounded-lg ${className}`}
      style={[{ width: width as number, height: height }, style]}
    />
  );
}

/**
 * 圓形骨架（用於圖標位置）
 */
export function SkeletonCircle({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <View
      className={`bg-gray-200 animate-pulse rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * 文字行骨架（支援多行）
 */
export function SkeletonText({
  lines = 1,
  className = "",
  lastLineWidth = "60%",
}: {
  lines?: number;
  className?: string;
  lastLineWidth?: string | number;
}) {
  return (
    <View className={className}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBase
          key={index}
          height={16}
          width={index === lines - 1 ? lastLineWidth : "100%"}
          className={index < lines - 1 ? "mb-2" : ""}
        />
      ))}
    </View>
  );
}

/**
 * 卡片骨架容器（提供一致的卡片樣式）
 */
export function SkeletonCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`bg-white rounded-2xl p-4 mx-4 mb-4 ${className}`}>
      {children}
    </View>
  );
}
