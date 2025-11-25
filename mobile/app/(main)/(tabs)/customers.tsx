import { MainLayout } from "@/components/layout/MainLayout";
import { IconButton } from "@/components/Navbar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Palette } from "@/constants/palette";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useCustomers } from "@/hooks/queries/useCustomers";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

type Segment = "overview" | "list";

export default function Customers() {
  const { currentTeam, currentTeamId } = useCurrentTeam();
  const [segment, setSegment] = useState<Segment>("overview");
  const brandTeal = Palette.brand.primary;

  const {
    data: customers = [],
    isLoading,
    isRefetching,
    refetch,
  } = useCustomers(currentTeamId, undefined, !!currentTeamId);

  const summary = useMemo(() => {
    const totalCustomers = customers.length;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // 週日為 0

    const newThisWeek = customers.filter((c) => {
      if (!c.created_at) return false;
      const created = new Date(c.created_at);
      return created >= startOfWeek;
    }).length;

    const repeatRate =
      totalCustomers === 0
        ? 0
        : customers.filter((c) => c.total_orders >= 2).length / totalCustomers;

    const highValueCount = customers.filter(
      (c) => (c.total_spent || 0) > 10000
    ).length;

    return {
      totalCustomers,
      newThisWeek,
      repeatRate,
      highValueCount,
    };
  }, [customers]);

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
    <ScrollView
      className="pb-20"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={brandTeal}
        />
      }
    >
      <View className="space-y-3">
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color={brandTeal} />
            <Text className="text-slate-500 mt-2">載入顧客中</Text>
          </View>
        ) : customers.length === 0 ? (
          <Text className="text-xs text-slate-500 text-center py-10">
            目前尚無顧客資料
          </Text>
        ) : (
          customers.map((customer) => (
            <View
              key={customer.id}
              className="rounded-3xl border border-slate-100 bg-white p-4 flex-row items-center shadow-[0px_10px_25px_rgba(15,23,42,0.04)]"
            >
              {/* Left: Avatar */}
              <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center mr-3">
                <Text className="text-lg font-bold text-gray-600">
                  {customer.name?.[0] || "客"}
                </Text>
              </View>

              {/* Center: Info */}
              <View className="flex-1 mr-2">
                <View className="flex-row items-center gap-2 mb-1">
                  <Text className="text-base font-bold text-gray-900">
                    {customer.name || "未命名顧客"}
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
                  {(customer.tags || []).map((tag) => (
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
                <Text
                  className="text-sm font-bold"
                  style={{ color: brandTeal }}
                >
                  ${(customer.total_spent || 0).toLocaleString()}
                </Text>
                <Text className="text-[10px] text-gray-400">
                  最後消費{" "}
                  {customer.last_order_at
                    ? new Date(customer.last_order_at).toLocaleDateString(
                        "zh-TW",
                        { month: "numeric", day: "numeric" }
                      )
                    : "—"}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const mockHighValue = [
    { name: "林小姐", spent: 18200, last: "11/30" },
    { name: "王先生", spent: 14900, last: "11/28" },
    { name: "陳老闆", spent: 13250, last: "11/25" },
  ];

  const mockNewVsReturning = [
    { label: "近 7 天新客", value: "+18", helper: "新加入" },
    { label: "近 30 天回訪率", value: "42%", helper: "下單 ≥ 2 次" },
    { label: "平均客單", value: "$520", helper: "近 30 天" },
  ];

  return (
    <MainLayout
      title="顧客管理"
      teamName={currentTeam?.team_name || "載入中..."}
      centerContent={
        <View>
          <Text className="text-sm font-semibold text-slate-900">顧客視圖</Text>
          <Text className="text-[12px] text-slate-500 mt-1">
            切換顧客概覽與清單
          </Text>
          <View className="mt-2">
            <SegmentedControl
              options={[
                { label: "概覽", value: "overview" },
                { label: "清單", value: "list" },
              ]}
              value={segment}
              onChange={(val) => setSegment(val as Segment)}
              theme="brand"
            />
          </View>
        </View>
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
                    即時資料
                  </Text>
                </View>
                <Pressable className="px-3 py-1.5 rounded-full border border-slate-200 ">
                  <Text className="text-xs font-semibold text-slate-600">
                    匯出報表
                  </Text>
                </Pressable>
              </View>
              {renderSummaryCards()}
            </View>

            <View className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm font-semibold text-slate-900">
                  顧客洞察（預覽）
                </Text>
                <Text className="text-[11px] text-slate-400">開發中</Text>
              </View>

              <View className="flex-row gap-2 mb-3">
                {mockNewVsReturning.map((item) => (
                  <View
                    key={item.label}
                    className="flex-1 rounded-2xl border border-slate-100 bg-white px-3 py-3"
                    style={{ backgroundColor: "rgba(15,23,42,0.02)" }}
                  >
                    <Text className="text-[11px] text-slate-500">
                      {item.label}
                    </Text>
                    <Text className="text-xl font-bold text-slate-900 mt-1">
                      {item.value}
                    </Text>
                    <Text className="text-[11px] text-slate-500 mt-1">
                      {item.helper}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="gap-2">
                {mockHighValue.map((item) => (
                  <View
                    key={item.name}
                    className="flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white px-3 py-3"
                    style={{ backgroundColor: "rgba(0,128,128,0.05)" }}
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-900">
                        {item.name}
                      </Text>
                      <Text className="text-[11px] text-slate-500">
                        最後消費 {item.last}
                      </Text>
                    </View>
                    <Text className="text-base font-bold text-slate-900">
                      ${item.spent.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="absolute inset-0 bg-black/35 items-center justify-center px-6">
                <Text className="text-white font-semibold text-center">
                  顧客洞察開發中，敬請期待
                </Text>
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
