import { FutureOrdersSection } from "@/components/FutureOrdersSection";
import { TodaySummaryCard } from "@/components/TodaySummaryCard";
import { TodayTodoList } from "@/components/TodayTodoList";
import { useHaptics } from "@/hooks/useHaptics";
import { useToast } from "@/hooks/useToast";
import type { TimeRange } from "@/types/order";
import { TIME_RANGE_LABELS } from "@/types/order";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// TODO: Menu 需要用 BottomSheet 替換
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const haptics = useHaptics();

  // 時間範圍選擇狀態
  const [timeRange, setTimeRange] = useState<TimeRange>("day");
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View className="flex-1 bg-gray-50">
      {/* 極簡功能型 Header */}
      <View
        className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-100"
        style={[{ paddingTop: insets.top + 16 }]}
      >
        {/* 左側：時間範圍選擇器 */}
        <View>
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              setMenuVisible(!menuVisible);
            }}
            activeOpacity={0.6}
            className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg"
          >
            <Text className="text-sm font-semibold text-gray-700 mr-1">
              {TIME_RANGE_LABELS[timeRange]}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={16}
              color="#374151"
            />
          </TouchableOpacity>

          {/* 下拉選單 */}
          {menuVisible && (
            <View className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              {(["day", "week", "month", "year"] as TimeRange[]).map(
                (range) => (
                  <TouchableOpacity
                    key={range}
                    onPress={() => {}}
                    className="px-4 py-3 border-b border-gray-100"
                    activeOpacity={0.7}
                  >
                    <Text
                      className="text-sm"
                      style={{
                        color: timeRange === range ? "#00B900" : "#374151",
                        fontWeight: timeRange === range ? "600" : "normal",
                      }}
                    >
                      {TIME_RANGE_LABELS[range]}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          )}
        </View>

        {/* 右側：功能圖標 */}
        <View className="flex-row gap-4">
          {/* 通知 icon */}
          <TouchableOpacity
            onPress={() => {}}
            activeOpacity={0.6}
            accessibilityLabel="通知"
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={24}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 可滾動內容 */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {}}
            tintColor="#00B900"
            colors={["#00B900"]}
          />
        }
      >
        {/* 營收統計卡片 */}
        <TodaySummaryCard
          orderCount={0}
          totalRevenue={0}
          timeRange={timeRange}
          paymentStats={{ cash: 0, transfer: 0, other: 0 }}
        />
        {/* 今日訂單列表（待處理 + 已完成） */}
        <TodayTodoList
          pendingOrders={[]}
          completedOrders={[]}
          onToggleComplete={() => {}}
        />

        {/* 未來訂單區塊 */}
        <FutureOrdersSection futureOrders={[]} />

        {/* 底部間距 */}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
