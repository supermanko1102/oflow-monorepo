import { Palette } from "@/constants/palette";
import type { OrderStatus } from "@/types/order";
import { ScrollView, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type StatusFilterKey = "all" | OrderStatus;

type StatusFilter = { key: StatusFilterKey; label: string };
type StatusChipMeta = Record<
  StatusFilterKey,
  { background: string; border: string; color: string; icon?: string }
>;

type Props = {
  pendingCount: number;
  todayCount: number;
  viewScope: "pendingFocus" | "today" | "all";
  onChangeScope: (scope: "pendingFocus" | "today" | "all") => void;
  statusFilter: StatusFilterKey;
  onChangeStatus: (key: StatusFilterKey) => void;
  statusFilters: readonly StatusFilter[];
  statusChipMeta: StatusChipMeta;
};

const brandTeal = Palette.brand.primary;
const brandSlate = Palette.brand.slate;

export function OrderFilters({
  pendingCount,
  todayCount,
  viewScope,
  onChangeScope,
  statusFilter,
  onChangeStatus,
  statusFilters,
  statusChipMeta,
}: Props) {
  const renderStatusChip = (filter: StatusFilter) => {
    const isActive = statusFilter === filter.key;
    const meta = statusChipMeta[filter.key];
    const backgroundColor = isActive ? meta.background : "#FFFFFF";
    const borderColor = isActive ? meta.border : "#E2E8F0";
    const textColor = isActive ? meta.color : "#475569";
    const iconColor = isActive ? (meta.icon ?? meta.color) : "#94A3B8";

    return (
      <Pressable
        key={filter.key}
        onPress={() => onChangeStatus(filter.key)}
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

  return (
    <View className="gap-3 pb-2">
      <View className="gap-1">
        <Text className="text-xl font-bold text-slate-900">訂單管理</Text>
        <Text className="text-sm text-slate-500">先處理待付款與今日到貨，其他稍後追蹤</Text>
      </View>

      <View className="flex-row gap-2">
        {pendingCount > 0 && (
          <Pressable
            onPress={() => onChangeScope("pendingFocus")}
            className="flex-1 rounded-2xl border px-4 py-3"
            style={{
              borderColor: `${brandTeal}33`,
              backgroundColor: `${brandTeal}0d`,
            }}
          >
            <Text className="text-[11px] font-semibold" style={{ color: brandTeal }}>
              待處理
            </Text>
            <Text className="text-lg font-bold text-slate-900">{pendingCount} 筆</Text>
            <Text className="text-xs mt-1" style={{ color: brandSlate }}>
              點一下，僅看待付款/已付款
            </Text>
          </Pressable>
        )}
        {todayCount > 0 && (
          <Pressable
            onPress={() => onChangeScope("today")}
            className="flex-1 rounded-2xl border px-4 py-3"
            style={{
              borderColor: `${brandSlate}33`,
              backgroundColor: `${brandSlate}0d`,
            }}
          >
            <Text className="text-[11px] font-semibold" style={{ color: brandSlate }}>
              今日到貨/取件
            </Text>
            <Text className="text-lg font-bold text-slate-900">{todayCount} 筆</Text>
            <Text className="text-xs mt-1" style={{ color: brandSlate }}>
              點一下，僅看今天
            </Text>
          </Pressable>
        )}
      </View>

      <View className="flex-row items-center gap-2">
        {[
          { label: "待處理", value: "pendingFocus" },
          { label: "今日", value: "today" },
          { label: "全部", value: "all" },
        ].map((opt) => {
          const active = viewScope === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChangeScope(opt.value as "pendingFocus" | "today" | "all")}
              className={`flex-1 rounded-full px-4 py-2 border ${active ? "" : "bg-white border-slate-200"}`}
              style={{
                backgroundColor: active ? brandTeal : "#FFFFFF",
                borderColor: active ? brandTeal : "#E2E8F0",
              }}
            >
              <Text
                className="text-center text-sm font-semibold"
                style={{ color: active ? "#FFFFFF" : brandSlate }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 4 }}
      >
        {statusFilters.map((filter) => renderStatusChip(filter))}
      </ScrollView>
    </View>
  );
}
