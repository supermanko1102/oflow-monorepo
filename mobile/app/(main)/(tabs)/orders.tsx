import { MainLayout } from "@/components/layout/MainLayout";
import { IconButton } from "@/components/Navbar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { NoWebhookState } from "@/components/ui/NoWebhookState";
import { Palette } from "@/constants/palette";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useOrders } from "@/hooks/queries/useOrders";
import {
  useToggleProductAvailability,
  useProducts,
} from "@/hooks/queries/useProducts";
import type { Order, OrderStatus } from "@/types/order";
import type { Product } from "@/types/product";
import { useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

type PrimaryTab = "orders" | "products";
type StatusFilterKey = "all" | OrderStatus;

const statusFilters = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待確認" },
  { key: "paid", label: "已付款" },
  { key: "completed", label: "已完成" },
  { key: "cancelled", label: "已取消" },
] as const satisfies { key: StatusFilterKey; label: string }[];

const brandTeal = Palette.brand.primary;
const brandSlate = Palette.brand.slate;

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
    border: "rgba(248, 113, 113, 0.4)",
    color: "#DC2626",
    icon: "#DC2626",
  },
  confirmed: {
    background: "rgba(251, 146, 60, 0.15)",
    border: "rgba(251, 146, 60, 0.4)",
    color: "#EA580C",
    icon: "#EA580C",
  },
  paid: {
    background: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.35)",
    color: "#2563EB",
    icon: "#2563EB",
  },
  completed: {
    background: "rgba(34, 197, 94, 0.15)",
    border: "rgba(34, 197, 94, 0.35)",
    color: "#16A34A",
    icon: "#16A34A",
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
    label: "待確認",
    strip: "#DC2626",
    badgeBackground: "rgba(248, 113, 113, 0.15)",
    badgeColor: "#DC2626",
  },
  confirmed: {
    label: "已確認",
    strip: "#F97316",
    badgeBackground: "rgba(251, 146, 60, 0.15)",
    badgeColor: "#EA580C",
  },
  paid: {
    label: "已付款",
    strip: "#3B82F6",
    badgeBackground: "rgba(59, 130, 246, 0.12)",
    badgeColor: "#2563EB",
  },
  completed: {
    label: "已完成",
    strip: "#22C55E",
    badgeBackground: "rgba(34, 197, 94, 0.15)",
    badgeColor: "#16A34A",
  },
  cancelled: {
    label: "已取消",
    strip: "#94A3B8",
    badgeBackground: "rgba(148, 163, 184, 0.12)",
    badgeColor: "#475569",
  },
};

type OrderItem = {
  id: string;
  orderNo: string;
  timeLabel: string;
  isToday: boolean;
  customer: string;
  summary: string;
  itemCount: number;
  amount: number;
  status: OrderStatus;
};

