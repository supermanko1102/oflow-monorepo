import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface SkeletonProps {
  width: number;
  height: number;
  borderRadius?: number;
  style?: any;
}

/**
 * Skeleton 載入動畫組件
 * 使用簡單的 Animated opacity 動畫
 */
export function Skeleton({ width, height, borderRadius = 4, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      className="bg-gray-200"
      style={[{ width, height, borderRadius, opacity }, style]}
    />
  );
}
