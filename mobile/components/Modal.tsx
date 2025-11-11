/**
 * 統一的 Modal 組件
 * 使用 react-native-modal 提供流暢的動畫和手勢支援
 * 支援兩種模式：Dialog（對話框）和 Full（全屏表單）
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View, ViewStyle } from "react-native";
import ReactNativeModal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ModalMode = "dialog" | "full";

interface ModalProps {
  visible: boolean;
  onDismiss: () => void;
  mode?: ModalMode;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  // 允許外部自訂樣式
  contentStyle?: ViewStyle;
}

export function Modal({
  visible,
  onDismiss,
  mode = "dialog",
  title,
  children,
  showCloseButton = true,
  contentStyle,
}: ModalProps) {
  const insets = useSafeAreaInsets();

  // Dialog 模式：居中顯示，適合確認對話框
  const dialogStyle: ViewStyle = {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    maxHeight: "80%",
  };

  // Full 模式：從底部滑入，適合表單或大量內容
  const fullStyle: ViewStyle = {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Math.max(insets.bottom, 20),
    maxHeight: "95%",
    marginTop: "auto",
  };

  const containerStyle = mode === "dialog" ? dialogStyle : fullStyle;

  return (
    <ReactNativeModal
      isVisible={visible}
      onBackdropPress={onDismiss}
      onSwipeComplete={mode === "full" ? onDismiss : undefined}
      swipeDirection={mode === "full" ? "down" : undefined}
      animationIn={mode === "dialog" ? "fadeIn" : "slideInUp"}
      animationOut={mode === "dialog" ? "fadeOut" : "slideOutDown"}
      backdropOpacity={0.5}
      useNativeDriver={true}
      style={{
        margin: 0,
        justifyContent: mode === "dialog" ? "center" : "flex-end",
      }}
    >
      <View style={[containerStyle, contentStyle]}>
        {/* Header */}
        {(title || showCloseButton) && (
          <View className="flex-row justify-between items-center mb-4">
            {title && (
              <Text className="text-xl font-bold text-gray-900 flex-1">
                {title}
              </Text>
            )}
            {showCloseButton && (
              <TouchableOpacity
                onPress={onDismiss}
                className="w-10 h-10 items-center justify-center -mr-2"
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#6B7280"
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Content */}
        {children}
      </View>
    </ReactNativeModal>
  );
}