export default function Orders() {
  const { currentTeam, currentTeamId } = useCurrentTeam();

  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>("orders");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const {
    data: orders = [],
    isLoading,
    isRefetching,
    refetch,
  } = useOrders(
    currentTeamId,
    { status: statusFilter === "all" ? undefined : statusFilter },
    !!currentTeamId
  );

  const {
    data: products = [],
    isLoading: isProductsLoading,
    isRefetching: isProductsRefetching,
    refetch: refetchProducts,
  } = useProducts(currentTeamId, !!currentTeamId);

  const toggleProductAvailability = useToggleProductAvailability();

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const summaryCards = useMemo(() => {
    const todaysOrders = orders.filter(
      (order) => order.appointmentDate === todayStr
    );
    const todaysRevenue = todaysOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );
    const pendingCount = todaysOrders.filter(
      (order) => order.status === "pending"
    ).length;
    const confirmedCount = todaysOrders.filter(
      (order) => order.status === "confirmed"
    ).length;
    const awaitingPayment = orders.filter(
      (order) => order.status === "paid"
    ).length;

    return [
      {
        label: "今日訂單",
        value: `${todaysOrders.length} 筆`,
        description: `待確認 ${pendingCount} · 已確認 ${confirmedCount}`,
        icon: <Ionicons name="reader-outline" size={16} color="#FFFFFF" />,
        highlight: true,
      },
      {
        label: "今日營收",
        value: `$${todaysRevenue.toLocaleString()}`,
        description: "以訂單金額統計",
        icon: <Ionicons name="cash-outline" size={16} color={brandTeal} />,
      },
      {
        label: "已付款",
        value: `${awaitingPayment} 筆`,
        description: "收款已確認",
        icon: <Ionicons name="card-outline" size={16} color={brandSlate} />,
      },
    ];
  }, [orders, todayStr]);

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

  const renderStatusChip = (filter: (typeof statusFilters)[number]) => {
    const isActive = statusFilter === filter.key;
    const meta = statusChipMeta[filter.key];

    const backgroundColor = isActive ? meta.background : "#FFFFFF";
    const borderColor = isActive ? meta.border : "#E2E8F0";
    const textColor = isActive ? meta.color : "#475569";
    const iconColor = isActive ? (meta.icon ?? meta.color) : "#94A3B8";

    return (
      <Pressable
        key={filter.key}
        onPress={() => setStatusFilter(filter.key)}
        className="px-3 py-1.5 rounded-full mr-2 border"
        style={{ backgroundColor, borderColor }}
      >
        <View className="flex-row items-center gap-1">
          {filter.key === "completed" && (
            <Ionicons name="checkmark-circle" size={12} color={iconColor} />
          )}
          <Text className="text-xs font-semibold" style={{ color: textColor }}>
            {filter.label}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderOrderCard = (order: Order) => {
    const statusStyle =
      orderStatusMeta[order.status] || orderStatusMeta.pending;
    const isToday = order.appointmentDate === todayStr;
    const amount = order.totalAmount ?? 0;

    const timeLabel = (() => {
      const date = order.appointmentDate
        ? new Date(order.appointmentDate)
        : null;
      const time = order.appointmentTime?.slice(0, 5);
      if (!date) return time || "--:--";
      const today = new Date();
      const labelDate = `${date.getMonth() + 1}/${date.getDate()}`;
      const dayLabel =
        date.toDateString() === today.toDateString() ? "今天" : labelDate;
      return time ? `${dayLabel} ${time}` : dayLabel;
    })();

    const summary =
      order.items && order.items.length > 0
        ? `${order.items[0].name}${
            order.items.length > 1 ? ` 等 ${order.items.length} 件` : ""
          }`
        : "未填寫品項";

    return (
      <View
        key={order.id}
        className="flex-row rounded-3xl bg-white overflow-hidden mb-3 border border-slate-100 "
        style={{ minHeight: 100 }}
      >
        {/* Status Strip */}
        <View
          className="w-1.5"
          style={{ backgroundColor: statusStyle.strip }}
        />

        {/* Content */}
        <View className="flex-1 p-4">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-bold text-slate-900">
                {order.customerName}
              </Text>
              <Text className="text-xs text-slate-400">
                {order.orderNumber || order.id}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View
                className="px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: statusStyle.badgeBackground,
                }}
              >
                <Text
                  className="text-[11px] font-semibold"
                  style={{ color: statusStyle.badgeColor }}
                >
                  {statusStyle.label}
                </Text>
              </View>
              <Text
                className={`text-xs ${
                  isToday ? "font-bold text-slate-700" : "text-slate-500"
                }`}
              >
                {timeLabel}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
            </View>
          </View>

          {/* Summary */}
          <Text className="text-sm text-slate-600 mb-3">{summary}</Text>

          {/* Price */}
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold" style={{ color: brandTeal }}>
              ${amount.toLocaleString()}
            </Text>
            <Pressable
              onPress={() => console.log("open order detail")}
              className="flex-row items-center gap-1"
            >
              <Text className="text-xs font-semibold text-brand-slate">
                查看詳情
              </Text>
              <Ionicons
                name="arrow-forward-circle"
                size={16}
                color={brandSlate}
              />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderProductRow = (product: Product) => {
    const isOn = product.is_available;
    const toggle = () =>
      toggleProductAvailability.mutate({
        productId: product.id,
        isAvailable: !isOn,
      });

    return (
      <View
        key={product.id}
        className="flex-row items-center p-4 rounded-2xl border border-slate-100 bg-white shadow-[0px_10px_25px_rgba(15,23,42,0.04)] mb-3"
      >
        <View className="relative mr-3">
          <Image
            source={{
              uri:
                product.image_url ||
                "https://placehold.co/100x100/png?text=No+Image",
            }}
            className="w-12 h-12 rounded-xl"
          />
          {!isOn && (
            <View className="absolute inset-0 bg-white/60 rounded-xl" />
          )}
        </View>

        <View className="flex-1">
          <Text
            className={`text-base font-semibold ${
              isOn ? "text-slate-900" : "text-slate-400"
            }`}
          >
            {product.name}
          </Text>
          <Text className="text-sm text-slate-500">
            ${product.price}
            {product.stock !== undefined && ` · 剩餘: ${product.stock}`}
            {product.unit ? ` /${product.unit}` : ""}
          </Text>
          {product.category ? (
            <Text className="text-[11px] text-slate-400 mt-1">
              {product.category}
            </Text>
          ) : null}
        </View>

        <Switch
          value={isOn}
          onValueChange={toggle}
          disabled={toggleProductAvailability.isPending}
          trackColor={{ false: "#CBD5E1", true: brandTeal }}
          thumbColor={"#FFFFFF"}
        />
      </View>
    );
  };

  const renderProductList = () => (
    <ScrollView
      className="pb-20"
      contentContainerStyle={{ paddingBottom: 80 }}
      refreshControl={
        <RefreshControl
          refreshing={isProductsRefetching}
          onRefresh={refetchProducts}
          tintColor={brandTeal}
        />
      }
    >
      {isProductsLoading ? (
        <View className="py-16 items-center justify-center">
          <ActivityIndicator size="large" color={brandTeal} />
          <Text className="text-slate-500 mt-2">載入商品中</Text>
        </View>
      ) : products.length === 0 ? (
        <Text>尚無商品</Text>
      ) : (
        products.map((product) => renderProductRow(product))
      )}
    </ScrollView>
  );

  return (
    <MainLayout
      title="訂單管理"
      teamName={currentTeam?.team_name || "載入中..."}
      centerContent={
        <SegmentedControl
          options={[
            { label: "訂單管理", value: "orders" },
            { label: "商品管理", value: "products" },
          ]}
          value={primaryTab}
          onChange={(val) => setPrimaryTab(val as PrimaryTab)}
          theme="brand"
        />
      }
      rightContent={
        <View className="flex-row items-center gap-2">
          {primaryTab === "orders" ? (
            <IconButton
              icon="add"
              ariaLabel="新增訂單"
              onPress={() => console.log("create order")}
              isDark={false}
            />
          ) : (
            <View />
          )}
        </View>
      }
    >
      {primaryTab === "orders" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={brandTeal}
            />
          }
        >
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-lg font-bold text-brand-slate">
                今日概況
              </Text>
              <Text className="text-xs text-slate-400">即時資料</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="pl-1"
              contentContainerStyle={{ gap: 12, paddingRight: 16 }}
            >
              {summaryCards.map((card) => (
                <SummaryCard key={card.label} {...card} />
              ))}
            </ScrollView>
          </View>

          {/* Sub-Header Tools */}
          <View className="flex-row items-center justify-between mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-1 mr-2"
            >
              {statusFilters.map((filter) => renderStatusChip(filter))}
            </ScrollView>
            <View className="border-l border-gray-200 pl-2">
              <IconButton
                icon={viewMode === "list" ? "list-outline" : "calendar-outline"}
                ariaLabel="切換檢視"
                onPress={() =>
                  setViewMode((v) => (v === "list" ? "calendar" : "list"))
                }
                isDark={false}
              />
            </View>
          </View>

          {/* Order List */}
          <View className="pb-20">
            {isLoading ? (
              <View className="py-16 items-center justify-center">
                <ActivityIndicator size="large" color={brandTeal} />
                <Text className="text-slate-500 mt-2">載入訂單中</Text>
              </View>
            ) : orders.length === 0 ? (
              <Text className="text-slate-500">尚無訂單</Text>
            ) : (
              orders.map((order) => renderOrderCard(order))
            )}
          </View>
        </ScrollView>
      ) : (
        <View className="relative h-full">
          {renderProductList()}

          {/* FAB */}
          <Pressable
            className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-brand-teal items-center justify-center "
            onPress={() => console.log("add product")}
          >
            <Ionicons name="add" size={30} color="white" />
          </Pressable>
        </View>
      )}
    </MainLayout>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  description?: string;
  icon: ReactNode;
  highlight?: boolean;
};

function SummaryCard({
  label,
  value,
  description,
  icon,
  highlight,
}: SummaryCardProps) {
  const backgroundColor = highlight ? brandTeal : "#FFFFFF";
  const textColor = highlight ? "#FFFFFF" : "#0F172A";
  const descriptionColor = highlight ? "rgba(255,255,255,0.7)" : "#64748B";

  return (
    <View
      className="w-48 rounded-3xl border p-4"
      style={{
        backgroundColor,
        borderColor: highlight ? "transparent" : "#E2E8F0",
      }}
    >
      <View
        className="w-10 h-10 rounded-2xl items-center justify-center mb-3"
        style={{
          backgroundColor: highlight ? "rgba(255,255,255,0.2)" : "#F1F5F9",
        }}
      >
        {icon}
      </View>
      <Text
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: descriptionColor }}
      >
        {label}
      </Text>
      <Text className="text-2xl font-bold mt-1" style={{ color: textColor }}>
        {value}
      </Text>
      {description ? (
        <Text className="text-[11px] mt-1" style={{ color: descriptionColor }}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}
