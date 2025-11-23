import { Palette } from "@/constants/palette";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export type ConfirmFormValues = {
  customerName: string;
  customerPhone: string;
  deliveryDate: string;
  deliveryTime: string;
  pickupType?: string;
  pickupLocation?: string;
  storeInfo?: string;
  shippingAddress?: string;
  customerNotes?: string;
};

export type ConfirmOrderData = {
  customerName: string;
  customerPhone: string;
  items: any[];
  totalAmount: number;
  pickupDate: string;
  pickupTime: string;
  customerNotes: string;
};

type ConversationConfirmFormProps = {
  collectedData?: Record<string, any>;
  isSubmitting?: boolean;
  onSubmit: (orderData: ConfirmOrderData) => Promise<void> | void;
  onCancel: () => void;
};

const brandTeal = Palette.brand.primary;

export function ConversationConfirmForm({
  collectedData,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: ConversationConfirmFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ConfirmFormValues>({
    defaultValues: {
      customerName: "",
      customerPhone: "",
      deliveryDate: "",
      deliveryTime: "",
      pickupType: "",
      pickupLocation: "",
      storeInfo: "",
      shippingAddress: "",
      customerNotes: "",
    },
  });

  useEffect(() => {
    const data = collectedData || {};
    reset({
      customerName: data.customer_name || "LINE 顧客",
      customerPhone: data.customer_phone || "",
      deliveryDate: data.delivery_date || data.pickup_date || "",
      deliveryTime: data.delivery_time || data.pickup_time || "",
      pickupType: data.pickup_type || "",
      pickupLocation: data.pickup_location || "",
      storeInfo: data.store_info || "",
      shippingAddress: data.shipping_address || "",
      customerNotes: data.customer_notes || "",
    });
  }, [collectedData, reset]);

  const deliveryMethod = collectedData?.delivery_method || "pickup";
  const pickupTypeValue =
    watch("pickupType") || collectedData?.pickup_type || "";
  const isPickup = deliveryMethod === "pickup";
  const isConvenience = deliveryMethod === "convenience_store";
  const isBlackCat = deliveryMethod === "black_cat";
  const showDeliveryDate = isPickup || isConvenience || isBlackCat;
  const showDeliveryTime = isPickup;
  const showPickupType = isPickup;
  const showPickupLocation = isPickup && pickupTypeValue === "meetup";
  const showStoreInfo = isConvenience;
  const showShippingAddress = isBlackCat;

  const handleFormSubmit = async (values: ConfirmFormValues) => {
    const convData = collectedData || {};
    const deliveryMethod = convData.delivery_method || "pickup";
    const items = convData.items || [];
    const totalAmount = convData.total_amount || 0;

    const pickupDate =
      values.deliveryDate || convData.delivery_date || convData.pickup_date;
    const pickupTime =
      values.deliveryTime || convData.delivery_time || convData.pickup_time;
    const pickupType = values.pickupType || convData.pickup_type;
    const pickupLocation = values.pickupLocation || convData.pickup_location;
    const storeInfo = values.storeInfo || convData.store_info;
    const shippingAddress =
      values.shippingAddress || convData.shipping_address;

    if (!values.customerName.trim()) {
      Alert.alert("缺少資料", "請填寫顧客姓名");
      return;
    }
    if (!pickupDate) {
      Alert.alert("缺少資料", "請填寫交付日期");
      return;
    }

    if (deliveryMethod === "pickup") {
      if (!pickupType) {
        Alert.alert("缺少資料", "請選擇取貨方式（店取/面交）");
        return;
      }
      if (!pickupTime) {
        Alert.alert("缺少資料", "請填寫交付時間");
        return;
      }
      if (pickupType === "meetup" && !pickupLocation) {
        Alert.alert("缺少資料", "請填寫面交地點");
        return;
      }
    }
    if (deliveryMethod === "convenience_store" && !storeInfo) {
      Alert.alert("缺少資料", "請填寫超商店號/店名");
      return;
    }
    if (deliveryMethod === "black_cat" && !shippingAddress) {
      Alert.alert("缺少資料", "請填寫寄送地址");
      return;
    }

    const orderData: ConfirmOrderData = {
      customerName: values.customerName.trim(),
      customerPhone: values.customerPhone || "",
      items,
      totalAmount,
      pickupDate,
      pickupTime: pickupTime || "00:00",
      customerNotes: values.customerNotes || convData.customer_notes || "",
    };

    await onSubmit(orderData);
  };

  return (
    <>
      <View className="h-px bg-slate-200 my-4" />
      <Text className="text-sm font-semibold text-slate-800 mb-2">
        補齊資料
      </Text>
      <View className="gap-3">
        <Controller
          control={control}
          name="customerName"
          rules={{ required: "請填寫顧客姓名" }}
          render={({ field: { onChange, value } }) => (
            <InputField
              label="顧客姓名"
              value={value}
              onChangeText={onChange}
              placeholder="顧客姓名"
              error={errors.customerName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="customerPhone"
          render={({ field: { onChange, value } }) => (
            <InputField
              label="聯絡電話"
              value={value || ""}
              onChangeText={onChange}
              placeholder="09xxxxxxxx"
            />
          )}
        />
        {showDeliveryDate && (
          <Controller
            control={control}
            name="deliveryDate"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="交付日期"
                value={value || ""}
                onChangeText={onChange}
                placeholder="YYYY-MM-DD"
              />
            )}
          />
        )}
        {showDeliveryTime && (
          <Controller
            control={control}
            name="deliveryTime"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="交付時間（店取/面交需要）"
                value={value || ""}
                onChangeText={onChange}
                placeholder="HH:MM"
              />
            )}
          />
        )}
        {showPickupType && (
          <Controller
            control={control}
            name="pickupType"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="取貨方式（store=店取，meetup=面交）"
                value={value || ""}
                onChangeText={onChange}
                placeholder="store / meetup"
              />
            )}
          />
        )}
        {showPickupLocation && (
          <Controller
            control={control}
            name="pickupLocation"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="面交地點"
                value={value || ""}
                onChangeText={onChange}
                placeholder="例：台北車站大廳"
              />
            )}
          />
        )}
        {showStoreInfo && (
          <Controller
            control={control}
            name="storeInfo"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="超商店號/店名（超商取貨）"
                value={value || ""}
                onChangeText={onChange}
                placeholder="7-11 XX門市"
              />
            )}
          />
        )}
        {showShippingAddress && (
          <Controller
            control={control}
            name="shippingAddress"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="寄送地址（宅配）"
                value={value || ""}
                onChangeText={onChange}
                placeholder="地址"
              />
            )}
          />
        )}
        <Controller
          control={control}
          name="customerNotes"
          render={({ field: { onChange, value } }) => (
            <InputField
              label="備註"
              value={value || ""}
              onChangeText={onChange}
              placeholder="備註"
              multiline
            />
          )}
        />
      </View>

      <View className="gap-3 mt-4 mb-6">
        <Pressable
          onPress={handleSubmit(handleFormSubmit)}
          disabled={isSubmitting}
          className="rounded-2xl"
          style={{
            backgroundColor: isSubmitting ? "#94A3B8" : brandTeal,
          }}
        >
          <View className="py-3 flex-row items-center justify-center gap-2">
            {isSubmitting && <ActivityIndicator size="small" color="#FFFFFF" />}
            <Text className="text-white text-base font-semibold">
              確認建單
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={onCancel}
          className="rounded-2xl border border-slate-200"
          disabled={isSubmitting}
        >
          <View className="py-3 flex-row items-center justify-center gap-2">
            <Text className="text-slate-700 text-base font-semibold">
              取消
            </Text>
          </View>
        </Pressable>
      </View>
    </>
  );
}

type InputFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  error?: string;
};

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  error,
}: InputFieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold text-slate-600">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
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
