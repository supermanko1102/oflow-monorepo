import { SHADOWS } from "@/constants/design";
import { useHaptics } from "@/hooks/useHaptics";
import { useToast } from "@/hooks/useToast";
import { Order } from "@/types/order";
import { formatRelativeTime } from "@/utils/timeHelpers";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { Card } from "react-native-paper";
import { StatusBadge } from "./StatusBadge";

interface OrderCardProps {
  order: Order;
  onComplete?: (orderId: string) => void;
}

export function OrderCard({ order, onComplete }: OrderCardProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const toast = useToast();

  const relativeTime = formatRelativeTime(
    order.pickupDate || order.appointmentDate,
    order.pickupTime || order.appointmentTime
  );

  const itemsSummary =
    order.items.length === 1
      ? order.items[0].name
      : `${order.items[0].name} 等 ${order.items.length} 項`;

  const handleCardPress = () => {
    haptics.light();
    router.push(`/(main)/order/${order.id}`);
  };

  const handleComplete = (e: any) => {
    e.stopPropagation();
    haptics.success();
    toast.success("訂單已標記為完成");
    onComplete?.(order.id);
  };

  const handleCall = (e: any) => {
    e.stopPropagation();
    haptics.light();
    if (order.customerPhone) {
      Linking.openURL(`tel:${order.customerPhone}`);
      toast.info("已撥打電話");
    } else {
      toast.warning("沒有客戶電話");
    }
  };

  const handleMessage = (e: any) => {
    e.stopPropagation();
    haptics.light();
    if (order.customerPhone) {
      Linking.openURL(`sms:${order.customerPhone}`);
      toast.info("已開啟簡訊");
    } else {
      toast.warning("沒有客戶電話");
    }
  };

  return (
    <TouchableOpacity onPress={handleCardPress} activeOpacity={0.7}>
      <Card className="mb-4 mx-4 bg-white" style={SHADOWS.card}>
        <Card.Content className="p-5">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900 mb-1">
                {order.customerName}
              </Text>
              <Text className="text-sm text-gray-600">{itemsSummary}</Text>
            </View>
            <View className="flex-row gap-2">
              <StatusBadge type="source" value={order.source} />
              <StatusBadge type="status" value={order.status} />
            </View>
          </View>

          {/* Time and Amount */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center px-4 py-2 rounded-full bg-gray-100">
              <Text className="text-sm font-semibold text-gray-700">
                {relativeTime}
              </Text>
            </View>
            <Text className="text-3xl font-bold text-gray-900">
              ${order.totalAmount}
            </Text>
          </View>

          {/* Quick Actions - 統一灰色風格 */}
          {order.status === "pending" && (
            <View className="flex-row gap-3 pt-4 border-t border-neutral-100">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-line-green py-3 rounded-xl"
                onPress={handleComplete}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color="#FFFFFF"
                />
                <Text className="ml-2 text-sm font-bold text-white">完成</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-12 h-12 items-center justify-center bg-gray-100 rounded-xl"
                onPress={handleCall}
                disabled={!order.customerPhone}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="phone"
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>

              <TouchableOpacity
                className="w-12 h-12 items-center justify-center bg-gray-100 rounded-xl"
                onPress={handleMessage}
                disabled={!order.customerPhone}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="message-text"
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}
