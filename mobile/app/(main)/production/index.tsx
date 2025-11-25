import { MainLayout } from "@/components/layout/MainLayout";
import { IconButton } from "@/components/Navbar";
import ProductForm from "@/components/form/ProductForm";
import { Palette } from "@/constants/palette";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import {
  useCreateProduct,
  useProducts,
  useToggleProductAvailability,
  useUpdateProduct,
} from "@/hooks/queries/useProducts";
import {
  deliveryMethodLabels,
  type DeliveryMethod,
} from "@/types/delivery-settings";
import type { Product, ProductFormValues } from "@/types/product";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

const brandTeal = Palette.brand.primary;
const brandSlate = Palette.brand.slate;

export default function Production() {
  const { currentTeam, currentTeamId } = useCurrentTeam();
  const router = useRouter();
  const [deliveryModalProduct, setDeliveryModalProduct] =
    useState<Product | null>(null);
  const [useTeamDeliveryDefault, setUseTeamDeliveryDefault] = useState(true);
  const [selectedMethods, setSelectedMethods] = useState<DeliveryMethod[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const {
    data: products = [],
    isLoading: isProductsLoading,
    isRefetching: isProductsRefetching,
    refetch: refetchProducts,
  } = useProducts(currentTeamId, !!currentTeamId);

  const createProduct = useCreateProduct();
  const updateProductDelivery = useUpdateProduct();
  const updateProductInfo = useUpdateProduct();
  const toggleProductAvailability = useToggleProductAvailability();

  const openDeliveryModal = (product: Product) => {
    setDeliveryModalProduct(product);
    const override = product.delivery_override;
    setUseTeamDeliveryDefault(override?.use_team_default ?? true);
    if (override?.use_team_default === false && override.methods) {
      setSelectedMethods(override.methods);
    } else {
      setSelectedMethods(product.effective_delivery_methods || []);
    }
  };

  const closeDeliveryModal = () => {
    setDeliveryModalProduct(null);
    setSelectedMethods([]);
    setUseTeamDeliveryDefault(true);
  };

  const toggleMethod = (method: DeliveryMethod) => {
    setSelectedMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const saveProductDelivery = async () => {
    if (!deliveryModalProduct) return;
    if (!useTeamDeliveryDefault && selectedMethods.length === 0) {
      alert("自訂配送時至少選擇一種方式");
      return;
    }

    try {
      await updateProductDelivery.mutateAsync({
        productId: deliveryModalProduct.id,
        data: {
          delivery_override: useTeamDeliveryDefault
            ? { use_team_default: true }
            : { use_team_default: false, methods: selectedMethods },
        },
      });
      closeDeliveryModal();
    } catch (error) {
      console.error("[Product] 更新配送設定失敗", error);
      alert("更新失敗，請稍後再試");
    }
  };

  const openCreateModal = () => setShowCreateModal(true);
  const closeCreateModal = () => setShowCreateModal(false);
  const openEditModal = (product: Product) => setEditingProduct(product);
  const closeEditModal = () => setEditingProduct(null);

  const submitCreateProduct = async (values: ProductFormValues) => {
    if (!currentTeamId) return;
    if (!values.useTeamDeliveryDefault && values.methods.length === 0) {
      alert("自訂配送時至少選擇一種方式");
      return;
    }

    try {
      await createProduct.mutateAsync({
        team_id: currentTeamId,
        name: values.name.trim(),
        price: Number(values.price),
        description: values.description?.trim() || undefined,
        category: values.category?.trim() || undefined,
        stock: values.stock ? Number(values.stock) : undefined,
        is_available: values.is_available,
        delivery_override: values.useTeamDeliveryDefault
          ? { use_team_default: true }
          : {
              use_team_default: false,
              methods: values.methods,
            },
      });
      closeCreateModal();
    } catch (error) {
      console.error("[Product] 建立商品失敗", error);
      alert("建立失敗，請稍後再試");
    }
  };

  const submitUpdateProduct = async (values: ProductFormValues) => {
    if (!editingProduct) return;
    if (!values.useTeamDeliveryDefault && values.methods.length === 0) {
      alert("自訂配送時至少選擇一種方式");
      return;
    }

    try {
      await updateProductInfo.mutateAsync({
        productId: editingProduct.id,
        data: {
          name: values.name.trim(),
          price: Number(values.price),
          description: values.description?.trim() || undefined,
          category: values.category?.trim() || undefined,
          stock: values.stock ? Number(values.stock) : undefined,
          is_available: values.is_available,
          delivery_override: values.useTeamDeliveryDefault
            ? { use_team_default: true }
            : {
                use_team_default: false,
                methods: values.methods,
              },
        },
      });
      closeEditModal();
    } catch (error) {
      console.error("[Product] 更新商品失敗", error);
      alert("更新失敗，請稍後再試");
    }
  };

  const editingProductDefaults: Partial<ProductFormValues> | undefined =
    editingProduct
      ? {
          name: editingProduct.name,
          price: editingProduct.price.toString(),
          category: editingProduct.category || "",
          description: editingProduct.description || "",
          stock:
            editingProduct.stock !== undefined
              ? editingProduct.stock.toString()
              : "",
          is_available: editingProduct.is_available,
          useTeamDeliveryDefault:
            editingProduct.delivery_override?.use_team_default ?? true,
          methods:
            editingProduct.delivery_override?.methods ||
            editingProduct.effective_delivery_methods ||
            [],
        }
      : undefined;

  const renderProductRow = (product: Product) => {
    const isOn = product.is_available;
    const toggle = () =>
      toggleProductAvailability.mutate({
        productId: product.id,
        isAvailable: !isOn,
      });

    return (
      <View
        key={product.id}
        className="flex-row items-center p-4 rounded-2xl border border-slate-100 bg-white shadow-[0px_10px_25px_rgba(15,23,42,0.04)] mb-3"
      >
        <View className="relative mr-3">
          <Image
            source={{
              uri:
                product.image_url ||
                "https://placehold.co/100x100/png?text=No+Image",
            }}
            className="w-12 h-12 rounded-xl"
          />
          {!isOn && <View className="absolute inset-0 bg-white/60 rounded-xl" />}
        </View>

        <View className="flex-1">
          <Text
            className={`text-base font-semibold ${
              isOn ? "text-slate-900" : "text-slate-400"
            }`}
          >
            {product.name}
          </Text>
          <Text className="text-sm text-slate-500">
            ${product.price}
            {product.stock !== undefined && ` · 剩餘: ${product.stock}`}
          </Text>
          {product.category ? (
            <Text className="text-[11px] text-slate-400 mt-1">
              {product.category}
            </Text>
          ) : null}
          {product.effective_delivery_methods &&
          product.effective_delivery_methods.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 mt-2">
              {product.effective_delivery_methods.map((method) => (
                <View
                  key={`${product.id}-${method}`}
                  className="px-2 py-1 rounded-full bg-slate-100"
                >
                  <Text className="text-[11px] font-semibold text-slate-600">
                    {deliveryMethodLabels[method]}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-[11px] text-slate-400 mt-2">
              沿用全店配送設定
            </Text>
          )}

          <View className="flex-row items-center gap-3 mt-2">
            <Pressable onPress={() => openEditModal(product)} className="flex-row items-center gap-1">
              <Ionicons name="create-outline" size={14} color={brandSlate} />
              <Text className="text-[12px] font-semibold text-brand-slate">
                編輯
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openDeliveryModal(product)}
              className="flex-row items-center gap-1"
            >
              <Ionicons name="bicycle-outline" size={14} color={brandSlate} />
              <Text className="text-[12px] font-semibold text-brand-slate">
                配送設定
              </Text>
            </Pressable>
          </View>
        </View>

        <Switch
          value={isOn}
          onValueChange={toggle}
          disabled={toggleProductAvailability.isPending}
          trackColor={{ false: "#CBD5E1", true: brandTeal }}
          thumbColor={"#FFFFFF"}
        />
      </View>
    );
  };

  return (
    <View className="flex-1 relative">
      <MainLayout
        title="商品管理"
        teamName={currentTeam?.team_name || "載入中..."}
        scrollable={false}
        rightContent={
          <View className="flex-row items-center gap-2">
            <IconButton
              icon={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
              ariaLabel="返回訂單"
              onPress={() => router.back()}
              isDark={false}
            />
            <IconButton
              icon="add"
              ariaLabel="新增商品"
              onPress={openCreateModal}
              isDark={false}
            />
          </View>
        }
      >
        <ScrollView
          className="pb-20"
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={isProductsRefetching}
              onRefresh={refetchProducts}
              tintColor={brandTeal}
            />
          }
        >
          {isProductsLoading ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color={brandTeal} />
              <Text className="text-slate-500 mt-2">載入商品中</Text>
            </View>
          ) : products.length === 0 ? (
            <Text className="text-slate-500">尚無商品</Text>
          ) : (
            products.map((product) => renderProductRow(product))
          )}
        </ScrollView>
      </MainLayout>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={closeCreateModal}
      >
        <Pressable className="flex-1 bg-black/30" onPress={closeCreateModal} />
        <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
          <ProductForm
            onSubmit={submitCreateProduct}
            onCancel={closeCreateModal}
            isSubmitting={createProduct.isPending}
          />
        </View>
      </Modal>

      <Modal
        visible={!!editingProduct}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <Pressable className="flex-1 bg-black/30" onPress={closeEditModal} />
        <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
          <ProductForm
            key={editingProduct?.id || "edit-product"}
            mode="edit"
            defaultValues={editingProductDefaults}
            onSubmit={submitUpdateProduct}
            onCancel={closeEditModal}
            isSubmitting={updateProductInfo.isPending}
          />
        </View>
      </Modal>

      <Modal
        visible={!!deliveryModalProduct}
        transparent
        animationType="slide"
        onRequestClose={closeDeliveryModal}
      >
        <Pressable className="flex-1 bg-black/30" onPress={closeDeliveryModal} />
        <View className="bg-white rounded-t-3xl p-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-slate-900">
              {deliveryModalProduct?.name || "配送設定"}
            </Text>
            <Pressable onPress={closeDeliveryModal}>
              <Ionicons name="close" size={20} color="#475569" />
            </Pressable>
          </View>
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-slate-800">
                  沿用全店設定
                </Text>
                <Text className="text-[12px] text-slate-500">
                  依照「設定」中的配送方式，不另做限制
                </Text>
              </View>
              <Switch
                value={useTeamDeliveryDefault}
                onValueChange={setUseTeamDeliveryDefault}
                trackColor={{ false: "#CBD5E1", true: brandTeal }}
              />
            </View>

            {!useTeamDeliveryDefault && (
              <View className="gap-2">
                <Text className="text-sm font-semibold text-slate-800">
                  自訂配送方式
                </Text>
                <Text className="text-[12px] text-slate-500">
                  至少選一種，未勾選的方式將不可用
                </Text>
                <View className="flex-row flex-wrap gap-2 mt-2">
                  {(
                    [
                      "pickup",
                      "meetup",
                      "convenience_store",
                      "black_cat",
                    ] as DeliveryMethod[]
                  ).map((opt) => {
                    const isActive = selectedMethods.includes(opt);
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => toggleMethod(opt)}
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
                            {deliveryMethodLabels[opt]}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View className="gap-3 mt-4">
              <Pressable
                onPress={saveProductDelivery}
                disabled={updateProductDelivery.isPending}
                className="rounded-2xl"
                style={{
                  backgroundColor: updateProductDelivery.isPending
                    ? "#94A3B8"
                    : brandTeal,
                }}
              >
                <View className="py-3 flex-row items-center justify-center gap-2">
                  {updateProductDelivery.isPending && (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  )}
                  <Text className="text-white text-base font-semibold">
                    儲存
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={closeDeliveryModal}
                disabled={updateProductDelivery.isPending}
                className="rounded-2xl border border-slate-200"
              >
                <View className="py-3 flex-row items-center justify-center gap-2">
                  <Text className="text-slate-700 text-base font-semibold">
                    取消
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
