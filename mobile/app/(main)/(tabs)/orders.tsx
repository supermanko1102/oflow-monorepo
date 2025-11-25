import { MainLayout } from "@/components/layout/MainLayout";
import { IconButton } from "@/components/Navbar";
import { NoWebhookState } from "@/components/ui/NoWebhookState";
import { Palette } from "@/constants/palette";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import {
  useOrders,
  useOrdersRealtime,
  useUpdateOrderStatus,
} from "@/hooks/queries/useOrders";
import { OrderCard } from "@/components/orders/OrderCard";
import { OrderDetailModal } from "@/components/orders/OrderDetailModal";
import { OrderFilters } from "@/components/orders/OrderFilters";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { type Order, type OrderStatus } from "@/types/order";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type StatusFilterKey = "all" | OrderStatus;
type ViewScope = "pendingFocus" | "today" | "all";

const statusFilters = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待付款" },
  { key: "paid", label: "已付款" },
  { key: "completed", label: "已完成" },
  { key: "cancelled", label: "已取消" },
] as const satisfies { key: StatusFilterKey; label: string }[];

const brandTeal = Palette.brand.primary;
const brandSlate = Palette.brand.slate;
const brandWarning = Palette.status.warning;
const brandDanger = Palette.status.danger;
const brandSuccess = Palette.status.success;

const statusChipMeta: Record<
  StatusFilterKey,
  { background: string; border: string; color: string; icon?: string }
> = {
  all: {
    background: "#0F172A",
    border: "#0F172A",
    color: "#FFFFFF",
  },
  pending: {
    background: "rgba(248, 113, 113, 0.15)",
    border: "rgba(239, 68, 68, 0.4)",
    color: brandDanger,
    icon: brandDanger,
  },
  confirmed: {
    background: "rgba(249, 115, 22, 0.15)",
    border: "rgba(249, 115, 22, 0.35)",
    color: brandWarning,
    icon: brandWarning,
  },
  paid: {
    background: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.35)",
    color: brandTeal,
    icon: brandTeal,
  },
  completed: {
    background: "rgba(34, 197, 94, 0.15)",
    border: "rgba(34, 197, 94, 0.35)",
    color: brandSuccess,
    icon: brandSuccess,
  },
  cancelled: {
    background: "rgba(148, 163, 184, 0.2)",
    border: "rgba(148, 163, 184, 0.4)",
    color: "#475569",
    icon: "#475569",
  },
};

const orderStatusMeta: Record<
  OrderStatus,
  {
    label: string;
    strip: string;
    badgeBackground: string;
    badgeColor: string;
  }
> = {
  pending: {
    label: "待付款",
    strip: brandDanger,
    badgeBackground: "rgba(239, 68, 68, 0.12)",
    badgeColor: brandDanger,
  },
  confirmed: {
    label: "待付款",
    strip: brandDanger,
    badgeBackground: "rgba(239, 68, 68, 0.12)",
    badgeColor: brandDanger,
  },
  paid: {
    label: "已付款",
    strip: brandTeal,
    badgeBackground: "rgba(0, 128, 128, 0.12)",
    badgeColor: brandTeal,
  },
  completed: {
    label: "已完成",
    strip: brandSuccess,
    badgeBackground: "rgba(34, 197, 94, 0.12)",
    badgeColor: brandSuccess,
  },
  cancelled: {
    label: "已取消",
    strip: "#94A3B8",
    badgeBackground: "rgba(148, 163, 184, 0.12)",
    badgeColor: "#475569",
  },
};

