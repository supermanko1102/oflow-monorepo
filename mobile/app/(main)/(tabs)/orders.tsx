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
import {
  useCreateProduct,
  useProducts,
  useToggleProductAvailability,
  useUpdateProduct,
} from "@/hooks/queries/useProducts";
import { OrderCard } from "@/components/orders/OrderCard";
import { OrderDetailModal } from "@/components/orders/OrderDetailModal";
import { OrderFilters } from "@/components/orders/OrderFilters";
import {
  deliveryMethodLabels as productDeliveryMethodLabels,
  type DeliveryMethod as ProductDeliveryMethod,
} from "@/types/delivery-settings";
import {
  DELIVERY_METHOD_LABELS,
  type Order,
  type OrderStatus,
  type DeliveryMethod as OrderDeliveryMethod,
} from "@/types/order";
import type { Product, ProductFormValues } from "@/types/product";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  Switch,
  Text,
  View,
} from "react-native";
import ProductForm from "@/components/form/ProductForm";

type PrimaryTab = "orders" | "products";
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

  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>("orders");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [viewScope, setViewScope] = useState<ViewScope>("pendingFocus");
  const [deliveryModalProduct, setDeliveryModalProduct] =
    useState<Product | null>(null);
  const [useTeamDeliveryDefault, setUseTeamDeliveryDefault] = useState(true);
  const [selectedMethods, setSelectedMethods] = useState<
    ProductDeliveryMethod[]
  >([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const updateOrderStatus = useUpdateOrderStatus();
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

  const {
    data: products = [],
    isLoading: isProductsLoading,
    isRefetching: isProductsRefetching,
    refetch: refetchProducts,
  } = useProducts(currentTeamId, !!currentTeamId);

  const createProduct = useCreateProduct();
  const updateProductDelivery = useUpdateProduct();
  const updateProductInfo = useUpdateProduct();
  const toggleProductAvailability = useToggleProductAvailability();
  const deliveryOptions: { key: ProductDeliveryMethod; label: string }[] = [
    { key: "pickup", label: productDeliveryMethodLabels.pickup },
    { key: "meetup", label: productDeliveryMethodLabels.meetup },
    {
      key: "convenience_store",
      label: productDeliveryMethodLabels.convenience_store,
    },
    { key: "black_cat", label: productDeliveryMethodLabels.black_cat },
  ];

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const now = new Date();

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

  const isUrgent = (order: Order) => {
    const ts = getOrderTimestamp(order);
    if (!ts) return false;
    const diffMs = ts.getTime() - now.getTime();
    const oneHour = 60 * 60 * 1000;
    if (diffMs < 0) return true; // 逾期
    return diffMs <= oneHour && order.appointmentDate === todayStr;
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

    // 排序：緊急 > 今天 > 明天 > 其他，且時間近在上；狀態優先序
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

      const urgencyA = isUrgent(a) ? 1 : 0;
      const urgencyB = isUrgent(b) ? 1 : 0;
      if (urgencyA !== urgencyB) return urgencyB - urgencyA;

      if (a.appointmentDate === todayStr && b.appointmentDate !== todayStr)
        return -1;
      if (b.appointmentDate === todayStr && a.appointmentDate !== todayStr)
        return 1;

      if (tsA !== tsB) return tsA - tsB;
      return statusPriority[a.status] - statusPriority[b.status];
    });
  }, [orders, statusFilter, viewScope, todayStr, now]);

  const sectionedOrders = useMemo(() => {
    const sections: { title: string; data: Order[] }[] = [];
    const urgent = scopeFilteredOrders.filter((o) => isUrgent(o));
    const todayOrders = scopeFilteredOrders.filter(
      (o) => o.appointmentDate === todayStr && !isUrgent(o)
    );
    const tomorrowStr = (() => {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      return t.toISOString().split("T")[0];
    })();
    const tomorrow = scopeFilteredOrders.filter(
      (o) => o.appointmentDate === tomorrowStr && !isUrgent(o)
    );
    const later = scopeFilteredOrders.filter(
      (o) =>
        o.appointmentDate !== todayStr &&
        o.appointmentDate !== tomorrowStr &&
        o.appointmentDate
    );
    const noDate = scopeFilteredOrders.filter((o) => !o.appointmentDate);

    if (urgent.length > 0) sections.push({ title: "緊急/逾期", data: urgent });
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

  const openDeliveryModal = (product: Product) => {
    setDeliveryModalProduct(product);
    const override = product.delivery_override;
    setUseTeamDeliveryDefault(override?.use_team_default ?? true);
    if (override?.use_team_default === false && override.methods) {
      setSelectedMethods(override.methods);
    } else {
      setSelectedMethods(product.effective_delivery_methods || []);
    }
  };

  const closeDeliveryModal = () => {
    setDeliveryModalProduct(null);
    setSelectedMethods([]);
    setUseTeamDeliveryDefault(true);
  };

  const toggleMethod = (method: ProductDeliveryMethod) => {
    setSelectedMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    );
  };

  const saveProductDelivery = async () => {
    if (!deliveryModalProduct) return;
    if (!useTeamDeliveryDefault && selectedMethods.length === 0) {
      Alert.alert("請選擇配送方式", "自訂配送時至少需選擇一種方式");
      return;
    }

    try {
      await updateProductDelivery.mutateAsync({
        productId: deliveryModalProduct.id,
        data: {
          delivery_override: useTeamDeliveryDefault
            ? { use_team_default: true }
            : {
                use_team_default: false,
                methods: selectedMethods,
              },
        },
      });
      closeDeliveryModal();
    } catch (error) {
      console.error("[Product] 更新配送設定失敗", error);
      Alert.alert("更新失敗", "請稍後再試");
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
  };

  const closeEditModal = () => {
    setEditingProduct(null);
  };

  const submitCreateProduct = async (values: ProductFormValues) => {
    if (!currentTeamId) {
      Alert.alert("錯誤", "尚未選擇團隊");
      return;
    }
    if (!values.useTeamDeliveryDefault && values.methods.length === 0) {
      Alert.alert("請選擇配送方式", "自訂配送時至少需選擇一種方式");
      return;
    }

    try {
      await createProduct.mutateAsync({
        team_id: currentTeamId,
        name: values.name.trim(),
        price: Number(values.price),
        description: values.description?.trim() || undefined,
        category: values.category?.trim() || undefined,
        stock: values.stock ? Number(values.stock) : undefined,
        is_available: values.is_available,
        delivery_override: values.useTeamDeliveryDefault
          ? { use_team_default: true }
          : {
              use_team_default: false,
              methods: values.methods,
            },
      });
      closeCreateModal();
    } catch (error) {
      console.error("[Product] 建立商品失敗", error);
      Alert.alert("建立失敗", "請稍後再試");
    }
  };

  const submitUpdateProduct = async (values: ProductFormValues) => {
    if (!editingProduct) return;
    if (!values.useTeamDeliveryDefault && values.methods.length === 0) {
      Alert.alert("請選擇配送方式", "自訂配送時至少需選擇一種方式");
      return;
    }

    try {
      await updateProductInfo.mutateAsync({
        productId: editingProduct.id,
        data: {
          name: values.name.trim(),
          price: Number(values.price),
          description: values.description?.trim() || undefined,
          category: values.category?.trim() || undefined,
          stock: values.stock ? Number(values.stock) : undefined,
          is_available: values.is_available,
          delivery_override: values.useTeamDeliveryDefault
            ? { use_team_default: true }
            : {
                use_team_default: false,
                methods: values.methods,
              },
        },
      });
      closeEditModal();
    } catch (error) {
      console.error("[Product] 更新商品失敗", error);
      Alert.alert("更新失敗", "請稍後再試");
    }
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
    const actionLabel = getActionLabel(order.status);
    const isActionable = actionLabel !== "查看詳情";

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
      <Pressable
        key={order.id}
        onPress={() => setSelectedOrder(order)}
        className="flex-row rounded-3xl bg-white overflow-hidden mb-3 border border-slate-100 "
        style={{ minHeight: 110 }}
      >
        {/* Status Strip */}
        <View
          className="w-1.5"
          style={{ backgroundColor: statusStyle.strip }}
        />

        {/* Content */}
        <View className="flex-1 p-4">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-slate-900">
                {order.customerName}
              </Text>
              <Text className="text-[11px] text-slate-400">
                {order.orderNumber || order.id}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
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
            </View>
          </View>

          {/* Summary */}
          <Text className="text-sm text-slate-600 mb-2">{summary}</Text>

          {/* Price */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text
                className="text-base font-bold"
                style={{ color: brandTeal }}
              >
                ${amount.toLocaleString()}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                isActionable
                  ? handleStatusAction(order)
                  : console.log("open order detail")
              }
              disabled={updateOrderStatus.isPending}
              className="flex-row items-center gap-2 rounded-full px-3 py-1"
              style={{
                backgroundColor: isActionable ? brandTeal : "#E2E8F0",
                opacity: updateOrderStatus.isPending ? 0.6 : 1,
              }}
            >
              {updateOrderStatus.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={isActionable ? "checkmark" : "arrow-forward"}
                  size={14}
                  color={isActionable ? "#FFFFFF" : brandSlate}
                />
              )}
              <Text
                className="text-xs font-semibold"
                style={{ color: isActionable ? "#FFFFFF" : brandSlate }}
              >
                {actionLabel}
              </Text>
            </Pressable>
          </View>

          {order.status === "pending" ||
          order.status === "confirmed" ||
          order.status === "paid" ? (
            <Pressable
              onPress={() => handleCancel(order)}
              disabled={updateOrderStatus.isPending}
              className="mt-2 self-end"
            >
              <Text className="text-[11px] font-semibold text-slate-400 underline">
                取消訂單
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
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
          </Text>
          {product.category ? (
            <Text className="text-[11px] text-slate-400 mt-1">
              {product.category}
            </Text>
          ) : null}
          {product.effective_delivery_methods &&
          product.effective_delivery_methods.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 mt-2">
              {product.effective_delivery_methods.map((method) => (
                <View
                  key={`${product.id}-${method}`}
                  className="px-2 py-1 rounded-full bg-slate-100"
                >
                  <Text className="text-[11px] font-semibold text-slate-600">
                    {productDeliveryMethodLabels[method]}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-[11px] text-slate-400 mt-2">
              沿用全店配送設定
            </Text>
          )}

          <View className="flex-row items-center gap-3 mt-2">
            <Pressable
              onPress={() => openEditModal(product)}
              className="flex-row items-center gap-1"
            >
              <Ionicons name="create-outline" size={14} color={brandSlate} />
              <Text className="text-[12px] font-semibold text-brand-slate">
                編輯
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openDeliveryModal(product)}
              className="flex-row items-center gap-1"
            >
              <Ionicons name="bicycle-outline" size={14} color={brandSlate} />
              <Text className="text-[12px] font-semibold text-brand-slate">
                配送設定
              </Text>
            </Pressable>
          </View>
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

  const editingProductDefaults: Partial<ProductFormValues> | undefined =
    editingProduct
      ? {
          name: editingProduct.name,
          price: editingProduct.price.toString(),
          category: editingProduct.category || "",
          description: editingProduct.description || "",
          stock:
            editingProduct.stock !== undefined
              ? editingProduct.stock.toString()
              : "",
          is_available: editingProduct.is_available,
          useTeamDeliveryDefault:
            editingProduct.delivery_override?.use_team_default ?? true,
          methods:
            editingProduct.delivery_override?.methods ||
            editingProduct.effective_delivery_methods ||
            [],
        }
      : undefined;

  return (
    <>
      <MainLayout
        title="訂單管理"
        teamName={currentTeam?.team_name || "載入中..."}
        scrollable={false}
        centerContent={<View />}
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
                    onAction={(order) => (isActionable ? handleStatusAction(order) : setSelectedOrder(order))}
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
        ) : (
          <View className="relative h-full">
            {renderProductList()}

            {/* FAB */}
            <Pressable
              className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-brand-teal items-center justify-center "
              onPress={openCreateModal}
            >
              <Ionicons name="add" size={30} color="white" />
            </Pressable>
          </View>
        )}
      </MainLayout>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={closeCreateModal}
      >
        <Pressable className="flex-1 bg-black/30" onPress={closeCreateModal} />
        <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
          <ProductForm
            onSubmit={submitCreateProduct}
            onCancel={closeCreateModal}
            isSubmitting={createProduct.isPending}
          />
        </View>
      </Modal>

      <Modal
        visible={!!editingProduct}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <Pressable className="flex-1 bg-black/30" onPress={closeEditModal} />
        <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
          <ProductForm
            key={editingProduct?.id || "edit-product"}
            mode="edit"
            defaultValues={editingProductDefaults}
            onSubmit={submitUpdateProduct}
            onCancel={closeEditModal}
            isSubmitting={updateProductInfo.isPending}
          />
        </View>
      </Modal>

      <Modal
        visible={!!deliveryModalProduct}
        transparent
        animationType="slide"
        onRequestClose={closeDeliveryModal}
      >
        <Pressable
          className="flex-1 bg-black/30"
          onPress={closeDeliveryModal}
        />
        <View className="bg-white rounded-t-3xl p-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-slate-900">
              {deliveryModalProduct?.name || "配送設定"}
            </Text>
            <Pressable onPress={closeDeliveryModal}>
              <Ionicons name="close" size={20} color="#475569" />
            </Pressable>
          </View>
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-slate-800">
                  沿用全店設定
                </Text>
                <Text className="text-[12px] text-slate-500">
                  依照「設定」中的配送方式，不另做限制
                </Text>
              </View>
              <Switch
                value={useTeamDeliveryDefault}
                onValueChange={setUseTeamDeliveryDefault}
                trackColor={{ false: "#CBD5E1", true: brandTeal }}
              />
            </View>

            {!useTeamDeliveryDefault && (
              <View className="gap-2">
                <Text className="text-sm font-semibold text-slate-800">
                  自訂配送方式
                </Text>
                <Text className="text-[12px] text-slate-500">
                  至少選一種，未勾選的方式將不可用
                </Text>
                <View className="flex-row flex-wrap gap-2 mt-2">
                  {deliveryOptions.map((opt) => {
                    const isActive = selectedMethods.includes(opt.key);
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => toggleMethod(opt.key)}
                        className="px-3 py-2 rounded-full border"
                        style={{
                          borderColor: isActive ? brandTeal : "#CBD5E1",
                          backgroundColor: isActive
                            ? "rgba(14,165,233,0.08)"
                            : "#FFFFFF",
                        }}
                      >
                        <View className="flex-row items-center gap-1">
                          <Ionicons
                            name={
                              isActive ? "checkbox-outline" : "square-outline"
                            }
                            size={16}
                            color={isActive ? brandTeal : "#94A3B8"}
                          />
                          <Text
                            className="text-sm font-semibold"
                            style={{
                              color: isActive ? brandTeal : "#475569",
                            }}
                          >
                            {opt.label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View className="gap-3 mt-4">
              <Pressable
                onPress={saveProductDelivery}
                disabled={updateProductDelivery.isPending}
                className="rounded-2xl"
                style={{
                  backgroundColor: updateProductDelivery.isPending
                    ? "#94A3B8"
                    : brandTeal,
                }}
              >
                <View className="py-3 flex-row items-center justify-center gap-2">
                  {updateProductDelivery.isPending && (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  )}
                  <Text className="text-white text-base font-semibold">
                    儲存
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={closeDeliveryModal}
                disabled={updateProductDelivery.isPending}
                className="rounded-2xl border border-slate-200"
              >
                <View className="py-3 flex-row items-center justify-center gap-2">
                  <Text className="text-slate-700 text-base font-semibold">
                    取消
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
