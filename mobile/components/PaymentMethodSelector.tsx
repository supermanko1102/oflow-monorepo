/**
 * 付款方式選擇器 BottomSheet
 * 用於訂單完成時選擇付款方式（現金/轉帳/其他）
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { useHaptics } from "@/hooks/useHaptics";
import {
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICONS,
} from "@/types/order";

interface PaymentMethodSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (method: PaymentMethod) => void;
  title?: string;
}

export function PaymentMethodSelector({
  visible,
  onClose,
  onSelect,
  title = "選擇付款方式",
}: PaymentMethodSelectorProps) {
  const haptics = useHaptics();

  const paymentMethods: PaymentMethod[] = ["cash", "transfer", "other"];

  const handleSelect = (method: PaymentMethod) => {
    haptics.light();
    onSelect(method);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {/* 標題 */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* 付款方式選項 */}
        <View style={styles.options}>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method}
              style={styles.option}
              onPress={() => handleSelect(method)}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}>
                <MaterialCommunityIcons
                  name={PAYMENT_METHOD_ICONS[method] as any}
                  size={28}
                  color="#00B900"
                />
              </View>
              <Text style={styles.optionText}>
                {PAYMENT_METHOD_LABELS[method]}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* 取消按鈕 */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  options: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  cancelButton: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
  },
});

