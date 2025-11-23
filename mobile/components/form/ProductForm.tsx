import { Palette } from "@/constants/palette";
import {
  deliveryMethodLabels,
  type DeliveryMethod,
} from "@/types/delivery-settings";
import { type ProductFormValues } from "@/types/product";
import { Ionicons } from "@expo/vector-icons";
import { Controller, useForm } from "react-hook-form";
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  type KeyboardTypeOptions,
  View,
} from "react-native";

type ProductFormProps = {
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<ProductFormValues>;
  mode?: "create" | "edit";
};

const brandTeal = Palette.brand.primary;

const deliveryOptions: { key: DeliveryMethod; label: string }[] = [
  { key: "pickup", label: deliveryMethodLabels.pickup },
  { key: "meetup", label: deliveryMethodLabels.meetup },
  { key: "convenience_store", label: deliveryMethodLabels.convenience_store },
  { key: "black_cat", label: deliveryMethodLabels.black_cat },
];

export default function ProductForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  defaultValues,
  mode = "create",
}: ProductFormProps) {
  const isEdit = mode === "edit";
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    defaultValues: {
      name: "",
      price: "",
      category: "",
      description: "",
      stock: "",
      is_available: true,
      useTeamDeliveryDefault: true,
      methods: ["pickup", "meetup", "convenience_store", "black_cat"],
      ...defaultValues,
    },
  });

  const useDefault = watch("useTeamDeliveryDefault");
  const selectedMethods = watch("methods");

  const toggleMethod = (method: DeliveryMethod) => {
    const current = selectedMethods || [];
    const next = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method];
    setValue("methods", next);
  };

  return (
    <>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 pr-3">
          <Text className="text-lg font-bold text-slate-900">
            {isEdit ? "編輯商品" : "新增商品"}
          </Text>
          <Text className="text-[12px] text-slate-500">
            商品設定會直接影響 AI 建單推薦與前台可售方式
          </Text>
        </View>
        <Pressable onPress={onCancel}>
          <Ionicons name="close" size={20} color="#475569" />
        </Pressable>
      </View>

      <ScrollView
        className="max-h-[70vh]"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3">
          <Controller
            control={control}
            name="name"
            rules={{ required: "請輸入商品名稱" }}
            render={({ field: { onChange, value } }) => (
              <InputField
                label="商品名稱"
                placeholder="輸入商品名稱"
                value={value}
                onChangeText={onChange}
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="price"
            rules={{
              required: "請輸入價格",
              validate: (v) =>
                v && !Number.isNaN(Number(v)) ? true : "價格需為數字",
            }}
            render={({ field: { onChange, value } }) => (
              <InputField
                label="價格 (元)"
                placeholder="例：350"
                keyboardType="numeric"
                value={value || ""}
                onChangeText={onChange}
                error={errors.price?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="category"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="分類"
                placeholder="例：蛋糕 / 飲品"
                value={value || ""}
                onChangeText={onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="stock"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="庫存 (選填)"
                placeholder="數字"
                keyboardType="numeric"
                value={value || ""}
                onChangeText={onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="描述 (選填)"
                placeholder="口味、尺寸等"
                value={value || ""}
                onChangeText={onChange}
                multiline
              />
            )}
          />

          <Controller
            control={control}
            name="is_available"
            render={({ field: { value, onChange } }) => (
              <ToggleRow label="上架中" value={value} onChange={onChange} />
            )}
          />

          <View className="mt-2 gap-2">
            <Controller
              control={control}
              name="useTeamDeliveryDefault"
              render={({ field: { value, onChange } }) => (
                <ToggleRow
                  label="沿用全店配送設定"
                  value={value}
                  onChange={onChange}
                />
              )}
            />
            {!useDefault && (
              <View className="gap-2">
                <Text className="text-sm font-semibold text-slate-800">
                  自訂配送方式
                </Text>
                <Text className="text-[12px] text-slate-500">
                  至少選一種，未勾選的方式將不可用
                </Text>
                <View className="flex-row flex-wrap gap-2 mt-2">
                  {deliveryOptions.map((opt) => {
                    const isActive = (selectedMethods || []).includes(opt.key);
                    return (
                      <Pressable
                        key={`create-${opt.key}`}
                        onPress={() => toggleMethod(opt.key)}
                        className="px-3 py-2 rounded-full border"
                        style={{
                          borderColor: isActive ? brandTeal : "#CBD5E1",
                          backgroundColor: isActive
                            ? "rgba(14,165,233,0.08)"
                            : "#FFFFFF",
                        }}
                      >
                        <View className="flex-row items-center gap-1">
                          <Ionicons
                            name={
                              isActive ? "checkbox-outline" : "square-outline"
                            }
                            size={16}
                            color={isActive ? brandTeal : "#94A3B8"}
                          />
                          <Text
                            className="text-sm font-semibold"
                            style={{
                              color: isActive ? brandTeal : "#475569",
                            }}
                          >
                            {opt.label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View className="gap-3 mt-4">
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="rounded-2xl"
          style={{
            backgroundColor: isSubmitting ? "#94A3B8" : brandTeal,
          }}
        >
          <View className="py-3 flex-row items-center justify-center gap-2">
            {isSubmitting && (
              <Text className="text-white text-base font-semibold">處理中</Text>
            )}
            {!isSubmitting && (
              <Text className="text-white text-base font-semibold">
                {isEdit ? "更新商品" : "建立商品"}
              </Text>
            )}
          </View>
        </Pressable>
        <Pressable
          onPress={onCancel}
          disabled={isSubmitting}
          className="rounded-2xl border border-slate-200"
        >
          <View className="py-3 flex-row items-center justify-center gap-2">
            <Text className="text-slate-700 text-base font-semibold">取消</Text>
          </View>
        </Pressable>
      </View>
    </>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  multiline,
  error,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  error?: string;
}) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold text-slate-600">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        multiline={multiline}
        className="border border-slate-200 rounded-xl px-3 py-2 text-base text-slate-800 bg-slate-50"
        style={multiline ? { minHeight: 80 } : undefined}
      />
      {error ? (
        <Text className="text-[11px] text-rose-500 mt-0.5">{error}</Text>
      ) : null}
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
          true: brandTeal,
        }}
      />
    </View>
  );
}
