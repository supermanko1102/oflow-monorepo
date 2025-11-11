import { Card } from "@/components/native/Card";
import {
  useDeliverySettings,
  useUpdateDeliverySettings,
} from "@/hooks/queries/useDeliverySettings";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/stores/useAuthStore";
import type { DeliverySettings } from "@/types/delivery-settings";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * 配送設定頁面
 * 讓商家設定店取、面交、超商、宅配等配送方式
 */
export default function DeliverySettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  // Auth store
  const currentTeamId = useAuthStore((state) => state.currentTeamId);

  // React Query
  const { data: settings, isLoading } = useDeliverySettings(
    currentTeamId || ""
  );
  const updateSettingsMutation = useUpdateDeliverySettings();

  // Local state
  const [storePickupEnabled, setStorePickupEnabled] = useState(false);
  const [storeAddress, setStoreAddress] = useState("");
  const [businessHours, setBusinessHours] = useState("");

  const [meetupEnabled, setMeetupEnabled] = useState(false);
  const [availableAreas, setAvailableAreas] = useState("");
  const [meetupNote, setMeetupNote] = useState("");

  const [convenienceStoreEnabled, setConvenienceStoreEnabled] = useState(true);
  const [blackCatEnabled, setBlackCatEnabled] = useState(true);

  // 載入設定到 local state
  useEffect(() => {
    if (settings) {
      setStorePickupEnabled(settings.pickup_settings.store_pickup.enabled);
      setStoreAddress(settings.pickup_settings.store_pickup.address || "");
      setBusinessHours(
        settings.pickup_settings.store_pickup.business_hours || ""
      );

      setMeetupEnabled(settings.pickup_settings.meetup.enabled);
      setAvailableAreas(
        settings.pickup_settings.meetup.available_areas.join("、") || ""
      );
      setMeetupNote(settings.pickup_settings.meetup.note || "");

      setConvenienceStoreEnabled(settings.enable_convenience_store);
      setBlackCatEnabled(settings.enable_black_cat);
    }
  }, [settings]);

  // 儲存設定
  const handleSave = async () => {
    if (!currentTeamId) {
      toast.error("請先選擇團隊");
      return;
    }

    // 驗證：如果開啟店取，必須填寫地址
    if (storePickupEnabled && !storeAddress.trim()) {
      Alert.alert("請填寫店面地址", "開啟到店取貨時，店面地址為必填項目");
      return;
    }

    try {
      const newSettings: Partial<DeliverySettings> = {
        pickup_settings: {
          store_pickup: {
            enabled: storePickupEnabled,
            address: storeAddress.trim() || null,
            business_hours: businessHours.trim() || null,
          },
          meetup: {
            enabled: meetupEnabled,
            available_areas: availableAreas
              ? availableAreas.split("、").map((a) => a.trim())
              : [],
            note: meetupNote.trim() || null,
          },
        },
        enable_convenience_store: convenienceStoreEnabled,
        enable_black_cat: blackCatEnabled,
      };

      await updateSettingsMutation.mutateAsync({
        teamId: currentTeamId,
        settings: newSettings,
      });

      toast.success("配送設定已儲存");
      router.back();
    } catch (error) {
      console.error("儲存配送設定失敗:", error);
      toast.error("儲存失敗，請稍後再試");
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-600">載入中...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-white pb-4 px-4 border-b border-gray-200"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Text className="text-3xl font-bold text-gray-900">配送設定</Text>
        <Text className="text-sm text-gray-500 mt-1">設定您提供的配送方式</Text>
      </View>

      {/* 店取設定 */}
      <Card className="mx-4 mt-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-semibold">到店取貨</Text>
          <Switch
            value={storePickupEnabled}
            onValueChange={setStorePickupEnabled}
          />
        </View>

        {storePickupEnabled && (
          <View className="mt-4">
            <Text className="text-sm text-gray-600 mb-2">店面地址 *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              placeholder="例：台北市大安區XX路123號"
              value={storeAddress}
              onChangeText={setStoreAddress}
            />

            <Text className="text-sm text-gray-600 mb-2 mt-4">
              營業時間（可選）
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              placeholder="例：週一至週六 10:00-20:00"
              value={businessHours}
              onChangeText={setBusinessHours}
            />
          </View>
        )}
      </Card>

      {/* 面交設定 */}
      <Card className="mx-4 mt-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-semibold">約定地點面交</Text>
          <Switch value={meetupEnabled} onValueChange={setMeetupEnabled} />
        </View>

        {meetupEnabled && (
          <View className="mt-4">
            <Text className="text-sm text-gray-600 mb-2">
              可面交區域（可選）
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              placeholder="例：台北市、新北市"
              value={availableAreas}
              onChangeText={setAvailableAreas}
            />

            <Text className="text-sm text-gray-600 mb-2 mt-4">
              備註（可選）
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              placeholder="例：請提前一天約定"
              value={meetupNote}
              onChangeText={setMeetupNote}
            />
          </View>
        )}
      </Card>

      {/* 超商取貨 */}
      <Card className="mx-4 mt-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-lg font-semibold">超商取貨</Text>
          <Switch
            value={convenienceStoreEnabled}
            onValueChange={setConvenienceStoreEnabled}
          />
        </View>
      </Card>

      {/* 宅配 */}
      <Card className="mx-4 mt-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-lg font-semibold">宅配（黑貓）</Text>
          <Switch value={blackCatEnabled} onValueChange={setBlackCatEnabled} />
        </View>
      </Card>

      {/* 儲存按鈕 */}
      <View className="p-4">
        <TouchableOpacity
          onPress={handleSave}
          disabled={updateSettingsMutation.isPending}
          className="bg-line-green py-4 rounded-lg items-center"
          activeOpacity={0.7}
          style={{ opacity: updateSettingsMutation.isPending ? 0.6 : 1 }}
        >
          {updateSettingsMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold text-base">儲存設定</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 底部空白 */}
      <View style={{ height: insets.bottom + 20 }} />
    </ScrollView>
  );
}
