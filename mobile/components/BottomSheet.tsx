/**
 * 通用 Bottom Sheet 組件
 * 使用 @gorhom/bottom-sheet 提供流暢的手勢支援和動畫效果
 * 支援下拉關閉、拖曳調整高度等進階功能
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";
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
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  // 設定快照點：50% 和 80% 高度，支援手勢拖曳調整
  const snapPoints = useMemo(() => ["50%", "80%"], []);

  // 當 visible 改變時，控制 BottomSheet 的顯示/隱藏
  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  // 自訂背景遮罩組件，點擊時關閉
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  // 當 BottomSheet 關閉時的回調
  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      backgroundStyle={{ backgroundColor: "#FFFFFF" }}
      handleIndicatorStyle={{ backgroundColor: "#D1D5DB" }}
    >
      <BottomSheetView
        style={{
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        {/* Header */}
        {title && (
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100">
            <Text className="text-lg font-bold text-gray-900">{title}</Text>
            <TouchableOpacity
              onPress={onDismiss}
              className="w-10 h-10 items-center justify-center"
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <View className="px-5 py-4">{children}</View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
