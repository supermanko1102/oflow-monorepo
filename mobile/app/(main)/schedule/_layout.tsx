import { Stack } from 'expo-router';

/**
 * 排班設定 Layout
 */
export default function ScheduleLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerShadowVisible: false,
        headerTintColor: '#00B900',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '排班設定',
          headerBackTitle: '返回',
        }}
      />
      <Stack.Screen
        name="day-detail"
        options={{
          title: '日期詳情',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

