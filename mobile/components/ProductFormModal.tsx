import { Modal } from "@/components/Modal";
import type { Product } from "@/types/product";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Button } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ProductFormModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: ProductFormData) => void;
  product?: Product | null; // 如果是編輯模式，傳入商品資料
  isLoading?: boolean;
}

export interface ProductFormData {
  name: string;
  price: string;
  description: string;
  category: string;
  stock: string;
}

export function ProductFormModal({
  visible,
  onDismiss,
  onSubmit,
  product,
  isLoading = false,
}: ProductFormModalProps) {
  const isEditMode = !!product;
  const insets = useSafeAreaInsets();
  // React Hook Form
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: {
      name: "",
      price: "",
      description: "",
      category: "",
      stock: "",
    },
  });

  // 是否展開「更多選項」
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // 當 visible 或 product 變化時，重置表單
  React.useEffect(() => {
    if (visible) {
      if (product) {
        reset({
          name: product.name,
          price: product.price.toString(),
          description: product.description || "",
          category: product.category || "",
          stock: product.stock?.toString() || "",
        });
        // 編輯模式預設展開更多選項
        setShowMoreOptions(true);
      } else {
        // 重置表單
        reset({
          name: "",
          price: "",
          description: "",
          category: "",
          stock: "",
        });
        setShowMoreOptions(false);
      }
    }
  }, [product, visible, reset]);

  // 提交表單
  const onFormSubmit = (data: ProductFormData) => {
    onSubmit(data);
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      mode="full"
      title={isEditMode ? "編輯商品" : "新增商品"}
      showCloseButton={!isLoading}
      contentStyle={{ paddingHorizontal: 0, paddingTop: 0 }}
    >
      <View>
        {/* Content - 可滾動區域 */}
        <ScrollView
          className="px-6 py-4"
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 500 }}
        >
          {/* 必填欄位區域 */}
          {/* 商品名稱 */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              商品名稱 <Text className="text-red-500">*</Text>
            </Text>
            <Controller
              control={control}
              name="name"
              rules={{
                required: "請輸入商品名稱",
                validate: (value) => value.trim() !== "" || "請輸入商品名稱",
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="例：巧克力蛋糕"
                  className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                  editable={!isLoading}
                />
              )}
            />
            {errors.name && (
              <Text className="text-red-500 text-xs mt-1">
                {errors.name.message}
              </Text>
            )}
          </View>

          {/* 價格 */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              價格 <Text className="text-red-500">*</Text>
            </Text>
            <Controller
              control={control}
              name="price"
              rules={{
                required: "請輸入價格",
                validate: (value) => {
                  if (!value.trim()) return "請輸入價格";
                  const num = Number(value);
                  if (isNaN(num)) return "請輸入有效的數字";
                  if (num <= 0) return "價格必須大於 0";
                  return true;
                },
              }}
              render={({ field: { onChange, value } }) => (
                <View className="flex-row items-center border border-gray-300 rounded-lg px-4">
                  <Text className="text-gray-500 text-base mr-2">$</Text>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="0"
                    keyboardType="numeric"
                    className="flex-1 py-3 text-base"
                    editable={!isLoading}
                  />
                </View>
              )}
            />
            {errors.price && (
              <Text className="text-red-500 text-xs mt-1">
                {errors.price.message}
              </Text>
            )}
          </View>

          {/* 更多選項（可折疊） */}
          <TouchableOpacity
            onPress={() => setShowMoreOptions(!showMoreOptions)}
            className="flex-row items-center mb-3"
            disabled={isLoading}
          >
            <MaterialCommunityIcons
              name={showMoreOptions ? "chevron-down" : "chevron-right"}
              size={20}
              color="#6B7280"
            />
            <Text className="text-sm font-semibold text-gray-600 ml-1">
              更多選項
            </Text>
          </TouchableOpacity>

          {showMoreOptions && (
            <View className="mb-4">
              {/* 分類（自由輸入） */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  分類（選填）
                </Text>
                <Controller
                  control={control}
                  name="category"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        placeholder="例：蛋糕"
                        className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                        editable={!isLoading}
                      />
                    </>
                  )}
                />
              </View>

              {/* 商品描述 */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  商品描述（選填）
                </Text>
                <Controller
                  control={control}
                  name="description"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="例：使用比利時巧克力製作..."
                      multiline
                      numberOfLines={3}
                      className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                      style={{ minHeight: 80, textAlignVertical: "top" }}
                      editable={!isLoading}
                    />
                  )}
                />
              </View>

              {/* 庫存 */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  庫存（選填）
                </Text>
                <Controller
                  control={control}
                  name="stock"
                  rules={{
                    validate: (value) => {
                      if (value && value.trim() !== "") {
                        const num = Number(value);
                        if (isNaN(num)) return "請輸入有效的數字";
                        if (num < 0) return "庫存不能為負數";
                      }
                      return true;
                    },
                  }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="不限"
                      keyboardType="numeric"
                      className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                      editable={!isLoading}
                    />
                  )}
                />
                {errors.stock && (
                  <Text className="text-red-500 text-xs mt-1">
                    {errors.stock.message}
                  </Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer - 固定在底部 */}
        <View className="px-6 pt-4 border-t border-gray-100">
          <View className="flex-row gap-3">
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={{ flex: 1 }}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onFormSubmit)}
              style={{ flex: 1 }}
              buttonColor="#00B900"
              loading={isLoading}
              disabled={isLoading}
            >
              {isEditMode ? "儲存" : "新增"}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
