/**
 * 通用 Bottom Sheet 組件
 * 從底部滑入的 Modal，支援標題和內容插槽
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  visible,
  onDismiss,
  title,
  children,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View className="flex-1 justify-end">
          <TouchableWithoutFeedback>
            <View
              className="bg-white rounded-t-2xl"
              style={{
                paddingBottom: Math.max(insets.bottom, 16),
                maxHeight: "80%",
              }}
            >
              {/* Header */}
              {title && (
                <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100">
                  <Text className="text-lg font-bold text-gray-900">
                    {title}
                  </Text>
                  <TouchableOpacity
                    onPress={onDismiss}
                    className="w-10 h-10 items-center justify-center"
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Content */}
              <View className="px-5 py-4">{children}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
