/**
 * 原生 Chip 組件
 * 使用 Pressable 實現，用於過濾標籤
 */

import React from 'react';
import { Pressable, Text } from 'react-native';
import { useHaptics } from '@/hooks/useHaptics';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  const haptics = useHaptics();
  
  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      className={`px-4 py-2.5 rounded-2xl ${
        selected ? 'bg-line-green' : 'bg-gray-100'
      }`}
      style={({ pressed }) => [
        { opacity: pressed ? 0.8 : 1 }
      ]}
    >
      <Text 
        className={`text-sm font-bold ${
          selected ? 'text-white' : 'text-gray-700'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

