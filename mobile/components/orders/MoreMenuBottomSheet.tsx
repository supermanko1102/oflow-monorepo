/**
 * 訂單更多選單 Bottom Sheet
 * 包含匯出、排序、建立手動訂單等功能
 */

import { BottomSheet } from "@/components/BottomSheet";
import { useHaptics } from "@/hooks/useHaptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface MoreMenuBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onExport: () => void;
  onSort: () => void;
  onCreateManualOrder: () => void;
}

interface MenuItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
  badge?: string;
}

function MenuItem({ icon, label, description, onPress, badge }: MenuItemProps) {
  const haptics = useHaptics();

  return (
    <TouchableOpacity
      className="flex-row items-center py-4 border-b border-gray-100"
      onPress={() => {
        haptics.light();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
        <MaterialCommunityIcons name={icon} size={24} color="#6B7280" />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-semibold text-gray-900">{label}</Text>
          {badge && (
            <View className="bg-amber-100 px-2 py-0.5 rounded-md">
              <Text className="text-xs font-semibold text-amber-800">
                {badge}
              </Text>
            </View>
          )}
        </View>
        {description && (
          <Text className="text-sm text-gray-500 mt-0.5">{description}</Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

export function MoreMenuBottomSheet({
  visible,
  onDismiss,
  onExport,
  onSort,
  onCreateManualOrder,
}: MoreMenuBottomSheetProps) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} title="更多功能">
      <View className="py-2">
        <MenuItem
          icon="file-export-outline"
          label="匯出訂單"
          description="將訂單匯出為 Excel 或 CSV"
          onPress={() => {
            onDismiss();
            onExport();
          }}
          badge="即將推出"
        />
        <MenuItem
          icon="sort"
          label="排序方式"
          description="調整訂單顯示順序"
          onPress={() => {
            onDismiss();
            onSort();
          }}
        />
        <MenuItem
          icon="plus-circle-outline"
          label="建立手動訂單"
          description="手動新增訂單記錄"
          onPress={() => {
            onDismiss();
            onCreateManualOrder();
          }}
          badge="即將推出"
        />
      </View>
    </BottomSheet>
  );
}
