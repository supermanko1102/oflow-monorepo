import { useToast } from "@/hooks/useToast";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Dialog, Portal } from "react-native-paper";

interface InviteCodeDialogProps {
  visible: boolean;
  inviteCode: string;
  teamName: string;
  onDismiss: () => void;
  onRegenerate?: () => void;
}

export function InviteCodeDialog({
  visible,
  inviteCode,
  teamName,
  onDismiss,
  onRegenerate,
}: InviteCodeDialogProps) {
  const toast = useToast();

  const handleCopy = async () => {
    toast.success("已複製邀請碼");
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>邀請成員加入</Dialog.Title>
        <Dialog.Content>
          <Text className="text-sm text-gray-600 mb-4">
            分享此邀請碼給團隊成員，他們就能加入「{teamName}」
          </Text>

          {/* 邀請碼顯示 */}
          <View className="bg-gray-50 rounded-lg p-6 items-center mb-4">
            <Text className="text-xs text-gray-500 mb-2">邀請碼</Text>
            <Text className="text-4xl font-bold text-gray-900 tracking-widest">
              {inviteCode}
            </Text>
          </View>

          {/* 複製按鈕 */}
          <TouchableOpacity
            onPress={handleCopy}
            className="bg-line-green rounded-lg py-3 items-center mb-2"
          >
            <Text className="text-white font-semibold">複製邀請碼</Text>
          </TouchableOpacity>

          {/* 重新生成按鈕 */}
          {onRegenerate && (
            <TouchableOpacity
              onPress={onRegenerate}
              className="py-2 items-center"
            >
              <Text className="text-gray-500 text-sm">重新生成邀請碼</Text>
            </TouchableOpacity>
          )}

          <Text className="text-xs text-gray-400 mt-4 text-center">
            此邀請碼長期有效，可重複使用
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <TouchableOpacity onPress={onDismiss} className="px-4 py-2">
            <Text className="text-gray-600 font-medium">關閉</Text>
          </TouchableOpacity>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
