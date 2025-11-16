import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";

import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="overview">
        <Label>Home</Label>
        <Icon
          src={<VectorIcon family={MaterialCommunityIcons} name="home" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="orders">
        <Label>Orders</Label>
        <Icon
          src={<VectorIcon family={MaterialCommunityIcons} name="receipt" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="inbox">
        <Label>Inbox</Label>
        <Icon
          src={<VectorIcon family={MaterialCommunityIcons} name="email" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="customers">
        <Label>Customers</Label>
        <Icon
          src={<VectorIcon family={MaterialCommunityIcons} name="account" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Label>Settings</Label>
        <Icon
          src={<VectorIcon family={MaterialCommunityIcons} name="cog" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
  //     screenOptions={{
  //       tabBarActiveTintColor: Colors.light.line.green,
  //       tabBarInactiveTintColor: Colors.light.text,
  //       headerShown: false,
  //       tabBarStyle: {
  //         backgroundColor: Colors.light.background,
  //         borderTopColor: Colors.light.icon,
  //       },
  //     }}
  //   >
  //     <Tabs.Screen
  //       name="overview"
  //       options={{
  //         tabBarIcon: ({ color, size }) => (
  //           <MaterialCommunityIcons name="home" size={size} color={color} />
  //         ),
  //       }}
  //     />
  //     <Tabs.Screen
  //       name="orders"
  //       options={{
  //         tabBarIcon: ({ color, size }) => (
  //           <MaterialCommunityIcons name="inbox" size={size} color={color} />
  //         ),
  //       }}
  //     />
  //     <Tabs.Screen
  //       name="inbox"
  //       options={{
  //         tabBarIcon: ({ color, size }) => (
  //           <MaterialCommunityIcons
  //             name="clipboard-text"
  //             size={size}
  //             color={color}
  //           />
  //         ),
  //       }}
  //     />
  //     <Tabs.Screen
  //       name="customers"
  //       options={{
  //         tabBarIcon: ({ color, size }) => (
  //           <MaterialCommunityIcons
  //             name="account-group"
  //             size={size}
  //             color={color}
  //           />
  //         ),
  //       }}
  //     />
  //     <Tabs.Screen
  //       name="settings"
  //       options={{
  //         tabBarIcon: ({ color, size }) => (
  //           <MaterialCommunityIcons name="cog" size={size} color={color} />
  //         ),
  //       }}
  //     />
  //   </Tabs>
  // );
}
