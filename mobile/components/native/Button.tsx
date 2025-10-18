/**
 * 原生 Button 組件
 * 使用 Pressable 實現，包含觸覺反饋和按壓動畫
 */

import React from 'react';
import { Pressable, Text } from 'react-native';
import { useHaptics } from '@/hooks/useHaptics';

interface ButtonProps {
  onPress: () => void;
  children: string;
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
  disabled?: boolean;
}

export function Button({ 
  onPress, 
  children, 
  variant = 'primary',
  fullWidth = false,
  disabled = false 
}: ButtonProps) {
  const haptics = useHaptics();
  
  return (
    <Pressable
      onPress={() => {
        if (!disabled) {
          haptics.light();
          onPress();
        }
      }}
      disabled={disabled}
      className={`px-6 py-4 rounded-2xl ${fullWidth ? 'w-full' : ''} ${
        disabled 
          ? 'bg-gray-300' 
          : variant === 'primary' 
            ? 'bg-line-green' 
            : 'bg-gray-100'
      }`}
      style={({ pressed }) => [
        { opacity: pressed && !disabled ? 0.8 : 1 },
        pressed && !disabled && { transform: [{ scale: 0.98 }] }
      ]}
    >
      <Text 
        className={`text-center text-base font-bold ${
          disabled
            ? 'text-gray-500'
            : variant === 'primary' 
              ? 'text-white' 
              : 'text-gray-700'
        }`}
      >
        {children}
      </Text>
    </Pressable>
  );
}

