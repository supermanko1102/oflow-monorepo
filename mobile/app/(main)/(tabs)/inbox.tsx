import { MainLayout } from "@/components/layout/MainLayout";
import { Palette } from "@/constants/palette";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

type InboxMode = "exception" | "auto";

type ExceptionTicket = {
  id: string;
  customer: string;
  issue: string;
  hint: string;
  lastMessage: string;
  lastTime: string;
  missingFields: string[];
};

type AutoRecord = {
  id: string;
  customer: string;
  orderNo: string;
  pickup: string;
  amount: number;
  snippet: string;
  createdAt: string;
};

export default function Inbox() {
  const [mode, setMode] = useState<InboxMode>("exception");

  const exceptions = useMemo<ExceptionTicket[]>(
    () => [
      {
        id: "e1",
        customer: "王小明",
        issue: "未指定付款方式",
        hint: "AI 無法確認是否需收定金",
        lastMessage: "那我到店再付現可以嗎？",
        lastTime: "14:02",
        missingFields: ["付款方式"],
      },
      {
        id: "e2",
        customer: "劉先生",
        issue: "時間不在營業時段",
        hint: "AI 偵測到顧客想要 23:00 取貨",
        lastMessage: "可以晚一點嗎？我 11 點才到台北",
        lastTime: "13:40",
        missingFields: ["可行取貨時間"],
      },
      {
        id: "e3",
        customer: "陳小姐",
        issue: "商品未在目錄",
        hint: "顧客要求客製翻糖，小幫手無法對應",
        lastMessage: "如果可以做翻糖熊熊，我願意加價",
        lastTime: "11:05",
        missingFields: ["商品確認", "價格"],
      },
    ],
    []
  );

  const autoRecords = useMemo<AutoRecord[]>(
    () => [
      {
        id: "a1",
        customer: "林小姐",
        orderNo: "#OD-20240214-001",
        pickup: "2/20 (二) 15:30 自取",
        amount: 1680,
        snippet: "AI：已為您安排 2/20 取貨，期待您光臨。",
        createdAt: "今天 12:10",
      },
      {
        id: "a2",
        customer: "簡先生",
        orderNo: "#OD-20240214-002",
        pickup: "2/18 (日) 11:00 外送",
        amount: 2280,
        snippet: "AI：外送地址已確認，請當天保持電話暢通。",
        createdAt: "今天 09:45",
      },
    ],
    []
  );

  const renderExceptionCard = (ticket: ExceptionTicket) => (
    <View
      key={ticket.id}
      className="rounded-2xl border border-orange-100 bg-white p-4   mb-3"
    >
      <View className="flex-row items-center justify-between mb-2">
        <View>
          <Text className="text-base font-semibold text-gray-900">
            {ticket.customer}
          </Text>
          <Text className="text-[11px] text-gray-500 mt-0.5">
            最新時間 {ticket.lastTime}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <ActionButton
            icon="chatbubble-ellipses-outline"
            label="回覆"
            onPress={() => console.log("reply", ticket.id)}
          />
          <ActionButton
            icon="checkmark-circle-outline"
            label="建單"
            onPress={() => console.log("accept", ticket.id)}
            primary
          />
        </View>
      </View>
      <View className="rounded-xl bg-orange-50 p-3 mb-3">
        <Text className="text-xs font-semibold text-orange-700">
          {ticket.issue}
        </Text>
        <Text className="text-[11px] text-orange-700 mt-1">{ticket.hint}</Text>
      </View>
      <View className="mb-2">
        <Text className="text-[11px] text-gray-500">缺少欄位</Text>
        <View className="flex-row flex-wrap gap-2 mt-1">
          {ticket.missingFields.map((field) => (
            <View
              key={field}
              className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200"
            >
              <Text className="text-[10px] text-gray-600">{field}</Text>
            </View>
          ))}
        </View>
      </View>
      <View className="rounded-xl bg-gray-50 p-3">
        <Text className="text-[11px] text-gray-500 mb-1">最新對話</Text>
        <Text className="text-xs text-gray-800">{ticket.lastMessage}</Text>
      </View>
    </View>
  );

  const renderAutoRecord = (record: AutoRecord) => (
    <View
      key={record.id}
      className="rounded-2xl border border-gray-100 bg-white p-4   mb-3"
    >
      <View className="flex-row items-center justify-between mb-2">
        <View>
          <Text className="text-base font-semibold text-gray-900">
            {record.customer}
          </Text>
          <Text className="text-[11px] text-gray-500 mt-0.5">
            {record.createdAt}
          </Text>
        </View>
        <Pressable className="flex-row items-center gap-1">
          <Ionicons
            name="receipt-outline"
            size={14}
            color={Palette.neutrals.heading}
          />
          <Text className="text-[11px] text-gray-900 font-medium">
            {record.orderNo}
          </Text>
        </Pressable>
      </View>
      <DetailRow label="取貨" value={record.pickup} />
      <DetailRow
        label="金額"
        value={`$${record.amount.toLocaleString()}`}
        className="mt-1"
      />
      <View className="rounded-xl bg-gray-50 p-3 mt-3">
        <Text className="text-[11px] text-gray-500 mb-1">AI 回覆</Text>
        <Text className="text-xs text-gray-700">{record.snippet}</Text>
      </View>
    </View>
  );

  return (
    <MainLayout
      title="對話收件匣"
      subtitle={
        mode === "exception"
          ? `${exceptions.length} 筆 AI 無法處理的對話`
          : `${autoRecords.length} 筆已自動建單`
      }
      teamName="甜點工作室 A"
      tabs={[
        {
          key: "exception",
          label: "例外處理",
          active: mode === "exception",
          onPress: () => setMode("exception"),
        },
        {
          key: "auto",
          label: "自動紀錄",
          active: mode === "auto",
          onPress: () => setMode("auto"),
        },
      ]}
      onTeamPress={() => console.log("team picker")}
      onSearchPress={() => console.log("search inbox")}
      onNotificationsPress={() => console.log("notifications")}
      onCreatePress={() => console.log("新建訊息")}
    >
      {mode === "exception" ? (
        <View className="space-y-4">
          <View className="rounded-2xl border border-gray-100 bg-white p-4  ">
            <Text className="text-sm font-semibold text-gray-900">
              AI 無法完整處理
            </Text>
            <Text className="text-[11px] text-gray-500 mt-1">
              以下對話需要你補充資訊或決定是否接單
            </Text>
          </View>
          {exceptions.map((ticket) => renderExceptionCard(ticket))}
        </View>
      ) : (
        <View className="space-y-4">
          <View className="rounded-2xl border border-gray-100 bg-white p-4  ">
            <Text className="text-sm font-semibold text-gray-900">
              自動建單紀錄
            </Text>
            <Text className="text-[11px] text-gray-500 mt-1">
              AI 已自動回覆並建立訂單，你可以隨時查看對話紀錄
            </Text>
          </View>
          {autoRecords.map((record) => renderAutoRecord(record))}
        </View>
      )}
    </MainLayout>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
  className?: string;
};

function DetailRow({ label, value, className = "" }: DetailRowProps) {
  return (
    <View className={`flex-row justify-between ${className}`}>
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="text-xs font-semibold text-gray-900">{value}</Text>
    </View>
  );
}

type ActionButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
};

function ActionButton({ icon, label, onPress, primary }: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-1 rounded-full border flex-row items-center gap-1 ${
        primary ? "border-gray-900 bg-gray-900" : "border-gray-200"
      }`}
    >
      <Ionicons
        name={icon}
        size={12}
        color={primary ? Palette.neutrals.white : Palette.neutrals.heading}
      />
      <Text
        className={`text-[10px] font-semibold ${
          primary ? "text-white" : "text-gray-900"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
