import { Stack } from 'expo-router';

export default function OrderLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="[id]" 
        options={{
          title: '訂單詳情',
          headerBackTitle: '返回',
        }} 
      />
    </Stack>
  );
}

