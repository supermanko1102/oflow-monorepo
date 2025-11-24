import { Palette } from "@/constants/palette";
import type { Order, OrderStatus } from "@/types/order";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type StatusMeta = {
  label: string;
  strip: string;
  badgeBackground: string;
  badgeColor: string;
};

type OrderCardProps = {
  order: Order;
  todayStr: string;
  statusMeta: Record<OrderStatus, StatusMeta>;
  actionLabel: string;
  isActionable: boolean;
  loading?: boolean;
  onPress: (order: Order) => void;
  onAction: (order: Order) => void;
  onCancel?: (order: Order) => void;
};

const brandTeal = Palette.brand.primary;
const brandSlate = Palette.brand.slate;

export function OrderCard({
  order,
  todayStr,
  statusMeta,
  actionLabel,
  isActionable,
  loading,
  onPress,
  onAction,
  onCancel,
}: OrderCardProps) {
  const statusStyle = statusMeta[order.status] || statusMeta.pending;
  const isToday = order.appointmentDate === todayStr;
  const amount = order.totalAmount ?? 0;

  const timeLabel = (() => {
    const date = order.appointmentDate ? new Date(order.appointmentDate) : null;
    const time = order.appointmentTime?.slice(0, 5);
    if (!date) return time || "--:--";
    const today = new Date();
    const labelDate = `${date.getMonth() + 1}/${date.getDate()}`;
    const dayLabel = date.toDateString() === today.toDateString() ? "今天" : labelDate;
    return time ? `${dayLabel} ${time}` : dayLabel;
  })();

  const summary =
    order.items && order.items.length > 0
      ? `${order.items[0].name}${order.items.length > 1 ? ` 等 ${order.items.length} 件` : ""}`
      : "未填寫品項";

  return (
    <Pressable
      key={order.id}
      onPress={() => onPress(order)}
      className="flex-row rounded-3xl bg-white overflow-hidden mb-3 border border-slate-100 "
      style={{ minHeight: 110 }}
    >
      <View className="w-1.5" style={{ backgroundColor: statusStyle.strip }} />

      <View className="flex-1 p-4">
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-bold text-slate-900">{order.customerName}</Text>
            <Text className="text-[11px] text-slate-400">{order.orderNumber || order.id}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View
              className="px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: statusStyle.badgeBackground,
              }}
            >
              <Text className="text-[11px] font-semibold" style={{ color: statusStyle.badgeColor }}>
                {statusStyle.label}
              </Text>
            </View>
            <Text className={`text-xs ${isToday ? "font-bold text-slate-700" : "text-slate-500"}`}>
              {timeLabel}
            </Text>
          </View>
        </View>

        <Text className="text-sm text-slate-600 mb-2">{summary}</Text>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-bold" style={{ color: brandTeal }}>
              ${amount.toLocaleString()}
            </Text>
          </View>
          <Pressable
            onPress={() => onAction(order)}
            disabled={loading}
            className="flex-row items-center gap-2 rounded-full px-3 py-1"
            style={{
              backgroundColor: isActionable ? brandTeal : "#E2E8F0",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <Ionicons name="refresh" size={14} color="#FFFFFF" />
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

        {(order.status === "pending" || order.status === "confirmed" || order.status === "paid") &&
        onCancel ? (
          <Pressable onPress={() => onCancel(order)} disabled={loading} className="mt-2 self-end">
            <Text className="text-[11px] font-semibold text-slate-400 underline">取消訂單</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
