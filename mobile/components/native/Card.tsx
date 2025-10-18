/**
 * 原生 Card 組件
 * 使用 View 實現，帶有陰影效果
 */

import React from 'react';
import { View } from 'react-native';
import { SHADOWS } from '@/constants/design';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <View 
      className={`bg-white rounded-[20px] p-5 ${className}`}
      style={SHADOWS.card}
    >
      {children}
    </View>
  );
}

