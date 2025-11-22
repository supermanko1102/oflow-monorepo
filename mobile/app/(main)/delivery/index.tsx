import { MainLayout } from "@/components/layout/MainLayout";
import { Palette } from "@/constants/palette";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import {
  useDeliverySettings,
  useUpdateDeliverySettings,
} from "@/hooks/queries/useDeliverySettings";
import {
  defaultDeliverySettings,
  deliveryMethodLabels,
  type DeliveryMethod,
  type DeliverySettings,
} from "@/types/delivery-settings";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

type FormState = DeliverySettings & { meetupAreasText: string };

export default function DeliverySettingsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const { currentTeam, currentTeamId } = useCurrentTeam();
  const {
    data: settings,
    isLoading,
    isRefetching,
    refetch,
  } = useDeliverySettings(currentTeamId || "", !!currentTeamId);
  const updateDeliverySettings = useUpdateDeliverySettings();

  const [form, setForm] = useState<FormState>({
    ...defaultDeliverySettings,
    meetupAreasText: "",
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      ...settings,
      meetupAreasText:
        settings.pickup_settings.meetup.available_areas.join("、"),
    });
  }, [settings]);

  const isSaving = updateDeliverySettings.isPending;
  const isBusy = isLoading || isRefetching;

  const availableFlags = useMemo(() => {
    const flags: { key: DeliveryMethod; label: string }[] = [];
    if (form.pickup_settings.store_pickup.enabled) {
      flags.push({ key: "pickup", label: deliveryMethodLabels.pickup });
    }
    if (form.pickup_settings.meetup.enabled) {
      flags.push({ key: "meetup", label: deliveryMethodLabels.meetup });
    }
    if (form.enable_convenience_store) {
      flags.push({
        key: "convenience_store",
        label: deliveryMethodLabels.convenience_store,
      });
    }
    if (form.enable_black_cat) {
      flags.push({ key: "black_cat", label: deliveryMethodLabels.black_cat });
    }
    return flags;
  }, [form]);

  const handleSave = async () => {
    if (!currentTeamId) return;

    const payload: DeliverySettings = {
      pickup_settings: {
        store_pickup: {
          enabled: form.pickup_settings.store_pickup.enabled,
          address: form.pickup_settings.store_pickup.address,
          business_hours: form.pickup_settings.store_pickup.business_hours,
        },
        meetup: {
          enabled: form.pickup_settings.meetup.enabled,
          available_areas: splitAreas(form.meetupAreasText),
          note: form.pickup_settings.meetup.note,
        },
      },
      enable_convenience_store: form.enable_convenience_store,
      enable_black_cat: form.enable_black_cat,
    };

    try {
      await updateDeliverySettings.mutateAsync({
        teamId: currentTeamId,
        settings: payload,
      });
      Alert.alert("已儲存", "配送設定已更新");
    } catch (error) {
      console.error("[DeliverySettings] 儲存失敗", error);
      Alert.alert("儲存失敗", "請稍後再試");
    }
  };

  return (
    <MainLayout
      title="配送設定"
      subtitle="設定店取、面交、超商與宅配"
      teamName={currentTeam?.team_name || "載入中..."}
      showActions={false}
      rightContent={
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center border"
          style={{
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "#F8FAFC",
            borderColor: isDark ? "#1F2937" : "#E2E8F0",
          }}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={isDark ? "#F8FAFC" : "#0F172A"}
          />
        </Pressable>
      }
    >
      <ScrollView
        className="pb-12"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4">
          <Text className="text-sm text-slate-600">
            配送方式會同步影響 AI
            建單與商品可售方式。全店預設設定在這裡，商品可在「商品管理」內覆蓋。
          </Text>
        </View>

        {isBusy ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color={Palette.brand.primary} />
            <Text className="text-slate-500 mt-2">載入配送設定...</Text>
          </View>
        ) : (
          <>
            <CardSection
              title="店取"
              description="開啟後請填寫店取地址與營業時間"
              rightAction={
                <Switch
                  value={form.pickup_settings.store_pickup.enabled}
                  onValueChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      pickup_settings: {
                        ...prev.pickup_settings,
                        store_pickup: {
                          ...prev.pickup_settings.store_pickup,
                          enabled: val,
                        },
                        meetup: prev.pickup_settings.meetup,
                      },
                    }))
                  }
                  trackColor={{
                    false: "#CBD5E1",
                    true: Palette.brand.primary,
                  }}
                />
              }
            >
              {form.pickup_settings.store_pickup.enabled && (
                <View className="gap-3">
                  <InputRow
                    label="店取地址"
                    placeholder="例：台北市信義區松仁路 123 號"
                    value={form.pickup_settings.store_pickup.address ?? ""}
                    onChangeText={(text) =>
                      setForm((prev) => ({
                        ...prev,
                        pickup_settings: {
                          ...prev.pickup_settings,
                          store_pickup: {
                            ...prev.pickup_settings.store_pickup,
                            address: text,
                          },
                        },
                      }))
                    }
                  />
                  <InputRow
                    label="營業時間"
                    placeholder="例：每日 10:00 - 19:00"
                    value={
                      form.pickup_settings.store_pickup.business_hours ?? ""
                    }
                    onChangeText={(text) =>
                      setForm((prev) => ({
                        ...prev,
                        pickup_settings: {
                          ...prev.pickup_settings,
                          store_pickup: {
                            ...prev.pickup_settings.store_pickup,
                            business_hours: text,
                          },
                        },
                      }))
                    }
                  />
                </View>
              )}
            </CardSection>

            <CardSection
              title="面交"
              description="約定地點交貨，可設定可面交區域與備註"
              rightAction={
                <Switch
                  value={form.pickup_settings.meetup.enabled}
                  onValueChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      pickup_settings: {
                        ...prev.pickup_settings,
                        meetup: {
                          ...prev.pickup_settings.meetup,
                          enabled: val,
                        },
                      },
                    }))
                  }
                  trackColor={{
                    false: "#CBD5E1",
                    true: Palette.brand.primary,
                  }}
                />
              }
            >
              {form.pickup_settings.meetup.enabled && (
                <View className="gap-3">
                  <InputRow
                    label="可面交區域"
                    placeholder="以、分隔，例：信義區、內湖區"
                    value={form.meetupAreasText}
                    onChangeText={(text) =>
                      setForm((prev) => ({ ...prev, meetupAreasText: text }))
                    }
                  />
                  <InputRow
                    label="備註"
                    placeholder="例：週末僅限信義區，需提前 1 天預約"
                    value={form.pickup_settings.meetup.note ?? ""}
                    onChangeText={(text) =>
                      setForm((prev) => ({
                        ...prev,
                        pickup_settings: {
                          ...prev.pickup_settings,
                          meetup: {
                            ...prev.pickup_settings.meetup,
                            note: text,
                          },
                        },
                      }))
                    }
                  />
                </View>
              )}
            </CardSection>

            <CardSection
              title="其他配送"
              description="超商/宅配將同步影響 AI 建單"
            >
              <ToggleRow
                label="超商取貨"
                value={form.enable_convenience_store}
                onChange={(val) =>
                  setForm((prev) => ({
                    ...prev,
                    enable_convenience_store: val,
                  }))
                }
              />
              <View className="h-[1px] bg-slate-100 my-2" />
              <ToggleRow
                label="宅配/黑貓"
                value={form.enable_black_cat}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, enable_black_cat: val }))
                }
              />
            </CardSection>

            <CardSection
              title="已啟用方式"
              description="商品若未自訂，將繼承這些方式"
            >
              {availableFlags.length === 0 ? (
                <Text className="text-sm text-slate-500">
                  尚未啟用任何配送方式
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {availableFlags.map((flag) => (
                    <Badge key={flag.key} label={flag.label} />
                  ))}
                </View>
              )}
            </CardSection>

            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className="mt-4 rounded-2xl"
              style={{
                backgroundColor: isSaving ? "#94A3B8" : Palette.brand.primary,
              }}
            >
              <View className="py-3 px-4 flex-row items-center justify-center gap-2">
                {isSaving && <ActivityIndicator size="small" color="#FFFFFF" />}
                <Text className="text-white text-base font-semibold">
                  儲存設定
                </Text>
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>
    </MainLayout>
  );
}

