import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.title}>選擇您的業態</Text>
      <Text style={styles.subtitle}>根據您的業務類型選擇合適的排班模式</Text>

      <View style={styles.optionsContainer}>
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
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
        <MaterialCommunityIcons
          name={option.icon as any}
          size={32}
          color={isSelected ? '#FFFFFF' : '#00B900'}
        />
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
          {option.title}
        </Text>
        <Text style={styles.cardDescription}>{option.description}</Text>

        {/* Examples */}
        <View style={styles.examplesContainer}>
          {option.examples.map((example) => (
            <View
              key={example}
              style={[styles.exampleBadge, isSelected && styles.exampleBadgeSelected]}
            >
              <Text style={[styles.exampleText, isSelected && styles.exampleTextSelected]}>
                {example}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Selection Indicator */}
      {isSelected && (
        <View style={styles.checkIcon}>
          <MaterialCommunityIcons name="check-circle" size={24} color="#00B900" />
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  cardSelected: {
    borderColor: '#00B900',
    backgroundColor: '#F0FDF4',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconContainerSelected: {
    backgroundColor: '#00B900',
  },
  cardContent: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  cardTitleSelected: {
    color: '#00B900',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  examplesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  exampleBadgeSelected: {
    backgroundColor: '#DCFCE7',
  },
  exampleText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  exampleTextSelected: {
    color: '#16A34A',
  },
  checkIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});

