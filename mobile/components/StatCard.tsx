import React from 'react';
import { Text } from 'react-native';
import { Card } from 'react-native-paper';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ icon, label, value, color = 'line-green' }: StatCardProps) {
  return (
    <Card className="flex-1 min-w-[100px]">
      <Card.Content className="p-4">
        <Text className="text-2xl mb-2">{icon}</Text>
        <Text className={`text-2xl font-bold text-${color} mb-1`}>
          {value}
        </Text>
        <Text className="text-xs text-gray-600">
          {label}
        </Text>
      </Card.Content>
    </Card>
  );
}

