import { Palette } from "@/constants/palette";
import type { Order, OrderStatus, DeliveryMethod } from "@/types/order";
import { DELIVERY_METHOD_LABELS, PAYMENT_METHOD_LABELS } from "@/types/order";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

type StatusMeta = {
  label: string;
  strip: string;
  badgeBackground: string;
  badgeColor: string;
};

type Props = {
  order: Order | null;
  visible: boolean;
  statusMeta: Record<OrderStatus, StatusMeta>;
  statusLabelMap: Record<OrderStatus, string>;
  loading?: boolean;
  onClose: () => void;
  onPrimaryAction: (order: Order) => void;
  getActionLabel: (status: OrderStatus) => string;
  getNextStatus: (status: OrderStatus) => OrderStatus | null;
  onCancel: (order: Order) => void;
  onDirectStatusChange: (order: Order, status: OrderStatus) => void;
};

const brandTeal = Palette.brand.primary;
const brandSlate = Palette.brand.slate;

export function OrderDetailModal({
  order,
  visible,
  statusMeta,
  statusLabelMap,
  loading,
  onClose,
  onPrimaryAction,
  getActionLabel,
  getNextStatus,
  onCancel,
  onDirectStatusChange,
}: Props) {
  if (!order) return null;

  const meta = statusMeta[order.status];
  const actionLabel = getActionLabel(order.status);
  const primaryDisabled = !getNextStatus(order.status) || !!loading;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/30" onPress={onClose} />
      <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="flex-row items-start justify-between mb-3">
            <View className="gap-1">
              <Text className="text-xl font-bold text-slate-900">{order.customerName}</Text>
              <Text className="text-xs text-slate-400">{order.orderNumber || order.id}</Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={brandSlate} />
            </Pressable>
          </View>

          <View className="flex-row items-center gap-2 mb-3">
            <View
              className="px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: meta.badgeBackground,
              }}
            >
              <Text className="text-[11px] font-semibold" style={{ color: meta.badgeColor }}>
                {meta.label}
              </Text>
            </View>
            <Text className="text-sm text-slate-600">
              {order.appointmentDate} {order.appointmentTime?.slice(0, 5)}
            </Text>
          </View>

          <View className="gap-2 mb-4">
            <Text className="text-sm font-semibold text-slate-800">配送/取件</Text>
            <View className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
              <Text className="text-sm text-slate-700">
                {DELIVERY_METHOD_LABELS[order.deliveryMethod as DeliveryMethod]}
              </Text>
              {order.shippingAddress ? (
                <Text className="text-xs text-slate-500 mt-1">{order.shippingAddress}</Text>
              ) : null}
              {order.storeInfo ? (
                <Text className="text-xs text-slate-500 mt-1">{order.storeInfo}</Text>
              ) : null}
            </View>
          </View>

          <View className="gap-2 mb-4">
            <Text className="text-sm font-semibold text-slate-800">品項</Text>
            <View className="gap-2 rounded-2xl border border-slate-100 bg-white p-3">
              {order.items.map((item, idx) => (
                <View key={`${order.id}-item-${idx}`} className="flex-row justify-between">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-900">{item.name}</Text>
                    <Text className="text-xs text-slate-500">x{item.quantity}</Text>
                  </View>
                  <Text className="text-sm font-semibold text-slate-800">
                    ${item.price * item.quantity}
                  </Text>
                </View>
              ))}
              <View className="flex-row justify-between pt-2 border-t border-slate-100">
                <Text className="text-sm font-semibold text-slate-700">總計</Text>
                <Text className="text-base font-bold" style={{ color: brandTeal }}>
                  ${order.totalAmount.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-2 mb-4">
            <Text className="text-sm font-semibold text-slate-800">付款</Text>
            <View className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
              <Text className="text-sm text-slate-700">
                {order.paymentMethod
                  ? `付款方式：${PAYMENT_METHOD_LABELS[order.paymentMethod]}`
                  : "尚未收款"}
              </Text>
              {order.paidAt ? (
                <Text className="text-xs text-slate-500 mt-1">
                  收款時間：{new Date(order.paidAt).toLocaleString()}
                </Text>
              ) : null}
            </View>
          </View>

          {(order.notes || order.customerNotes) && (
            <View className="gap-2 mb-4">
              <Text className="text-sm font-semibold text-slate-800">備註</Text>
              {order.notes ? <Text className="text-sm text-slate-700">{order.notes}</Text> : null}
              {order.customerNotes ? (
                <Text className="text-sm text-slate-500">顧客：{order.customerNotes}</Text>
              ) : null}
            </View>
          )}

          <View className="gap-2 mb-4">
            <Text className="text-sm font-semibold text-slate-800">變更狀態</Text>
            <View className="flex-row flex-wrap gap-2">
              {(["pending", "paid", "completed", "cancelled"] as OrderStatus[]).map((status) => {
                const active = order.status === status;
                return (
                  <Pressable
                    key={status}
                    onPress={() => onDirectStatusChange(order, status)}
                    disabled={loading}
                    className="px-3 py-2 rounded-full border"
                    style={{
                      borderColor: active ? brandTeal : "#E2E8F0",
                      backgroundColor: active ? `${brandTeal}1a` : "#FFFFFF",
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: active ? brandTeal : brandSlate }}
                    >
                      {statusLabelMap[status]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Pressable
              onPress={() => onPrimaryAction(order)}
              disabled={primaryDisabled}
              className="rounded-2xl"
              style={{
                backgroundColor: primaryDisabled ? "#CBD5E1" : brandTeal,
              }}
            >
              <View className="py-3 flex-row items-center justify-center gap-2">
                {loading && <ActivityIndicator size="small" color="#FFFFFF" />}
                <Text className="text-white text-base font-semibold">{actionLabel}</Text>
              </View>
            </Pressable>
            {(order.status === "pending" ||
              order.status === "confirmed" ||
              order.status === "paid") && (
              <Pressable
                onPress={() => onCancel(order)}
                disabled={loading}
                className="rounded-2xl border border-slate-200"
              >
                <View className="py-3 flex-row items-center justify-center gap-2">
                  <Text className="text-slate-700 text-base font-semibold">取消訂單</Text>
                </View>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
