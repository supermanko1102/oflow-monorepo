import { MainLayout } from "@/components/layout/MainLayout";
import { Palette } from "@/constants/palette";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

type OrderStatus = "pending" | "ready" | "completed";
type PrimaryTab = "orders" | "products";

const statusFilters = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待處理" },
  { key: "ready", label: "待取貨" },
  { key: "completed", label: "已完成" },
] as const;

type OrderItem = {
  id: string;
  time: string;
  customer: string;
  summary: string;
  amount: number;
  status: OrderStatus;
  source: "AI" | "手動";
};

type OrderSection = {
  dateLabel: string;
  items: OrderItem[];
};

export default function Orders() {
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>("orders");
  const [statusFilter, setStatusFilter] =
    useState<(typeof statusFilters)[number]["key"]>("all");

  const sections = useMemo<OrderSection[]>(
    () => [
      {
        dateLabel: "今天 · 2/14 (週三)",
        items: [
          {
            id: "o100",
            time: "10:30",
            customer: "王小明",
            summary: "巴斯克 6吋 x1",
            amount: 1280,
            status: "pending",
            source: "AI",
          },
          {
            id: "o101",
            time: "15:00",
            customer: "陳小姐",
            summary: "檸檬塔 x2",
            amount: 960,
            status: "pending",
            source: "手動",
          },
        ],
      },
      {
        dateLabel: "明天 · 2/15 (週四)",
        items: [
          {
            id: "o102",
            time: "09:00",
            customer: "劉先生",
            summary: "綜合禮盒 x3",
            amount: 2280,
            status: "ready",
            source: "AI",
          },
          {
            id: "o103",
            time: "18:00",
            customer: "林小姐",
            summary: "手工餅乾 x20",
            amount: 1800,
            status: "completed",
            source: "手動",
          },
        ],
      },
    ],
    []
  );

const productStats = useMemo(
    () => ({
      totalProducts: 24,
      autoReplyTemplates: 6,
      lowStock: 3,
      autoMatchedRate: "82%",
    }),
    []
  );

  const products = useMemo(
    () => [
      {
        id: "p1",
        name: "巴斯克 6吋",
        price: 1280,
        prepTime: "2 小時",
        aiPrompt: "提醒選口味與取貨時段",
        stock: 8,
        tags: ["常態商品", "蛋奶素"],
      },
      {
        id: "p2",
        name: "檸檬塔",
        price: 480,
        prepTime: "1 小時",
        aiPrompt: "提供組合優惠、保存方式",
        stock: 15,
        tags: ["限量", "熱門"],
      },
      {
        id: "p3",
        name: "客製禮盒",
        price: 1680,
        prepTime: "3 小時",
        aiPrompt: "詢問口味與卡片內容",
        stock: 4,
        tags: ["預購", "企業"],
      },
    ],
    []
  );

  const aiTemplates = useMemo(
    () => [
      {
        id: "t1",
        name: "預購流程",
        usage: "針對節慶預購，詢問日期與數量",
      },
      {
        id: "t2",
        name: "客製禮盒",
        usage: "引導客人提供口味/卡片內容",
      },
      {
        id: "t3",
        name: "到貨提醒",
        usage: "自動告知取貨時間與付款狀態",
      },
    ],
    []
  );

  const quickProductActions = [
    {
      icon: "add-circle-outline" as const,
      label: "新增商品",
      onPress: () => console.log("新增商品"),
    },
    {
      icon: "copy-outline" as const,
      label: "建立範本",
      onPress: () => console.log("建立範本"),
    },
    {
      icon: "sparkles-outline" as const,
      label: "AI 調教",
      onPress: () => console.log("AI 調教"),
    },
  ];

  const primaryTabs = [
    { key: "orders", label: "訂單" },
    { key: "products", label: "商品" },
  ] satisfies { key: PrimaryTab; label: string }[];

  const handleCreate = () => {
    if (primaryTab === "orders") {
      console.log("create order");
    } else {
      console.log("create product");
    }
  };

  const renderStatusChip = (
    key: (typeof statusFilters)[number]["key"],
    label: string
  ) => {
    const isActive = statusFilter === key;
    return (
      <Pressable
        key={key}
        onPress={() => setStatusFilter(key)}
        className={`px-3 py-1.5 rounded-full border ${
          isActive ? "bg-gray-900 border-gray-900" : "border-gray-200 bg-white"
        }`}
      >
        <Text
          className={`text-xs font-medium ${
            isActive ? "text-white" : "text-gray-600"
          }`}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderOrderCard = (order: OrderItem) => {
    if (statusFilter !== "all" && statusFilter !== order.status) return null;

    const statusMap: Record<
      OrderStatus,
      { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }
    > = {
      pending: {
        label: "待確認",
        bg: "bg-orange-100",
        text: "text-orange-700",
        icon: "alert-circle",
      },
      ready: {
        label: "待取貨",
        bg: "bg-purple-100",
        text: "text-purple-700",
        icon: "cube",
      },
      completed: {
        label: "已完成",
        bg: "bg-green-100",
        text: "text-green-700",
        icon: "checkmark-circle",
      },
    };

    const currentStatus = statusMap[order.status];

    return (
      <View
        key={order.id}
        className="rounded-xl border border-gray-100 bg-white p-4   mb-3"
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-xs text-gray-500">{order.time}</Text>
            <Text className="text-base font-semibold text-gray-900">
              {order.customer}
            </Text>
            <View className="rounded-full bg-gray-100 px-2 py-0.5">
              <Text className="text-[10px] text-gray-500">{order.source}</Text>
            </View>
          </View>
          <View
            className={`flex-row items-center gap-1 rounded-full px-2 py-1 ${currentStatus.bg}`}
          >
            <Ionicons name={currentStatus.icon} size={12} color="black" />
            <Text className={`text-[10px] ${currentStatus.text}`}>
              {currentStatus.label}
            </Text>
          </View>
        </View>
        <Text className="text-sm text-gray-700 mb-2">{order.summary}</Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-900">
            ${order.amount.toLocaleString()}
          </Text>
          <View className="flex-row gap-3">
            <IconAction icon="chatbubble-ellipses-outline" label="訊息" />
            <IconAction icon="calendar-outline" label="提醒" />
            <IconAction icon="ellipsis-horizontal" label="更多" />
          </View>
        </View>
      </View>
    );
  };

  const renderOrderContent = () => (
    <>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {statusFilters.map((filter) =>
          renderStatusChip(filter.key, filter.label)
        )}
      </View>
      {sections.map((section) => (
        <View key={section.dateLabel} className="mb-6">
          <Text className="text-xs font-semibold text-gray-500 mb-2">
            {section.dateLabel}
          </Text>
          {section.items.map((order) => renderOrderCard(order))}
        </View>
      ))}
    </>
  );

  const renderProductContent = () => (
    <View className="space-y-5">
      <View className="flex-row flex-wrap -mx-1">
        <View className="w-1/2 px-1 mb-2">
          <SummaryCard
            label="商品數"
            value={`${productStats.totalProducts} 個`}
            description="AI 已可辨識 20 個"
            icon={
              <Ionicons
                name="cube-outline"
                size={18}
                color={Palette.status.info}
              />
            }
          />
        </View>
        <View className="w-1/2 px-1 mb-2">
          <SummaryCard
            label="低庫存提醒"
            value={`${productStats.lowStock} 項`}
            description="建議補貨"
            icon={
              <Ionicons
                name="warning-outline"
                size={18}
                color={Palette.status.warning}
              />
            }
          />
        </View>
        <View className="w-1/2 px-1 mb-2">
          <SummaryCard
            label="AI 自動對應"
            value={productStats.autoMatchedRate}
            description="近 7 天成功率"
            icon={
              <Ionicons
                name="flash-outline"
                size={18}
                color={Palette.status.success}
              />
            }
          />
        </View>
      </View>

      <View className="flex-row gap-2">
        {quickProductActions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            className="flex-1 h-12 rounded-xl border border-gray-200 items-center justify-center flex-row gap-2 bg-white"
          >
            <Ionicons
              name={action.icon}
              size={16}
              color={Palette.neutrals.heading}
            />
            <Text className="text-xs text-gray-900 font-semibold">
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-gray-900">商品清單</Text>
          <Text className="text-[11px] text-gray-500">總共 {products.length} 項</Text>
        </View>
        <View className="space-y-3">
          {products.map((product) => (
            <View
              key={product.id}
              className="rounded-xl border border-gray-100 bg-white p-4  "
            >
              <View className="flex-row items-center justify-between mb-2">
                <View>
                  <Text className="text-base font-semibold text-gray-900">
                    {product.name}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    準備時間 {product.prepTime}
                  </Text>
                </View>
                <Text className="text-base font-semibold text-gray-900">
                  ${product.price.toLocaleString()}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2 mb-2">
                {product.tags.map((tag) => (
                  <View
                    key={tag}
                    className="rounded-full bg-gray-100 px-2 py-0.5"
                  >
                    <Text className="text-[10px] text-gray-600">{tag}</Text>
                  </View>
                ))}
              </View>
              <Text className="text-xs text-gray-500 mb-3">
                AI 提醒：{product.aiPrompt}
              </Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="w-2 h-2 rounded-full bg-green-400" />
                  <Text className="text-xs text-gray-600">
                    現貨 {product.stock} 份
                  </Text>
                </View>
                <Pressable className="px-3 py-1 rounded-full border border-gray-200">
                  <Text className="text-xs text-gray-900 font-medium">
                    編輯設定
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-gray-900">AI 範本</Text>
          <Text className="text-[11px] text-gray-500">
            {aiTemplates.length} 組
          </Text>
        </View>
        <View className="space-y-2">
          {aiTemplates.map((tpl) => (
            <View
              key={tpl.id}
              className="rounded-xl border border-gray-100 bg-white p-3  "
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm font-semibold text-gray-900">
                  {tpl.name}
                </Text>
                <Pressable className="px-2 py-1 rounded-full border border-gray-200">
                  <Text className="text-[10px] text-gray-900">調整</Text>
                </Pressable>
              </View>
              <Text className="text-xs text-gray-600">{tpl.usage}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <MainLayout
      title="訂單管理"
      subtitle={
        primaryTab === "orders" ? "本週 24 筆 · 5 待處理" : "商品設定"
      }
      teamName="甜點工作室 A"
      onCreatePress={handleCreate}
      onSearchPress={() => console.log("search order")}
      onNotificationsPress={() => console.log("notifications")}
      onTeamPress={() => console.log("team picker")}
      tabs={primaryTabs.map((tab) => ({
        ...tab,
        active: tab.key === primaryTab,
        onPress: () => setPrimaryTab(tab.key),
      }))}
    >
      {primaryTab === "orders" ? renderOrderContent() : renderProductContent()}
    </MainLayout>
  );
}

type IconActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

function IconAction({ icon, label }: IconActionProps) {
  return (
    <Pressable
      className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
      accessibilityLabel={label}
    >
      <Ionicons
        name={icon}
        size={14}
        color={Palette.neutrals.heading}
      />
    </Pressable>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
};

function SummaryCard({ label, value, description, icon }: SummaryCardProps) {
  return (
    <View className="rounded-xl bg-white p-4 border border-gray-100  ">
      <View className="flex-row items-center gap-2 mb-2">
        <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
          {icon}
        </View>
        <Text className="text-xs text-gray-500">{label}</Text>
      </View>
      <Text className="text-xl font-bold text-gray-900">{value}</Text>
      {description ? (
        <Text className="text-[11px] text-gray-500 mt-1">{description}</Text>
      ) : null}
    </View>
  );
}