export default function Orders() {
  const { currentTeam, currentTeamId } = useCurrentTeam();

  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [viewScope, setViewScope] = useState<ViewScope>("pendingFocus");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const updateOrderStatus = useUpdateOrderStatus();
  const router = useRouter();
  const statusLabelMap: Record<OrderStatus, string> = {
    pending: "待付款",
    paid: "已付款",
    confirmed: "待付款",
    completed: "已完成",
    cancelled: "已取消",
  };

  const {
    data: orders = [],
    isLoading,
    isRefetching,
    refetch,
  } = useOrders(currentTeamId, undefined, !!currentTeamId);
  useOrdersRealtime(currentTeamId);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const getOrderTimestamp = (order: Order) => {
    const baseDate = order.appointmentDate
      ? new Date(order.appointmentDate)
      : null;
    if (!baseDate) return null;
    if (order.appointmentTime) {
      const [h, m] = order.appointmentTime.split(":").map(Number);
      baseDate.setHours(h || 0);
      baseDate.setMinutes(m || 0);
      baseDate.setSeconds(0);
      baseDate.setMilliseconds(0);
    }
    return baseDate;
  };

  const scopeFilteredOrders = useMemo(() => {
    const isPendingLike = (status: OrderStatus) =>
      status === "pending" || status === "confirmed";

    const base = orders.filter((order) => {
      // 狀態篩選：pending 代表「未付款」含 confirmed
      if (statusFilter !== "all") {
        if (statusFilter === "pending" && !isPendingLike(order.status)) {
          return false;
        }
        if (statusFilter !== "pending" && order.status !== statusFilter) {
          return false;
        }
      }

      if (viewScope === "pendingFocus") {
        return isPendingLike(order.status) || order.status === "paid";
      }

      if (viewScope === "today") {
        return order.appointmentDate === todayStr;
      }

      return true;
    });

    // 排序：今天 > 明天 > 其他，時間近在上；狀態優先序
    const statusPriority: Record<OrderStatus, number> = {
      pending: 1,
      confirmed: 1, // 視為待付款
      paid: 2,
      completed: 3,
      cancelled: 4,
    };

    return [...base].sort((a, b) => {
      const tsA = getOrderTimestamp(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const tsB = getOrderTimestamp(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;

      if (a.appointmentDate === todayStr && b.appointmentDate !== todayStr)
        return -1;
      if (b.appointmentDate === todayStr && a.appointmentDate !== todayStr)
        return 1;

      if (tsA !== tsB) return tsA - tsB;
      return statusPriority[a.status] - statusPriority[b.status];
    });
  }, [orders, statusFilter, viewScope, todayStr]);

  const sectionedOrders = useMemo(() => {
    const sections: { title: string; data: Order[] }[] = [];
    const todayOrders = scopeFilteredOrders.filter(
      (o) => o.appointmentDate === todayStr
    );
    const tomorrowStr = (() => {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      return t.toISOString().split("T")[0];
    })();
    const tomorrow = scopeFilteredOrders.filter(
      (o) => o.appointmentDate === tomorrowStr
    );
    const later = scopeFilteredOrders.filter(
      (o) =>
        o.appointmentDate !== todayStr &&
        o.appointmentDate !== tomorrowStr &&
        o.appointmentDate
    );
    const noDate = scopeFilteredOrders.filter((o) => !o.appointmentDate);

    if (todayOrders.length > 0)
      sections.push({ title: "今天", data: todayOrders });
    if (tomorrow.length > 0) sections.push({ title: "明天", data: tomorrow });
    if (later.length > 0) sections.push({ title: "更晚", data: later });
    if (noDate.length > 0) sections.push({ title: "未指定時間", data: noDate });
    return sections;
  }, [scopeFilteredOrders, todayStr]);

  const pendingCount = orders.filter(
    (o) =>
      o.status === "pending" || o.status === "confirmed" || o.status === "paid"
  ).length;
  const todayCount = orders.filter(
    (o) => o.appointmentDate === todayStr
  ).length;
  const totalCount = orders.length;

  const getNextStatus = (status: OrderStatus): OrderStatus | null => {
    if (status === "pending" || status === "confirmed") return "paid";
    if (status === "paid") return "completed";
    return null;
  };

  const getActionLabel = (status: OrderStatus) => {
    if (status === "pending" || status === "confirmed") return "收款";
    if (status === "paid") return "完成";
    return "查看詳情";
  };

  const handleStatusAction = async (order: Order) => {
    const next = getNextStatus(order.status);
    if (!next) {
      Alert.alert("提醒", "此狀態無需操作");
      return;
    }
    try {
      await updateOrderStatus.mutateAsync({
        order_id: order.id,
        status: next,
      });
      Alert.alert("成功", `已更新為${getActionLabel(order.status)}`);
    } catch (error) {
      console.error("[Order] update status failed", error);
      Alert.alert("更新失敗", "請稍後再試");
    }
  };

  const handleCancel = (order: Order) => {
    Alert.alert("取消訂單", "確定要將此訂單標記為取消嗎？", [
      { text: "保留", style: "cancel" },
      {
        text: "取消訂單",
        style: "destructive",
        onPress: async () => {
          try {
            await updateOrderStatus.mutateAsync({
              order_id: order.id,
              status: "cancelled",
            });
          } catch (error) {
            console.error("[Order] cancel failed", error);
            Alert.alert("取消失敗", "請稍後再試");
          }
        },
      },
    ]);
  };

  const handleDirectStatusChange = (order: Order, newStatus: OrderStatus) => {
    if (newStatus === order.status) return;
    Alert.alert(
      "變更狀態",
      `確定將訂單變更為「${statusLabelMap[newStatus]}」嗎？`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "確定",
          onPress: async () => {
            try {
              await updateOrderStatus.mutateAsync({
                order_id: order.id,
                status: newStatus,
              });
              setSelectedOrder({ ...order, status: newStatus });
            } catch (error) {
              console.error("[Order] change status failed", error);
              Alert.alert("更新失敗", "請稍後再試");
            }
          },
        },
      ]
    );
  };

  if (!currentTeam?.line_channel_id) {
    return (
      <MainLayout
        title="訂單管理"
        teamName={currentTeam?.team_name || "載入中..."}
      >
        <NoWebhookState />
      </MainLayout>
    );
  }

  return (
    <>
      <MainLayout
        title="訂單管理"
        teamName={currentTeam?.team_name || "載入中..."}
        scrollable={false}
        centerContent={
          <View>
            <Text className="text-sm font-semibold text-slate-900">
              訂單視圖
            </Text>
            <Text className="text-[12px] text-slate-500 mt-1">
              切換待處理 / 今日 / 全部訂單
            </Text>
            <View className="mt-2">
              <SegmentedControl
                options={[
                  { label: "待處理", value: "pendingFocus", badge: pendingCount },
                  { label: "今日", value: "today", badge: todayCount },
                  { label: "全部", value: "all", badge: totalCount },
                ]}
                value={viewScope}
                onChange={(val) => setViewScope(val as ViewScope)}
                theme="brand"
              />
            </View>
          </View>
        }
        rightContent={
          <View className="flex-row items-center gap-2">
            <IconButton
              icon="add"
              ariaLabel="新增訂單"
              onPress={() => console.log("create order")}
              isDark={false}
            />
            <IconButton
              icon="pricetags-outline"
              ariaLabel="前往商品管理"
              onPress={() => router.push("/production")}
              isDark={false}
            />
          </View>
        }
      >
        <View className="flex-1">
          <SectionList
            sections={sectionedOrders}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={brandTeal}
              />
            }
            ListHeaderComponent={
              <OrderFilters
                pendingCount={pendingCount}
                todayCount={todayCount}
                viewScope={viewScope}
                onChangeScope={setViewScope}
                statusFilter={statusFilter}
                onChangeStatus={setStatusFilter}
                statusFilters={statusFilters}
                statusChipMeta={statusChipMeta}
              />
            }
            renderSectionHeader={({ section }) => (
              <View className="flex-row items-center justify-between px-1 py-2">
                <Text className="text-xs font-semibold text-slate-600 uppercase">
                  {section.title}
                </Text>
                <Text className="text-[11px] text-slate-400">
                  {section.data.length} 筆
                </Text>
              </View>
            )}
            renderItem={({ item }) => {
              const actionLabel = getActionLabel(item.status);
              const isActionable = actionLabel !== "查看詳情";
              return (
                <OrderCard
                  order={item}
                  todayStr={todayStr}
                  statusMeta={orderStatusMeta}
                  actionLabel={actionLabel}
                  isActionable={isActionable}
                  loading={updateOrderStatus.isPending}
                  onPress={(order) => setSelectedOrder(order)}
                  onAction={(order) =>
                    isActionable
                      ? handleStatusAction(order)
                      : setSelectedOrder(order)
                  }
                  onCancel={(order) => handleCancel(order)}
                />
              );
            }}
            ListEmptyComponent={
              isLoading ? (
                <View className="py-16 items-center justify-center">
                  <ActivityIndicator size="large" color={brandTeal} />
                  <Text className="text-slate-500 mt-2">載入訂單中</Text>
                </View>
              ) : (
                <View className="py-16 items-center justify-center">
                  <Text className="text-slate-600">沒有符合篩選的訂單</Text>
                  <Pressable
                    className="mt-3 px-4 py-2 rounded-full border border-slate-200"
                    onPress={() => {
                      setViewScope("all");
                      setStatusFilter("all");
                    }}
                  >
                    <Text className="text-slate-700 text-sm font-semibold">
                      清除篩選
                    </Text>
                  </Pressable>
                </View>
              )
            }
            contentContainerStyle={{
              paddingBottom: 28,
              paddingHorizontal: 4,
            }}
            style={{ flex: 1 }}
          />
        </View>
      </MainLayout>

      <OrderDetailModal
        order={selectedOrder}
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        statusMeta={orderStatusMeta}
        statusLabelMap={statusLabelMap}
        loading={updateOrderStatus.isPending}
        onPrimaryAction={(order) => handleStatusAction(order)}
        getActionLabel={getActionLabel}
        getNextStatus={getNextStatus}
        onCancel={(order) => handleCancel(order)}
        onDirectStatusChange={(order, status) =>
          handleDirectStatusChange(order, status)
        }
      />
    </>
  );
}
