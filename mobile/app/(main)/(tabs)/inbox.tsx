import { MainLayout } from "@/components/layout/MainLayout";
import { IconButton } from "@/components/Navbar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { NoWebhookState } from "@/components/ui/NoWebhookState";
import { Palette } from "@/constants/palette";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useConversations } from "@/hooks/queries/useConversations";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

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
  orderNo?: string;
  pickup?: string;
  amount?: number;
  snippet: string;
  createdAt: string;
};

const brandTeal = Palette.brand.primary;
const brandSlate = Palette.brand.slate;

export default function Inbox() {
  const {
    currentTeam,
    currentTeamId,
    hasWebhook,
    isLoading: isTeamLoading,
  } = useCurrentTeam();

  const {
    data: collecting = [],
    isLoading: isCollectingLoading,
    isRefetching: isCollectingRefetching,
    refetch: refetchCollecting,
  } = useConversations(currentTeamId, "collecting_info", 50, !!currentTeamId);

  const {
    data: completed = [],
    isLoading: isCompletedLoading,
    isRefetching: isCompletedRefetching,
    refetch: refetchCompleted,
  } = useConversations(currentTeamId, "completed", 50, !!currentTeamId);

  const [mode, setMode] = useState<InboxMode>("exception");

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return "--:--";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "--:--";
    return date.toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exceptions = useMemo<ExceptionTicket[]>(() => {
    return collecting.map((conv) => ({
      id: conv.id,
      customer: conv.line_user_id || "LINE 使用者",
      issue:
        conv.missing_fields && conv.missing_fields.length > 0
          ? `缺少 ${conv.missing_fields.join("、")}`
          : "需要補充資料",
      hint: conv.collected_data ? "已擷取部分資訊，請補齊缺漏" : "",
      lastMessage: conv.lastMessage?.message || "無最新訊息",
      lastTime: formatTime(conv.last_message_at),
      missingFields: conv.missing_fields || [],
    }));
  }, [collecting]);

  const autoRecords = useMemo<AutoRecord[]>(() => {
    return completed.map((conv) => ({
      id: conv.id,
      customer: conv.line_user_id || "LINE 使用者",
      orderNo: conv.order_id ? `#${conv.order_id}` : undefined,
      pickup: "",
      amount: conv.collected_data?.total_amount ?? 0,
      snippet: conv.lastMessage?.message || "已完成對話",
      createdAt: formatTime(conv.last_message_at),
    }));
  }, [completed]);

  const summaryCards = useMemo(
    () => [
      {
        label: "需人工介入",
        value: `${exceptions.length} 筆`,
        description: "AI 無法完整處理",
        tone: "danger" as const,
      },
      {
        label: "AI 已建單",
        value: `${autoRecords.length} 筆`,
        description: "自動同步 LINE 對話",
        tone: "success" as const,
      },
    ],
    [exceptions.length, autoRecords.length]
  );

  const summaryToneStyles = {
    danger: {
      backgroundColor: "rgba(248, 113, 113, 0.15)",
      borderColor: "rgba(248, 113, 113, 0.35)",
      textColor: "#B91C1C",
    },
    success: {
      backgroundColor: "rgba(0, 128, 128, 0.12)",
      borderColor: "rgba(0, 128, 128, 0.3)",
      textColor: brandTeal,
    },
  };

  if (!hasWebhook && !isTeamLoading) {
    return (
      <MainLayout title="對話收件匣">
        <NoWebhookState />
      </MainLayout>
    );
  }

  const renderSummaryCard = (card: (typeof summaryCards)[number]) => {
    const tone = summaryToneStyles[card.tone];
    return (
      <View
        key={card.label}
        className="rounded-3xl border px-4 py-3 flex-1 min-w-[150px]"
        style={{
          backgroundColor: tone.backgroundColor,
          borderColor: tone.borderColor,
        }}
      >
        <Text
          className="text-xs font-semibold uppercase"
          style={{ color: tone.textColor }}
        >
          {card.label}
        </Text>
        <Text
          className="text-2xl font-bold mt-1"
          style={{ color: tone.textColor }}
        >
          {card.value}
        </Text>
        <Text className="text-xs text-slate-500 mt-1">{card.description}</Text>
      </View>
    );
  };

  const renderExceptionCard = (ticket: ExceptionTicket) => (
    <View
      key={ticket.id}
      className="rounded-3xl bg-white p-4 mb-4 border border-slate-100 shadow-[0px_10px_25px_rgba(15,23,42,0.04)]"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-full bg-slate-100 items-center justify-center">
            <Text className="text-base font-bold text-slate-600">
              {ticket.customer[0]}
            </Text>
          </View>
          <View>
            <Text className="text-base font-bold text-slate-900">
              {ticket.customer}
            </Text>
            <Text className="text-xs text-slate-400">
              LINE · {ticket.lastTime}
            </Text>
          </View>
        </View>
        <View className="px-3 py-1 rounded-full bg-red-50 border border-red-100">
          <Text className="text-[11px] font-semibold text-red-500">
            例外處理
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2 mt-3">
        {ticket.missingFields.map((field) => (
          <View
            key={field}
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: "rgba(248,113,113,0.12)" }}
          >
            <Text className="text-[11px] font-semibold text-red-500">
              缺：{field}
            </Text>
          </View>
        ))}
      </View>

      <View
        className="rounded-2xl p-3 mt-4 border"
        style={{
          backgroundColor: "rgba(251, 146, 60, 0.12)",
          borderColor: "rgba(251, 146, 60, 0.35)",
        }}
      >
        <View className="flex-row items-center gap-2 mb-1">
          <Ionicons name="alert-circle-outline" size={18} color="#EA580C" />
          <Text className="text-sm font-semibold text-slate-900">
            {ticket.issue}
          </Text>
        </View>
        <Text className="text-xs text-slate-600 ml-7">{ticket.hint}</Text>
      </View>

      <View
        className="mt-4 rounded-2xl px-3 py-2"
        style={{ backgroundColor: "rgba(0,128,128,0.08)" }}
      >
        <Text className="text-[11px] text-brand-slate mb-1">AI 擷取對話</Text>
        <Text className="text-sm text-slate-900">{ticket.lastMessage}</Text>
      </View>

      <View className="flex-row gap-3 mt-4">
        <Pressable
          onPress={() => console.log("reply", ticket.id)}
          className="flex-1 h-11 rounded-full border flex-row items-center justify-center gap-2 bg-white"
          style={{ borderColor: "#E2E8F0" }}
        >
          <Ionicons name="chatbubble-outline" size={16} color={brandSlate} />
          <Text className="text-sm font-semibold text-slate-700">回覆</Text>
        </Pressable>
        <Pressable
          onPress={() => console.log("create order", ticket.id)}
          className="flex-1 h-11 rounded-full flex-row items-center justify-center gap-2 shadow-sm"
          style={{ backgroundColor: brandTeal }}
        >
          <Ionicons name="add-circle-outline" size={16} color="white" />
          <Text className="text-sm font-semibold text-white">手動建單</Text>
        </Pressable>
      </View>
    </View>
  );

  const AutoRecordCard = ({ record }: { record: AutoRecord }) => {
    const [expanded, setExpanded] = useState(false);
    const amount = record.amount ?? 0;

    return (
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        className="rounded-3xl border border-slate-100 bg-white p-4 mb-4 shadow-[0px_10px_25px_rgba(15,23,42,0.04)]"
      >
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-xs font-semibold text-brand-slate">
              AI 已建立訂單
            </Text>
            <Text className="text-base font-bold text-slate-900 mt-1">
              {record.orderNo || `對話 ${record.id.slice(0, 6)}`}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-slate-400">{record.createdAt}</Text>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={16}
              color="#94A3B8"
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-sm font-medium text-slate-900">
            {record.customer}
          </Text>
          <Text className="text-base font-bold" style={{ color: brandTeal }}>
            ${amount.toLocaleString()}
          </Text>
        </View>
        <Text className="text-xs text-slate-500 mt-1">
          {record.pickup || "未填寫取貨時間"}
        </Text>
        <Text
          className="text-xs text-slate-500 mt-2"
          numberOfLines={expanded ? undefined : 1}
        >
          AI 回覆：{record.snippet.replace("AI：", "")}
        </Text>

        {expanded && (
          <View className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <DetailRow label="顧客" value={record.customer} />
            <DetailRow
              label="取貨"
              value={record.pickup || ""}
              className="mt-1"
            />
            <DetailRow
              label="金額"
              value={`$${amount.toLocaleString()}`}
              className="mt-1"
            />
            <View className="h-px bg-slate-200 my-3" />
            <Text className="text-[11px] text-slate-500 mb-1">完整回覆</Text>
            <Text className="text-xs text-slate-700">{record.snippet}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <MainLayout
      title="對話收件匣"
      teamName={currentTeam?.team_name || "載入中..."}
      centerContent={
        <SegmentedControl
          options={[
            {
              label: "⚠️ 例外處理",
              value: "exception",
              badge: exceptions.length,
            },
            { label: "✅ 自動紀錄", value: "auto", badge: autoRecords.length },
          ]}
          value={mode}
          onChange={(val) => setMode(val as InboxMode)}
          theme={mode === "exception" ? "danger" : "light"}
        />
      }
      rightContent={
        <View className="flex-row items-center gap-2">
          <IconButton
            icon="checkmark-done-outline"
            ariaLabel="批次處理"
            onPress={() => console.log("batch")}
            isDark={false}
          />
        </View>
      }
      onTeamPress={() => console.log("team picker")}
      onSearchPress={() => console.log("search inbox")}
      onNotificationsPress={() => console.log("notifications")}
      onCreatePress={() => console.log("新建訊息")}
    >
      <ScrollView
        className="px-4 pt-2 pb-24"
        refreshControl={
          <RefreshControl
            refreshing={
              mode === "exception"
                ? isCollectingRefetching
                : isCompletedRefetching
            }
            onRefresh={() =>
              mode === "exception" ? refetchCollecting() : refetchCompleted()
            }
            tintColor={brandTeal}
          />
        }
      >
        <View className="flex-row flex-wrap gap-3 mb-5">
          {summaryCards.map((card) => renderSummaryCard(card))}
        </View>
        {mode === "exception" ? (
          <>
            <View className="rounded-2xl border border-red-100 bg-red-50/70 p-4 mb-3">
              <Text className="text-sm font-semibold text-red-600">
                有 {exceptions.length} 筆對話需要人工介入處理
              </Text>
              <Text className="text-xs text-red-500 mt-1">
                快速回覆或手動建單，確保流程不中斷
              </Text>
            </View>
            {isCollectingLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator color={brandTeal} />
                <Text className="text-slate-500 mt-2">載入中...</Text>
              </View>
            ) : exceptions.length === 0 ? (
              <Text className="text-xs text-slate-500 py-6 text-center">
                目前沒有待補資料的對話
              </Text>
            ) : (
              exceptions.map((ticket) => renderExceptionCard(ticket))
            )}
          </>
        ) : (
          <View>
            {isCompletedLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator color={brandTeal} />
                <Text className="text-slate-500 mt-2">載入中...</Text>
              </View>
            ) : autoRecords.length === 0 ? (
              <Text className="text-xs text-slate-500 py-6 text-center">
                目前沒有已完成的對話
              </Text>
            ) : (
              autoRecords.map((record) => (
                <AutoRecordCard key={record.id} record={record} />
              ))
            )}
          </View>
        )}
      </ScrollView>
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
