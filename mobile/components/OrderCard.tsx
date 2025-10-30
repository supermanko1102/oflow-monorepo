import { SHADOWS } from "@/constants/design";
import { useHaptics } from "@/hooks/useHaptics";
import { useToast } from "@/hooks/useToast";
import { DELIVERY_METHOD_LABELS, Order } from "@/types/order";
import { formatOrderTime } from "@/utils/timeHelpers";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
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

  // 向後兼容：優先使用新欄位
  const orderDate = order.appointmentDate;
  const orderTime = order.appointmentTime;
  const deliveryMethod = order.deliveryMethod;

  // 使用新的格式化函數
  const formattedTime = formatOrderTime(orderDate, orderTime, deliveryMethod);

  // 取得配送方式標籤
  const deliveryLabel = DELIVERY_METHOD_LABELS[deliveryMethod] || "自取";

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

          {/* Time, Delivery Method and Amount */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-col gap-2">
              <View className="flex-row items-center px-3 py-1.5 rounded-lg bg-gray-100">
                <Text className="text-sm font-semibold text-gray-700">
                  {formattedTime}
                </Text>
              </View>
              <View className="flex-row items-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
                <MaterialCommunityIcons
                  name={
                    deliveryMethod === "black_cat" ||
                    deliveryMethod === "convenience_store"
                      ? "truck"
                      : "store"
                  }
                  size={14}
                  color="#3B82F6"
                />
                <Text className="text-xs font-semibold text-blue-700 ml-1">
                  {deliveryLabel}
                </Text>
              </View>
            </View>
            <Text className="text-3xl font-bold text-gray-900">
              ${order.totalAmount}
            </Text>
          </View>

          {/* Quick Actions - 只保留完成按鈕 */}
          {order.status === "pending" && (
            <View className="pt-4 border-t border-neutral-100">
              <TouchableOpacity
                className="flex-row items-center justify-center bg-line-green py-3 rounded-xl"
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
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}
