import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

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
    <View style={styles.container}>
      <Text style={styles.title}>選擇時段長度</Text>
      <Text style={styles.subtitle}>每個預約時段的時間長度</Text>

      <View style={styles.optionsContainer}>
        {durationOptions.map((option) => (
          <DurationOptionCard
            key={option.value}
            option={option}
            isSelected={selectedDuration === option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteText}>
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
      style={[styles.optionCard, isSelected && styles.optionCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.optionHeader}>
        <View>
          <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
            {option.label}
          </Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <View style={styles.selectedDot} />
          </View>
        )}
      </View>

      {option.recommended && (
        <View style={styles.recommendedContainer}>
          <Text style={styles.recommendedLabel}>推薦：</Text>
          <View style={styles.recommendedTags}>
            {option.recommended.map((item) => (
              <View
                key={item}
                style={[styles.recommendedTag, isSelected && styles.recommendedTagSelected]}
              >
                <Text
                  style={[
                    styles.recommendedText,
                    isSelected && styles.recommendedTextSelected,
                  ]}
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

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionCardSelected: {
    borderColor: '#00B900',
    backgroundColor: '#F0FDF4',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#00B900',
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00B900',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  recommendedContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  recommendedLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  recommendedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recommendedTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendedTagSelected: {
    backgroundColor: '#DCFCE7',
  },
  recommendedText: {
    fontSize: 12,
    color: '#6B7280',
  },
  recommendedTextSelected: {
    color: '#16A34A',
    fontWeight: '500',
  },
  noteCard: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
});

