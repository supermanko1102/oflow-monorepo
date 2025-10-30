/**
 * 訂單篩選 Bottom Sheet
 * 整合狀態和時間篩選功能
 */

import { BottomSheet } from "@/components/BottomSheet";
import { useHaptics } from "@/hooks/useHaptics";
import { OrderStatus } from "@/types/order";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

type FilterType = "all" | OrderStatus;
type DateFilterType = "all" | "today" | "week" | "future";

interface FilterBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  currentStatusFilter: FilterType;
  currentDateFilter: DateFilterType;
  onApply: (statusFilter: FilterType, dateFilter: DateFilterType) => void;
}

interface RadioOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function RadioOption({ label, selected, onPress }: RadioOptionProps) {
  const haptics = useHaptics();

  return (
    <TouchableOpacity
      className="flex-row items-center py-3"
      onPress={() => {
        haptics.light();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View
        className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
          selected ? "border-line-green" : "border-gray-300"
        }`}
      >
        {selected && (
          <View className="w-2.5 h-2.5 rounded-full bg-line-green" />
        )}
      </View>
      <Text
        className={`text-base ${
          selected ? "text-gray-900 font-semibold" : "text-gray-500"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function FilterBottomSheet({
  visible,
  onDismiss,
  currentStatusFilter,
  currentDateFilter,
  onApply,
}: FilterBottomSheetProps) {
  const haptics = useHaptics();
  const [statusFilter, setStatusFilter] =
    useState<FilterType>(currentStatusFilter);
  const [dateFilter, setDateFilter] =
    useState<DateFilterType>(currentDateFilter);

  // 當 visible 改變時，同步外部狀態
  React.useEffect(() => {
    if (visible) {
      setStatusFilter(currentStatusFilter);
      setDateFilter(currentDateFilter);
    }
  }, [visible, currentStatusFilter, currentDateFilter]);

  const handleReset = () => {
    haptics.light();
    setStatusFilter("all");
    setDateFilter("all");
  };

  const handleApply = () => {
    haptics.success();
    onApply(statusFilter, dateFilter);
    onDismiss();
  };

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} title="篩選訂單">
      <ScrollView
        style={{ maxHeight: 500 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 狀態篩選 */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">
            訂單狀態
          </Text>
          <RadioOption
            label="全部"
            selected={statusFilter === "all"}
            onPress={() => setStatusFilter("all")}
          />
          <RadioOption
            label="待處理"
            selected={statusFilter === "pending"}
            onPress={() => setStatusFilter("pending")}
          />
          <RadioOption
            label="已完成"
            selected={statusFilter === "completed"}
            onPress={() => setStatusFilter("completed")}
          />
        </View>

        {/* 時間篩選 */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">
            時間範圍
          </Text>
          <RadioOption
            label="全部時間"
            selected={dateFilter === "all"}
            onPress={() => setDateFilter("all")}
          />
          <RadioOption
            label="今天"
            selected={dateFilter === "today"}
            onPress={() => setDateFilter("today")}
          />
          <RadioOption
            label="本週"
            selected={dateFilter === "week"}
            onPress={() => setDateFilter("week")}
          />
          <RadioOption
            label="未來"
            selected={dateFilter === "future"}
            onPress={() => setDateFilter("future")}
          />
        </View>

        {/* 操作按鈕 */}
        <View className="flex-row gap-3 mt-2 pt-4 border-t border-gray-100">
          <TouchableOpacity
            className="flex-1 py-3.5 rounded-xl bg-gray-100 items-center"
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Text className="text-base font-semibold text-gray-500">重置</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-[2] py-3.5 rounded-xl bg-line-green items-center"
            onPress={handleApply}
            activeOpacity={0.7}
          >
            <Text className="text-base font-semibold text-white">確認</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
