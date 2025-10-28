import type { Product } from "@/types/product";
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from "@/types/product";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Modal, Portal } from "react-native-paper";

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
  unit: string;
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

  // 表單狀態
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    price: "",
    description: "",
    category: PRODUCT_CATEGORIES[0],
    unit: PRODUCT_UNITS[0],
    stock: "",
  });

  // 驗證錯誤
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductFormData, string>>
  >({});

  // 當 product 變化時，更新表單
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        price: product.price.toString(),
        description: product.description || "",
        category: product.category || PRODUCT_CATEGORIES[0],
        unit: product.unit || PRODUCT_UNITS[0],
        stock: product.stock?.toString() || "",
      });
    } else {
      // 重置表單
      setFormData({
        name: "",
        price: "",
        description: "",
        category: PRODUCT_CATEGORIES[0],
        unit: PRODUCT_UNITS[0],
        stock: "",
      });
    }
    setErrors({});
  }, [product, visible]);

  // 驗證表單
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "請輸入商品名稱";
    }

    if (!formData.price.trim()) {
      newErrors.price = "請輸入價格";
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = "請輸入有效的價格";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表單
  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          backgroundColor: "white",
          margin: 20,
          borderRadius: 16,
          maxHeight: "90%",
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center p-5 border-b border-gray-200">
            <Text className="text-xl font-bold text-gray-900">
              {isEditMode ? "編輯商品" : "新增商品"}
            </Text>
            <TouchableOpacity onPress={onDismiss} disabled={isLoading}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-5">
            {/* 商品名稱 */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                商品名稱 <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholder="例：巧克力蛋糕"
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                editable={!isLoading}
              />
              {errors.name && (
                <Text className="text-red-500 text-xs mt-1">{errors.name}</Text>
              )}
            </View>

            {/* 價格 */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                價格 <Text className="text-red-500">*</Text>
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg px-4">
                <Text className="text-gray-500 text-base mr-2">$</Text>
                <TextInput
                  value={formData.price}
                  onChangeText={(text) =>
                    setFormData({ ...formData, price: text })
                  }
                  placeholder="0"
                  keyboardType="numeric"
                  className="flex-1 py-3 text-base"
                  editable={!isLoading}
                />
              </View>
              {errors.price && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.price}
                </Text>
              )}
            </View>

            {/* 分類 */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                分類
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {PRODUCT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setFormData({ ...formData, category: cat })}
                    className={`px-4 py-2 rounded-full border ${
                      formData.category === cat
                        ? "bg-line-green border-line-green"
                        : "bg-white border-gray-300"
                    }`}
                    disabled={isLoading}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        formData.category === cat
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 單位 */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                單位
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {PRODUCT_UNITS.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    onPress={() => setFormData({ ...formData, unit })}
                    className={`px-4 py-2 rounded-full border ${
                      formData.unit === unit
                        ? "bg-line-green border-line-green"
                        : "bg-white border-gray-300"
                    }`}
                    disabled={isLoading}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        formData.unit === unit ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 庫存 */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                庫存（選填）
              </Text>
              <TextInput
                value={formData.stock}
                onChangeText={(text) =>
                  setFormData({ ...formData, stock: text })
                }
                placeholder="不限"
                keyboardType="numeric"
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                editable={!isLoading}
              />
            </View>

            {/* 描述 */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                商品描述（選填）
              </Text>
              <TextInput
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                placeholder="例：使用比利時巧克力製作..."
                multiline
                numberOfLines={3}
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                style={{ minHeight: 80, textAlignVertical: "top" }}
                editable={!isLoading}
              />
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View className="flex-row gap-3 p-5 border-t border-gray-200">
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
              onPress={handleSubmit}
              style={{ flex: 1 }}
              buttonColor="#00B900"
              loading={isLoading}
              disabled={isLoading}
            >
              {isEditMode ? "儲存" : "新增"}
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}