function splitAreas(text: string): string[] {
  return text
    .split(/[、,，]/)
    .map((area) => area.trim())
    .filter(Boolean);
}

function CardSection({
  title,
  description,
  children,
  rightAction,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-3xl border border-slate-100 bg-white shadow-sm">
      <View className="flex-row items-start justify-between px-5 pt-5 pb-3">
        <View className="flex-1 pr-3">
          <Text className="text-[13px] font-semibold text-slate-700">
            {title}
          </Text>
          {description ? (
            <Text className="text-[12px] text-slate-500 mt-1">
              {description}
            </Text>
          ) : null}
        </View>
        {rightAction}
      </View>
      <View className="px-5 pb-5 gap-4">{children}</View>
    </View>
  );
}

function InputRow({
  label,
  placeholder,
  value,
  onChangeText,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold text-slate-600">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        className="border border-slate-200 rounded-xl px-3 py-2 text-base text-slate-800 bg-slate-50"
      />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-slate-700 font-medium">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: "#CBD5E1",
          true: Palette.brand.primary,
        }}
      />
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View className="px-3 py-1 rounded-full flex-row items-center gap-1 bg-slate-100">
      <Ionicons name="cube-outline" size={12} color="#475569" />
      <Text className="text-[12px] font-semibold text-slate-600">{label}</Text>
    </View>
  );
}
