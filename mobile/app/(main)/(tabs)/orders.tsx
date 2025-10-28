import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { Chip } from "@/components/native/Chip";
import { OrderCard } from "@/components/OrderCard";
import { SHADOWS } from "@/constants/design";
import { useOrders, useUpdateOrderStatus } from "@/hooks/queries/useOrders";
import { useHaptics } from "@/hooks/useHaptics";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/stores/useAuthStore";
import { OrderStatus } from "@/types/order";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { Searchbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FilterType = "all" | OrderStatus;
type DateFilterType = "all" | "today" | "week" | "future";

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [statusFilter, setStatusFilter] = useState<FilterType>("pending");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();
  const haptics = useHaptics();

  // 從 auth store 取得當前團隊 ID（統一使用 AuthStore）
  const currentTeamId = useAuthStore((state) => state.currentTeamId);

  // 使用 React Query 查詢訂單
  const {
    data: allOrders = [],
    isLoading,
    refetch,
    isFetching,
  } = useOrders(currentTeamId, undefined, !!currentTeamId);

  // 更新訂單狀態的 mutation
  const updateOrderStatus = useUpdateOrderStatus();

  const onRefresh = useCallback(async () => {
    haptics.light();
    await refetch();
    toast.success("訂單已更新");
  }, [haptics, toast, refetch]);

  // 日期篩選輔助函數
  const isToday = (dateStr: string): boolean => {
    const today = new Date();
    const date = new Date(dateStr);
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isThisWeek = (dateStr: string): boolean => {
    const today = new Date();
    const date = new Date(dateStr);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return date >= today && date <= weekFromNow;
  };

  const isFuture = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date > today;
  };

  // 篩選訂單
  const filteredOrders = useMemo(() => {
    let orders = allOrders;

    // 狀態篩選
    if (statusFilter !== "all") {
      orders = orders.filter((order) => order.status === statusFilter);
    }

    // 日期篩選
    if (dateFilter === "today") {
      orders = orders.filter((order) => isToday(order.pickupDate || ""));
    } else if (dateFilter === "week") {
      orders = orders.filter((order) => isThisWeek(order.pickupDate || ""));
    } else if (dateFilter === "future") {
      orders = orders.filter((order) => isFuture(order.pickupDate || ""));
    }

    // 搜尋篩選
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      orders = orders.filter(
        (order) =>
          order.customerName.toLowerCase().includes(query) ||
          order.customerPhone?.includes(query) ||
          order.items.some((item) => item.name.toLowerCase().includes(query))
      );
    }

    // 按日期和時間排序
    return orders.sort((a, b) => {
      const dateCompare =
        new Date(a.pickupDate || "").getTime() -
        new Date(b.pickupDate || "").getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.pickupTime?.localeCompare(b.pickupTime || "") || 0;
    });
  }, [allOrders, statusFilter, dateFilter, searchQuery]);

  // 處理訂單完成
  const handleOrderComplete = useCallback(
    async (orderId: string) => {
      try {
        await updateOrderStatus.mutateAsync({
          order_id: orderId,
          status: "completed",
        });
        haptics.success();
      } catch (error) {
        toast.error("更新失敗，請稍後再試");
      }
    },
    [updateOrderStatus, haptics, toast]
  );

  const pendingCount = allOrders.filter((o) => o.status === "pending").length;
  const completedCount = allOrders.filter(
    (o) => o.status === "completed"
  ).length;

  // Loading state
  if (isLoading && !allOrders.length) {
    return <LoadingState message="載入訂單中..." />;
  }

  // 沒有選擇團隊
  if (!currentTeamId) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <EmptyState title="請先選擇團隊" description="前往設定選擇或建立團隊" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="pb-5 px-6 bg-white border-b border-gray-100"
        style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
      >
        <Text className="text-4xl font-black text-gray-900 mb-4">訂單管理</Text>

        {/* Search Bar */}
        <Searchbar
          placeholder="搜尋客戶、電話或商品"
          onChangeText={setSearchQuery}
          value={searchQuery}
          className="mb-3"
          style={{ backgroundColor: "#F3F4F6" }}
        />

        {/* Status Filters */}
        <View className="flex-row gap-2 mb-3">
          <Chip
            label={`全部 (${allOrders.length})`}
            selected={statusFilter === "all"}
            onPress={() => setStatusFilter("all")}
          />
          <Chip
            label={`待處理 (${pendingCount})`}
            selected={statusFilter === "pending"}
            onPress={() => setStatusFilter("pending")}
          />
          <Chip
            label={`已完成 (${completedCount})`}
            selected={statusFilter === "completed"}
            onPress={() => setStatusFilter("completed")}
          />
        </View>

        {/* Date Filters */}
        <View className="flex-row gap-2">
          <Chip
            label="全部時間"
            selected={dateFilter === "all"}
            onPress={() => setDateFilter("all")}
          />
          <Chip
            label="今天"
            selected={dateFilter === "today"}
            onPress={() => setDateFilter("today")}
          />
          <Chip
            label="本週"
            selected={dateFilter === "week"}
            onPress={() => setDateFilter("week")}
          />
          <Chip
            label="未來"
            selected={dateFilter === "future"}
            onPress={() => setDateFilter("future")}
          />
        </View>
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        searchQuery ? (
          <EmptyState title="找不到訂單" description="試試看搜尋其他關鍵字" />
        ) : statusFilter === "all" ? (
          <EmptyState
            title="還沒有訂單"
            description="開始使用 LINE 或手動建立第一筆訂單"
          />
        ) : statusFilter === "pending" ? (
          <EmptyState
            title="沒有待處理訂單"
            description="所有訂單都已處理完成"
          />
        ) : (
          <EmptyState
            title="還沒有已完成訂單"
            description="完成訂單後會顯示在這裡"
          />
        )
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={({ item }) => (
            <OrderCard order={item} onComplete={handleOrderComplete} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={onRefresh}
              tintColor="#00B900"
              colors={["#00B900"]}
            />
          }
        />
      )}
    </View>
  );
}
