import { Stack } from "expo-router";

export default function OrderLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerShadowVisible: false,
        headerTintColor: "#00B900",
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: "訂單詳情",
          headerBackTitle: "返回",
        }}
      />
    </Stack>
  );
}
