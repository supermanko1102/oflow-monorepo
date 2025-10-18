/**
 * 本週訂單趨勢圖表組件
 * 使用 react-native-chart-kit 顯示折線圖
 */

import React from 'react';
import { Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Card } from '@/components/native/Card';

interface WeeklyOrderChartProps {
  data: number[]; // 7 天的訂單數量
}

export function WeeklyOrderChart({ data }: WeeklyOrderChartProps) {
  const screenWidth = Dimensions.get('window').width;
  
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 185, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#00B900',
    },
  };

  return (
    <Card className="mx-6 mb-4">
      <Text className="text-lg font-bold text-gray-900 mb-4">
        本週訂單趨勢
      </Text>
      <LineChart
        data={{
          labels: ['一', '二', '三', '四', '五', '六', '日'],
          datasets: [{ data }],
        }}
        width={screenWidth - 80}
        height={200}
        chartConfig={chartConfig}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 20,
        }}
      />
    </Card>
  );
}

