import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface SlotDurationPickerProps {
  selectedDuration: number;
  onSelect: (duration: number) => void;
}

interface DurationOption {
  value: number;
  label: string;
  description: string;
  recommended?: string[];
}

const durationOptions: DurationOption[] = [
  {
    value: 30,
    label: '30 分鐘',
    description: '適合快速服務',
    recommended: ['快剪', '簡單造型'],
  },
  {
    value: 60,
    label: '60 分鐘',
    description: '標準服務時長',
    recommended: ['剪髮', '染髮', '護膚'],
  },
  {
    value: 90,
    label: '90 分鐘',
    description: '需要較長時間',
    recommended: ['燙髮', '深層護理', 'SPA'],
  },
  {
    value: 120,
    label: '120 分鐘',
    description: '完整套裝服務',
    recommended: ['燙染套餐', '全身按摩'],
  },
];

/**
 * 時段長度選擇器組件
 * 
 * 功能：
 * - 選擇預約時段長度
 * - 顯示推薦服務類型
 */
export function SlotDurationPicker({ selectedDuration, onSelect }: SlotDurationPickerProps) {
  return (
    <View className="p-4">
      <Text className="text-lg font-bold text-gray-900 mb-1">選擇時段長度</Text>
      <Text className="text-sm text-gray-600 mb-5">每個預約時段的時間長度</Text>

      <View className="gap-3 mb-4">
        {durationOptions.map((option) => (
          <DurationOptionCard
            key={option.value}
            option={option}
            isSelected={selectedDuration === option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>

      <View className="bg-amber-50 p-3 rounded-lg border border-amber-200">
        <Text className="text-xs text-amber-900 leading-5">
          💡 提示：設定後可以隨時調整，但已預約的時段不會受影響
        </Text>
      </View>
    </View>
  );
}

interface DurationOptionProps {
  option: DurationOption;
  isSelected: boolean;
  onPress: () => void;
}

function DurationOptionCard({ option, isSelected, onPress }: DurationOptionProps) {
  return (
    <TouchableOpacity
      className={`rounded-xl p-4 border-2 ${
        isSelected ? 'border-line-green bg-green-50' : 'border-gray-200 bg-white'
      }`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text
            className={`text-base font-semibold mb-1 ${
              isSelected ? 'text-line-green' : 'text-gray-900'
            }`}
          >
            {option.label}
          </Text>
          <Text className="text-xs text-gray-600">{option.description}</Text>
        </View>
        {isSelected && (
          <View className="w-6 h-6 rounded-full bg-line-green items-center justify-center">
            <View className="w-2 h-2 rounded-full bg-white" />
          </View>
        )}
      </View>

      {option.recommended && (
        <View className="pt-3 border-t border-gray-200">
          <Text className="text-xs text-gray-600 mb-2">推薦：</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {option.recommended.map((item) => (
              <View
                key={item}
                className={`px-2.5 py-1 rounded-lg ${
                  isSelected ? 'bg-green-100' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-xs ${
                    isSelected ? 'text-green-700 font-medium' : 'text-gray-600'
                  }`}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
