import { MainLayout } from "@/components/layout/MainLayout";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

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

  const customers = useMemo<Customer[]>(
    () => [
      {
        id: "c1",
        name: "王小明",
        phone: "0912-345-678",
        tags: ["VIP", "常客"],
        totalOrders: 18,
        totalSpent: 21580,
        lastOrderAt: "2/12 14:30",
        notes: "喜歡巴斯克，常提前 2 週預約",
      },
      {
        id: "c2",
        name: "陳小姐",
        phone: "0987-223-456",
        tags: ["高價值"],
        totalOrders: 9,
        totalSpent: 18320,
        lastOrderAt: "2/10 11:00",
        notes: "對 LINE 回覆快速；有企業訂單需求",
      },
      {
        id: "c3",
        name: "劉先生",
        tags: ["待活絡"],
        totalOrders: 3,
        totalSpent: 3980,
        lastOrderAt: "12/25 17:00",
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

  const renderSummaryCards = () => (
    <View className="flex-row flex-wrap -mx-1">
      <SummaryCard
        label="顧客總數"
        value={`${summary.totalCustomers.toLocaleString()} 位`}
        helper="包含 LINE 綁定"
      />
      <SummaryCard
        label="本週新增"
        value={`${summary.newThisWeek} 位`}
        helper="來自 LINE / 表單"
      />
      <SummaryCard
        label="回訪率"
        value={`${Math.round(summary.repeatRate * 100)}%`}
        helper="近 90 天下單兩次以上"
      />
      <SummaryCard
        label="高價值顧客"
        value={`${summary.highValueCount} 位`}
        helper="消費金額 > $10,000"
      />
    </View>
  );

  const renderCustomerList = () => (
    <View className="space-y-3">
      {customers.map((customer) => (
        <View
          key={customer.id}
          className="rounded-2xl border border-gray-100 bg-white p-4  "
        >
          <View className="flex-row items-center justify-between mb-2">
            <View>
              <Text className="text-base font-semibold text-gray-900">
                {customer.name}
              </Text>
              {customer.phone ? (
                <Text className="text-[11px] text-gray-500 mt-0.5">
                  {customer.phone}
                </Text>
              ) : (
                <Text className="text-[11px] text-gray-400 mt-0.5">
                  尚未綁定電話
                </Text>
              )}
            </View>
            <Pressable className="flex-row items-center gap-1">
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#111827" />
              <Text className="text-[11px] text-gray-900 font-medium">
                查看對話
              </Text>
            </Pressable>
          </View>

          <View className="flex-row flex-wrap gap-2 mb-2">
            {customer.tags.map((tag) => (
              <View
                key={tag}
                className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200"
              >
                <Text className="text-[10px] text-gray-600">{tag}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row justify-between text-xs mb-2">
            <DetailRow label="總訂單" value={`${customer.totalOrders} 筆`} />
            <DetailRow
              label="總消費"
              value={`$${customer.totalSpent.toLocaleString()}`}
            />
            <DetailRow label="最後訂單" value={customer.lastOrderAt} />
          </View>

          {customer.notes ? (
            <Text className="text-[11px] text-gray-500">{customer.notes}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );

  return (
    <MainLayout
      title="顧客管理"
      subtitle="顧客 128 位 · 回訪率 74%"
      teamName="甜點工作室 A"
      tabs={[
        {
          key: "overview",
          label: "概覽",
          active: segment === "overview",
          onPress: () => setSegment("overview"),
        },
        {
          key: "list",
          label: "清單",
          active: segment === "list",
          onPress: () => setSegment("list"),
        },
      ]}
      onTeamPress={() => console.log("team picker")}
      onSearchPress={() => console.log("search customers")}
      onNotificationsPress={() => console.log("notifications")}
      onCreatePress={() => console.log("add customer")}
    >
      <View className="space-y-5">
        {segment === "overview" ? (
          <>
            <View className="rounded-2xl border border-gray-100 bg-white p-4  ">
              <Text className="text-sm font-semibold text-gray-900 mb-3">
                顧客概況
              </Text>
              {renderSummaryCards()}
            </View>

            <View className="rounded-2xl border border-gray-100 bg-white p-4  ">
              <Text className="text-sm font-semibold text-gray-900 mb-3">
                行動建議
              </Text>
              <View className="space-y-2">
                <Suggestion
                  icon="gift-outline"
                  title="針對高價值顧客推出感謝禮"
                  detail="15 位顧客消費超過 $10,000，可推專屬優惠"
                />
                <Suggestion
                  icon="chatbubble-outline"
                  title="喚醒 30 天未回訪顧客"
                  detail="6 位顧客連續 30 天未下單，可傳送提醒訊息"
                />
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
};

function SummaryCard({ label, value, helper }: SummaryCardProps) {
  return (
    <View className="w-1/2 px-1 mb-2">
      <View className="rounded-2xl border border-gray-100 bg-white p-4  ">
        <Text className="text-xs text-gray-500">{label}</Text>
        <Text className="text-lg font-bold text-gray-900 mt-1">{value}</Text>
        {helper ? (
          <Text className="text-[11px] text-gray-500 mt-1">{helper}</Text>
        ) : null}
      </View>
    </View>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View className="items-start">
      <Text className="text-[11px] text-gray-500">{label}</Text>
      <Text className="text-xs font-semibold text-gray-900">{value}</Text>
    </View>
  );
}

type SuggestionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
};

function Suggestion({ icon, title, detail }: SuggestionProps) {
  return (
    <View className="rounded-xl border border-gray-100 bg-gray-50 p-3 flex-row items-start gap-3">
      <View className="w-8 h-8 rounded-full bg-white items-center justify-center">
        <Ionicons name={icon} size={16} color="#111827" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-900">{title}</Text>
        <Text className="text-[11px] text-gray-500 mt-1">{detail}</Text>
      </View>
      <Pressable className="px-2 py-1 rounded-full border border-gray-200">
        <Text className="text-[10px] text-gray-900 font-medium">執行</Text>
      </Pressable>
    </View>
  );
}
