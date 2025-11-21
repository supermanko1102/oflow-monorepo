import { MainLayout } from "@/components/layout/MainLayout";
import { IconButton } from "@/components/Navbar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState } from "@/components/ui/EmptyState";
import { NoWebhookState } from "@/components/ui/NoWebhookState";
import { Palette } from "@/constants/palette";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useMemo, useState, type ReactNode } from "react";
import { Image, Pressable, ScrollView, Switch, Text, View } from "react-native";

type OrderStatus = "pending" | "processing" | "payment_pending" | "completed";
type PrimaryTab = "orders" | "products";
type StatusFilterKey = "all" | OrderStatus;

const statusFilters = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待確認" },
  { key: "processing", label: "製作中" },
  { key: "payment_pending", label: "待付款" },
  { key: "completed", label: "已完成" },
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
  processing: {
    background: "rgba(251, 146, 60, 0.15)",
    border: "rgba(251, 146, 60, 0.4)",
    color: "#EA580C",
    icon: "#EA580C",
  },
  payment_pending: {
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
  processing: {
    label: "製作中",
    strip: "#F97316",
    badgeBackground: "rgba(251, 146, 60, 0.15)",
    badgeColor: "#EA580C",
  },
  payment_pending: {
    label: "待付款",
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

type ProductItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  isOn: boolean;
  stock?: number;
};

export default function Orders() {
  const { currentTeam } = useCurrentTeam();

  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>("orders");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Mock Orders
  const orders = useMemo<OrderItem[]>(
    () => [
      {
        id: "o1",
        orderNo: "#202401",
        timeLabel: "今天 14:00",
        isToday: true,
        customer: "王小明",
        summary: "草莓鮮奶油蛋糕 6寸",
        itemCount: 1,
        amount: 1250,
        status: "pending",
      },
      {
        id: "o2",
        orderNo: "#202402",
        timeLabel: "今天 16:30",
        isToday: true,
        customer: "陳小姐",
        summary: "檸檬塔",
        itemCount: 3,
        amount: 960,
        status: "processing",
      },
      {
        id: "o3",
        orderNo: "#202399",
        timeLabel: "11/20 14:00",
        isToday: false,
        customer: "林先生",
        summary: "綜合禮盒",
        itemCount: 5,
        amount: 2800,
        status: "payment_pending",
      },
    ],
    []
  );

  // Mock Products
  const [products, setProducts] = useState<ProductItem[]>([
    {
      id: "p1",
      name: "草莓鮮奶油蛋糕",
      price: 1250,
      image: "https://placehold.co/100x100/png",
      isOn: true,
      stock: 5,
    },
    {
      id: "p2",
      name: "經典檸檬塔",
      price: 320,
      image: "https://placehold.co/100x100/png",
      isOn: true,
      stock: 12,
    },
    {
      id: "p3",
      name: "季節限定水果塔",
      price: 450,
      image: "https://placehold.co/100x100/png",
      isOn: false,
      stock: 0,
    },
  ]);

  const toggleProduct = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isOn: !p.isOn } : p))
    );
  };

  const summaryCards = useMemo(() => {
    const todaysOrders = orders.filter((order) => order.isToday);
    const todaysRevenue = todaysOrders.reduce(
      (sum, order) => sum + order.amount,
      0
    );
    const pendingCount = todaysOrders.filter(
      (order) => order.status === "pending"
    ).length;
    const processingCount = todaysOrders.filter(
      (order) => order.status === "processing"
    ).length;
    const awaitingPayment = orders.filter(
      (order) => order.status === "payment_pending"
    ).length;

    return [
      {
        label: "今日訂單",
        value: `${todaysOrders.length} 筆`,
        description: `待確認 ${pendingCount} · 製作中 ${processingCount}`,
        icon: <Ionicons name="reader-outline" size={16} color="#FFFFFF" />,
        highlight: true,
      },
      {
        label: "今日營收",
        value: `$${todaysRevenue.toLocaleString()}`,
        description: "含預約訂單 2 筆",
        icon: <Ionicons name="cash-outline" size={16} color={brandTeal} />,
      },
      {
        label: "待付款",
        value: `${awaitingPayment} 筆`,
        description: "提醒顧客完成付款",
        icon: <Ionicons name="card-outline" size={16} color={brandSlate} />,
      },
    ];
  }, [orders]);

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

  const renderOrderCard = (order: OrderItem) => {
    const statusStyle = orderStatusMeta[order.status];

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
                {order.customer}
              </Text>
              <Text className="text-xs text-slate-400">{order.orderNo}</Text>
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
                  order.isToday ? "font-bold text-slate-700" : "text-slate-500"
                }`}
              >
                {order.timeLabel}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
            </View>
          </View>

          {/* Summary */}
          <Text className="text-sm text-slate-600 mb-3">
            {order.summary}
            {order.itemCount > 1 ? ` 等 ${order.itemCount} 件商品` : ""}
          </Text>

          {/* Price */}
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold" style={{ color: brandTeal }}>
              ${order.amount.toLocaleString()}
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

  const renderProductRow = (product: ProductItem) => (
    <View
      key={product.id}
      className="flex-row items-center p-4 rounded-2xl border border-slate-100 bg-white shadow-[0px_10px_25px_rgba(15,23,42,0.04)] mb-3"
    >
      <View className="relative mr-3">
        <Image
          source={{ uri: product.image }}
          className="w-12 h-12 rounded-xl"
        />
        {!product.isOn && (
          <View className="absolute inset-0 bg-white/60 rounded-xl" />
        )}
      </View>

      <View className="flex-1">
        <Text
          className={`text-base font-semibold ${
            product.isOn ? "text-slate-900" : "text-slate-400"
          }`}
        >
          {product.name}
        </Text>
        <Text className="text-sm text-slate-500">
          ${product.price}
          {product.stock !== undefined && ` · 剩餘: ${product.stock}`}
        </Text>
      </View>

      <Switch
        value={product.isOn}
        onValueChange={() => toggleProduct(product.id)}
        trackColor={{ false: "#CBD5E1", true: brandTeal }}
        thumbColor={"#FFFFFF"}
      />
    </View>
  );

  return (
    <MainLayout
      title="訂單管理"
      teamName="甜點工作室 A"
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
        <View>
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-lg font-bold text-brand-slate">
                今日概況
              </Text>
              <Text className="text-xs text-slate-400">模擬資料</Text>
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
            {orders.map((order) => renderOrderCard(order))}
          </View>
        </View>
      ) : (
        <View className="relative h-full">
          {/* Product List */}
          <ScrollView
            className="pb-20"
            contentContainerStyle={{ paddingBottom: 80 }}
          >
            {products.map((product) => renderProductRow(product))}
          </ScrollView>

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
