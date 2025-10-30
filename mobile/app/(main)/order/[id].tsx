import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  useOrderDetail,
  useUpdateOrderStatus,
} from "@/hooks/queries/useOrders";
import { useHaptics } from "@/hooks/useHaptics";
import { useToast } from "@/hooks/useToast";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, Card, Divider } from "react-native-paper";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const haptics = useHaptics();

  // 使用 React Query 查詢訂單詳情
  const { data: order, isLoading, error } = useOrderDetail(id || null);

  // 更新訂單狀態的 mutation
  const updateOrderStatus = useUpdateOrderStatus();

  // Loading state
  if (isLoading) {
    return <LoadingState message="載入訂單詳情..." />;
  }

  // Error or not found
  if (error || !order) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <EmptyState
          title="訂單不存在"
          description="此訂單可能已被刪除或您沒有權限查看"
        />
      </View>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${
      date.getMonth() + 1
    }/${date.getDate()} ${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  // 處理標記完成
  const handleMarkCompleted = async () => {
    try {
      await updateOrderStatus.mutateAsync({
        order_id: order.id,
        status: "completed",
      });
      haptics.success();
      toast.success("訂單已標記為完成 ✓");
    } catch (error) {
      toast.error("更新失敗，請稍後再試");
    }
  };
  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Order Header */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-1">訂單編號</Text>
            <Text className="text-base font-mono text-gray-700">
              {order.orderNumber}
            </Text>
          </View>
          <View className="flex-row gap-2">
            <StatusBadge type="source" value={order.source} />
            <StatusBadge type="status" value={order.status} />
          </View>
        </View>

        <Text className="text-xs text-gray-500">
          建立時間：{formatDateTime(order.createdAt)}
        </Text>
      </View>

      {/* Customer Info */}
      <Card className="m-4">
        <Card.Content className="p-4">
          <Text className="text-sm font-semibold text-gray-700 mb-3">
            客戶資訊
          </Text>
          <View className="flex-row items-center mb-2">
            <Text className="text-base text-gray-900 w-20">姓名</Text>
            <Text className="text-base text-gray-700 flex-1">
              {order.customerName}
            </Text>
          </View>
          {order.customerPhone && (
            <View className="flex-row items-center">
              <Text className="text-base text-gray-900 w-20">電話</Text>
              <Text className="text-base text-gray-700 flex-1">
                {order.customerPhone}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Pickup Info */}
      <Card className="mx-4 mb-4">
        <Card.Content className="p-4">
          <Text className="text-sm font-semibold text-gray-700 mb-3">
            取貨資訊
          </Text>
          <View className="flex-row items-center mb-2">
            <Text className="text-base text-gray-900 w-20">日期</Text>
            <Text className="text-base text-gray-700 flex-1">
              {formatDate(order.appointmentDate)}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-base text-gray-900 w-20">時間</Text>
            <Text className="text-base text-gray-700 flex-1">
              {order.pickupTime}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Order Items */}
      <Card className="mx-4 mb-4">
        <Card.Content className="p-4">
          <Text className="text-sm font-semibold text-gray-700 mb-3">
            訂單明細
          </Text>
          {order.items.map((item, index) => (
            <View key={index}>
              <View className="flex-row justify-between items-start py-2">
                <View className="flex-1">
                  <Text className="text-base text-gray-900 mb-1">
                    {item.name}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    數量：{item.quantity}
                  </Text>
                </View>
                <Text className="text-base font-semibold text-gray-900">
                  ${item.price}
                </Text>
              </View>
              {index < order.items.length - 1 && <Divider />}
            </View>
          ))}

          <Divider className="my-3" />

          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-bold text-gray-900">總金額</Text>
            <Text className="text-2xl font-bold text-line-green">
              ${order.totalAmount}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card className="mx-4 mb-4">
          <Card.Content className="p-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              備註
            </Text>
            <Text className="text-base text-gray-700">{order.notes}</Text>
          </Card.Content>
        </Card>
      )}

      {/* LINE Conversation */}
      {order.lineConversation && order.lineConversation.length > 0 && (
        <Card className="mx-4 mb-4">
          <Card.Content className="p-4">
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              LINE 對話記錄
            </Text>
            <View className="space-y-2">
              {order.lineConversation.map((message, index) => {
                // 判斷是新格式（物件）還是舊格式（字串）
                const isNewFormat =
                  typeof message === "object" && "role" in message;
                const isCustomer = isNewFormat
                  ? message.role === "customer"
                  : !message.startsWith("AI:") && !message.startsWith("商家:");
                const messageText = isNewFormat ? message.message : message;
                const timestamp =
                  isNewFormat && message.timestamp
                    ? new Date(message.timestamp).toLocaleTimeString("zh-TW", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null;

                return (
                  <View
                    key={index}
                    className={`flex ${
                      isCustomer ? "items-end" : "items-start"
                    } mb-2`}
                  >
                    <View
                      className={`max-w-[80%] ${
                        isCustomer ? "ml-auto" : "mr-auto"
                      }`}
                    >
                      <View
                        className={`p-3 rounded-2xl ${
                          isCustomer ? "bg-blue-500" : "bg-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            isCustomer ? "text-white" : "text-gray-800"
                          }`}
                        >
                          {messageText}
                        </Text>
                      </View>
                      {timestamp && (
                        <Text
                          className={`text-xs text-gray-400 mt-1 ${
                            isCustomer ? "text-right" : "text-left"
                          }`}
                        >
                          {timestamp}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      {order.status === "pending" && (
        <View className="px-4 pb-6">
          <Button
            mode="contained"
            onPress={handleMarkCompleted}
            className="mb-3"
            buttonColor="#00B900"
            disabled={updateOrderStatus.isPending}
            loading={updateOrderStatus.isPending}
          >
            標記為已完成
          </Button>
        </View>
      )}

      {/* 已完成訂單可以改回待處理 */}
      {order.status === "completed" && (
        <View className="px-4 pb-6">
          <Button
            mode="outlined"
            onPress={async () => {
              try {
                await updateOrderStatus.mutateAsync({
                  order_id: order.id,
                  status: "pending",
                });
                haptics.light();
                toast.success("已改回待處理");
                setTimeout(() => {
                  router.back();
                }, 500);
              } catch (error) {
                toast.error("更新失敗，請稍後再試");
              }
            }}
            textColor="#6B7280"
            disabled={updateOrderStatus.isPending}
          >
            改回待處理
          </Button>
        </View>
      )}

      <View className="h-8" />
    </ScrollView>
  );
}
