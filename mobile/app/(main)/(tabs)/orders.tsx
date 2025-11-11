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
import { isFuture, isThisWeek, isToday } from "@/utils/timeHelpers";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// TODO: Searchbar 需要用 TextInput + Icon 替換
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FilterBottomSheet } from "@/components/orders/FilterBottomSheet";
import { MoreMenuBottomSheet } from "@/components/orders/MoreMenuBottomSheet";

type FilterType = "all" | OrderStatus;
type DateFilterType = "all" | "today" | "week" | "future";

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [statusFilter, setStatusFilter] = useState<FilterType>("pending");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
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
      } catch {
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
        {/* Title and Action Icons */}
        {!isSearching ? (
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-4xl font-black text-gray-900">訂單管理</Text>
            <View className="flex-row gap-3">
              {/* 搜尋 Icon */}
              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  setIsSearching(true);
                }}
                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="magnify"
                  size={24}
                  color="#6B7280"
                />
              </TouchableOpacity>
              
              {/* 篩選 Icon */}
              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  setShowFilterSheet(true);
                }}
                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="filter-variant"
                  size={24}
                  color="#6B7280"
                />
              </TouchableOpacity>
              
              {/* 更多 Icon */}
              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  setShowMoreSheet(true);
                }}
                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="dots-horizontal"
                  size={24}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="mb-4">
            <Searchbar
              placeholder="搜尋客戶、電話或商品"
              onChangeText={setSearchQuery}
              value={searchQuery}
              autoFocus
              style={{ backgroundColor: "#F3F4F6" }}
              icon={() => (
                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    setIsSearching(false);
                    setSearchQuery("");
                  }}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={24}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              )}
              clearIcon={() =>
                searchQuery ? (
                  <TouchableOpacity
                    onPress={() => {
                      haptics.light();
                      setSearchQuery("");
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                ) : null
              }
            />
          </View>
        )}

        {/* Status Filters - 只保留待處理和已完成 */}
        <View className="flex-row gap-2">
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

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        onDismiss={() => setShowFilterSheet(false)}
        currentStatusFilter={statusFilter}
        currentDateFilter={dateFilter}
        onApply={(newStatusFilter, newDateFilter) => {
          setStatusFilter(newStatusFilter);
          setDateFilter(newDateFilter);
        }}
      />

      {/* More Menu Bottom Sheet */}
      <MoreMenuBottomSheet
        visible={showMoreSheet}
        onDismiss={() => setShowMoreSheet(false)}
        onExport={() => {
          toast.info("匯出功能即將推出");
        }}
        onSort={() => {
          toast.info("排序功能即將推出");
        }}
        onCreateManualOrder={() => {
          toast.info("手動建立訂單功能即將推出");
        }}
      />
    </View>
  );
}
