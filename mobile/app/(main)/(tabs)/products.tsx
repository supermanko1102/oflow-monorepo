import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import {
  ProductFormModal,
  type ProductFormData,
} from "@/components/ProductFormModal";
import { SHADOWS } from "@/constants/design";
import {
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useToggleProductAvailability,
  useUpdateProduct,
} from "@/hooks/queries/useProducts";
import { useHaptics } from "@/hooks/useHaptics";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Product } from "@/types/product";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, FAB } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const haptics = useHaptics();

  // Auth
  const currentTeamId = useAuthStore((state) => state.currentTeamId);

  // Query products
  const {
    data: products = [],
    isLoading,
    refetch,
    isFetching,
  } = useProducts(currentTeamId, !!currentTeamId);

  // Mutations
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const toggleAvailabilityMutation = useToggleProductAvailability();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Refresh
  const onRefresh = useCallback(async () => {
    haptics.light();
    await refetch();
  }, [haptics, refetch]);

  // 新增商品
  const handleAddProduct = () => {
    haptics.light();
    setEditingProduct(null);
    setModalVisible(true);
  };

  // 編輯商品
  const handleEditProduct = (product: Product) => {
    haptics.light();
    setEditingProduct(product);
    setModalVisible(true);
  };

  // 刪除商品
  const handleDeleteProduct = (product: Product) => {
    haptics.light();
    Alert.alert(
      "刪除商品",
      `確定要刪除「${product.name}」嗎？此操作無法復原。`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "刪除",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProductMutation.mutateAsync({
                productId: product.id,
                teamId: product.team_id,
              });
              haptics.success();
              toast.success("商品已刪除");
            } catch (error: any) {
              toast.error(error.message || "刪除失敗");
            }
          },
        },
      ]
    );
  };

  // 切換可用狀態
  const handleToggleAvailability = async (product: Product) => {
    try {
      await toggleAvailabilityMutation.mutateAsync({
        productId: product.id,
        isAvailable: !product.is_available,
      });
      haptics.success();
      toast.success(product.is_available ? "商品已下架" : "商品已上架");
    } catch (error: any) {
      toast.error(error.message || "更新失敗");
    }
  };

  // 提交表單
  const handleSubmitForm = async (formData: ProductFormData) => {
    if (!currentTeamId) return;

    try {
      if (editingProduct) {
        // 更新商品
        await updateProductMutation.mutateAsync({
          productId: editingProduct.id,
          data: {
            name: formData.name,
            price: Number(formData.price),
            description: formData.description || undefined,
            category: formData.category || undefined,
            stock: formData.stock ? Number(formData.stock) : undefined,
          },
        });
        haptics.success();
        toast.success("商品已更新");
      } else {
        // 新增商品
        await createProductMutation.mutateAsync({
          team_id: currentTeamId,
          name: formData.name,
          price: Number(formData.price),
          description: formData.description || undefined,
          category: formData.category || undefined,
          stock: formData.stock ? Number(formData.stock) : undefined,
          is_available: true,
        });
        haptics.success();
        toast.success("商品已新增");
      }
      setModalVisible(false);
      setEditingProduct(null);
    } catch (error: any) {
      toast.error(error.message || "操作失敗");
    }
  };

  // Loading state
  if (isLoading && !products.length) {
    return <LoadingState message="載入商品中..." />;
  }

  // 沒有選擇團隊
  if (!currentTeamId) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <EmptyState title="請先選擇團隊" description="前往設定選擇或建立團隊" />
      </View>
    );
  }

  // 渲染商品卡片
  const renderProduct = ({ item: product }: { item: Product }) => (
    <Card className="mx-4 mb-4 bg-white" style={SHADOWS.card}>
      <Card.Content className="p-4">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-2">
              <Text className="text-lg font-bold text-gray-900">
                {product.name}
              </Text>
              {!product.is_available && (
                <View className="ml-2 px-2 py-1 bg-gray-200 rounded">
                  <Text className="text-xs text-gray-600">已下架</Text>
                </View>
              )}
            </View>

            {product.description && (
              <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
                {product.description}
              </Text>
            )}

            <View className="flex-row items-center gap-3">
              {product.category && (
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="tag"
                    size={14}
                    color="#6B7280"
                  />
                  <Text className="text-sm text-gray-600 ml-1">
                    {product.category}
                  </Text>
                </View>
              )}
              {product.stock !== undefined && (
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="package-variant"
                    size={14}
                    color="#6B7280"
                  />
                  <Text className="text-sm text-gray-600 ml-1">
                    庫存 {product.stock}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="items-end">
            <Text className="text-2xl font-bold text-line-green">
              ${product.price}
            </Text>
            {product.unit && (
              <Text className="text-sm text-gray-500">/ {product.unit}</Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Text className="text-sm text-gray-700 mr-2">
              {product.is_available ? "上架中" : "已下架"}
            </Text>
            <Switch
              value={product.is_available}
              onValueChange={() => handleToggleAvailability(product)}
              trackColor={{ true: "#00B900" }}
              disabled={toggleAvailabilityMutation.isPending}
            />
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => handleEditProduct(product)}
              className="px-4 py-2 bg-gray-100 rounded-lg"
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="pencil" size={18} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteProduct(product)}
              className="px-4 py-2 bg-red-50 rounded-lg"
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="delete" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="pb-5 px-6 bg-white border-b border-gray-100"
        style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
      >
        <Text className="text-4xl font-black text-gray-900 mb-2">商品管理</Text>
        <Text className="text-base text-gray-600">
          {products.length} 個商品
        </Text>
      </View>

      {/* Product List */}
      {products.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <EmptyState
            title="還沒有商品"
            description="點擊右下角按鈕新增第一個商品"
          />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={onRefresh}
              tintColor="#00B900"
              colors={["#00B900"]}
            />
          }
        />
      )}

      {/* Add Product FAB */}
      <FAB
        icon="plus"
        style={{
          position: "absolute",
          right: 16,
          bottom: 16 + insets.bottom,
          backgroundColor: "#00B900",
        }}
        color="white"
        onPress={handleAddProduct}
      />

      {/* Product Form Modal */}
      <ProductFormModal
        visible={modalVisible}
        onDismiss={() => {
          setModalVisible(false);
          setEditingProduct(null);
        }}
        onSubmit={handleSubmitForm}
        product={editingProduct}
        teamId={currentTeamId || ""}
        isLoading={
          createProductMutation.isPending || updateProductMutation.isPending
        }
      />
    </View>
  );
}
