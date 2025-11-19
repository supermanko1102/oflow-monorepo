import { MainLayout } from "@/components/layout/MainLayout";
import { IconButton } from "@/components/Navbar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Palette } from "@/constants/palette";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type Customer = {
  id: string;
  name: string;
  phone?: string;
  tags: string[];
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string;
  notes?: string;
};

type Segment = "overview" | "list";

export default function Customers() {
  const [segment, setSegment] = useState<Segment>("overview");
  const brandTeal = Palette.brand.primary;
  const brandSlate = Palette.brand.slate;

  const customers = useMemo<Customer[]>(
    () => [
      {
        id: "c1",
        name: "王小明",
        phone: "0912-345-678",
        tags: ["VIP", "常客"],
        totalOrders: 18,
        totalSpent: 21580,
        lastOrderAt: "2/12",
        notes: "喜歡巴斯克，常提前 2 週預約",
      },
      {
        id: "c2",
        name: "陳小姐",
        phone: "0987-223-456",
        tags: ["高價值"],
        totalOrders: 9,
        totalSpent: 18320,
        lastOrderAt: "2/10",
        notes: "對 LINE 回覆快速；有企業訂單需求",
      },
      {
        id: "c3",
        name: "劉先生",
        tags: ["待活絡"],
        totalOrders: 3,
        totalSpent: 3980,
        lastOrderAt: "12/25",
        notes: "喜歡客製禮盒，可以推新方案",
      },
    ],
    []
  );

  const summary = useMemo(
    () => ({
      totalCustomers: 128,
      newThisWeek: 6,
      repeatRate: 0.74,
      highValueCount: 15,
    }),
    []
  );

  const summaryCards = useMemo(
    () => [
      {
        label: "顧客總數",
        value: summary.totalCustomers.toLocaleString(),
        helper: "包含 LINE 綁定",
        highlight: true,
      },
      {
        label: "本週新增",
        value: `+${summary.newThisWeek}`,
        helper: "來自 LINE / 表單",
      },
      {
        label: "回訪率",
        value: `${Math.round(summary.repeatRate * 100)}%`,
        helper: "近 90 天下單兩次以上",
      },
      {
        label: "高價值顧客",
        value: `${summary.highValueCount}`,
        helper: "消費金額 > $10,000",
      },
    ],
    [summary]
  );

  const suggestions: Array<Omit<SuggestionProps, "brandColor">> = [
    {
      icon: "gift-outline",
      title: "喚醒沈睡客",
      detail: "5 位 VIP 超過 60 天未消費",
      actionLabel: "推廣活動",
    },
    {
      icon: "chatbubble-outline",
      title: "邀請加入 LINE",
      detail: "12 位顧客尚未綁定 LINE 帳號",
      actionLabel: "發送連結",
    },
  ];

  const renderSummaryCards = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingRight: 16 }}
      className="pl-1"
    >
      {summaryCards.map((card) => (
        <SummaryCard
          key={card.label}
          label={card.label}
          value={card.value}
          helper={card.helper}
          highlight={card.highlight}
          brandColor={brandTeal}
        />
      ))}
    </ScrollView>
  );

  const renderCustomerList = () => (
    <View className="space-y-3">
      {customers.map((customer) => (
        <View
          key={customer.id}
          className="rounded-3xl border border-slate-100 bg-white p-4 flex-row items-center shadow-[0px_10px_25px_rgba(15,23,42,0.04)]"
        >
          {/* Left: Avatar */}
          <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center mr-3">
            <Text className="text-lg font-bold text-gray-600">
              {customer.name[0]}
            </Text>
          </View>

          {/* Center: Info */}
          <View className="flex-1 mr-2">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-base font-bold text-gray-900">
                {customer.name}
              </Text>
              {!customer.phone && (
                <View className="rounded-md bg-red-50 px-1.5 py-0.5">
                  <Text className="text-[10px] text-red-600 font-medium">
                    缺電話
                  </Text>
                </View>
              )}
            </View>
            {customer.phone && (
              <Text className="text-xs text-gray-500 mb-1">
                {customer.phone}
              </Text>
            )}
            <View className="flex-row flex-wrap gap-1">
              {customer.tags.map((tag) => (
                <View
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-slate-100"
                >
                  <Text className="text-[10px] text-slate-600">{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Right: Stats */}
          <View className="items-end">
            <Text className="text-sm font-bold" style={{ color: brandTeal }}>
              ${customer.totalSpent.toLocaleString()}
            </Text>
            <Text className="text-[10px] text-gray-400">
              最後消費 {customer.lastOrderAt}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <MainLayout
      title="顧客管理"
      teamName="甜點工作室 A"
      centerContent={
        <SegmentedControl
          options={[
            { label: "概覽", value: "overview" },
            { label: "清單", value: "list" },
          ]}
          value={segment}
          onChange={(val) => setSegment(val as Segment)}
        />
      }
      rightContent={
        <View className="flex-row items-center gap-2">
          <IconButton
            icon="search-outline"
            ariaLabel="搜尋"
            onPress={() => console.log("search")}
            isDark={false}
          />
        </View>
      }
      onTeamPress={() => console.log("team picker")}
      onNotificationsPress={() => console.log("notifications")}
      onCreatePress={() => console.log("add customer")}
    >
      <View className="space-y-5">
        {segment === "overview" ? (
          <>
            <View className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-sm font-semibold text-slate-900">
                    顧客概況
                  </Text>
                  <Text className="text-xs text-slate-400 mt-0.5">
                    模擬資料 · 待串接 API
                  </Text>
                </View>
                <Pressable className="px-3 py-1.5 rounded-full border border-slate-200">
                  <Text className="text-xs font-semibold text-slate-600">
                    匯出報表
                  </Text>
                </Pressable>
              </View>
              {renderSummaryCards()}
            </View>

            <View className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <Text className="text-sm font-semibold text-slate-900 mb-3">
                行動建議
              </Text>
              <View className="gap-3">
                {suggestions.map((suggestion) => (
                  <Suggestion
                    
                    key={suggestion.title}
                    {...suggestion}
                    brandColor={brandTeal}
                  />
                ))}
              </View>
            </View>
          </>
        ) : (
          renderCustomerList()
        )}
      </View>
    </MainLayout>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  helper?: string;
  highlight?: boolean;
  brandColor: string;
};

function SummaryCard({
  label,
  value,
  helper,
  highlight,
  brandColor,
}: SummaryCardProps) {
  const backgroundColor = highlight ? brandColor : "#F8FAFC";
  const textColor = highlight ? "#FFFFFF" : "#0F172A";
  const helperColor = highlight ? "rgba(255,255,255,0.7)" : "#94A3B8";

  return (
    <View
      className="w-44 rounded-3xl border p-4"
      style={{
        backgroundColor,
        borderColor: highlight ? "transparent" : "#E2E8F0",
      }}
    >
      <Text
        className="text-xs font-semibold uppercase tracking-wide mb-1"
        style={{ color: helperColor }}
      >
        {label}
      </Text>
      <Text className="text-2xl font-bold mb-1" style={{ color: textColor }}>
        {value}
      </Text>
      {helper ? (
        <Text className="text-[11px]" style={{ color: helperColor }}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

type SuggestionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  actionLabel: string;
  brandColor: string;
};

function Suggestion({ icon, title, detail, actionLabel, brandColor }: SuggestionProps) {
  return (
    <View className="rounded-2xl border border-slate-100 bg-white p-4 flex-row items-center gap-3 shadow-sm">
      <View
        className="w-10 h-10 rounded-2xl items-center justify-center"
        style={{ backgroundColor: "rgba(0,128,128,0.1)" }}
      >
        <Ionicons
          name={icon}
          size={16}
          color={brandColor}
        />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-slate-900">{title}</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{detail}</Text>
      </View>
      <Pressable
        className="px-3 py-1.5 rounded-full"
        style={{ backgroundColor: brandColor }}
      >
        <Text className="text-xs text-white font-semibold">{actionLabel}</Text>
      </Pressable>
    </View>
  );
}
