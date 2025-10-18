import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BusinessType } from '@/types/schedule';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface BusinessTypeSelectorProps {
  selectedType: BusinessType | null;
  onSelect: (type: BusinessType) => void;
}

interface BusinessTypeOption {
  type: BusinessType;
  icon: string;
  title: string;
  description: string;
  examples: string[];
}

const businessTypes: BusinessTypeOption[] = [
  {
    type: 'pickup',
    icon: 'cake-variant',
    title: '取貨制',
    description: '客戶在指定時間取貨，不需要預約特定時段',
    examples: ['甜點店', '蛋糕店', '烘焙坊'],
  },
  {
    type: 'appointment',
    icon: 'calendar-clock',
    title: '預約制',
    description: '客戶預約特定時段，每個時段只能接一位客戶',
    examples: ['美髮店', '美容院', '按摩店'],
  },
];

/**
 * 業態選擇器組件
 * 
 * 功能：
 * - 選擇取貨制或預約制
 * - 顯示業態說明和範例
 */
export function BusinessTypeSelector({ selectedType, onSelect }: BusinessTypeSelectorProps) {
  return (
    <View className="p-4">
      <Text className="text-xl font-bold text-gray-900 mb-2">選擇您的業態</Text>
      <Text className="text-sm text-gray-600 mb-5">根據您的業務類型選擇合適的排班模式</Text>

      <View className="gap-4">
        {businessTypes.map((option) => (
          <BusinessTypeCard
            key={option.type}
            option={option}
            isSelected={selectedType === option.type}
            onPress={() => onSelect(option.type)}
          />
        ))}
      </View>
    </View>
  );
}

interface BusinessTypeCardProps {
  option: BusinessTypeOption;
  isSelected: boolean;
  onPress: () => void;
}

function BusinessTypeCard({ option, isSelected, onPress }: BusinessTypeCardProps) {
  return (
    <TouchableOpacity
      className={`rounded-2xl p-5 border-2 ${
        isSelected ? 'border-line-green bg-green-50' : 'border-gray-200 bg-white'
      }`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View
        className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${
          isSelected ? 'bg-line-green' : 'bg-green-50'
        }`}
      >
        <MaterialCommunityIcons
          name={option.icon as any}
          size={32}
          color={isSelected ? '#FFFFFF' : '#00B900'}
        />
      </View>

      {/* Content */}
      <View className="mb-3">
        <Text
          className={`text-lg font-bold mb-2 ${
            isSelected ? 'text-line-green' : 'text-gray-900'
          }`}
        >
          {option.title}
        </Text>
        <Text className="text-sm text-gray-600 leading-5">{option.description}</Text>

        {/* Examples */}
        <View className="flex-row flex-wrap gap-2 mt-3">
          {option.examples.map((example) => (
            <View
              key={example}
              className={`px-3 py-1.5 rounded-xl ${
                isSelected ? 'bg-green-100' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isSelected ? 'text-green-700' : 'text-gray-600'
                }`}
              >
                {example}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Selection Indicator */}
      {isSelected && (
        <View className="absolute top-4 right-4">
          <MaterialCommunityIcons name="check-circle" size={24} color="#00B900" />
        </View>
      )}
    </TouchableOpacity>
  );
}
