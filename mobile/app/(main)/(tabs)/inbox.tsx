import { MainLayout } from "@/components/layout/MainLayout";
import {
  ConfirmOrderData,
  ConversationConfirmForm,
} from "@/components/form/ConversationConfirmForm";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Palette } from "@/constants/palette";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useUpdateAutoMode } from "@/hooks/queries/useTeams";
import { showApiError } from "@/lib/showApiError";
import {
  useConfirmConversation,
  useConversations,
  useConversationDetail,
  useIgnoreConversation,
  useConversationsRealtime,
} from "@/hooks/queries/useConversations";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type InboxMode = "exception" | "auto";
type OperationMode = "auto" | "semi";

type ExceptionTicket = {
  id: string;
  status: string;
  customer: string;
  issue: string;
  hint: string;
  lastMessage: string;
  lastTime: string;
  missingFields: string[];
  collectedData?: Record<string, any>;
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

const missingFieldLabels: Record<string, string> = {
  items: "商品品項",
  delivery_method: "配送方式",
  pickup_type: "取貨方式",
  delivery_date: "交付日期",
  delivery_time: "交付時間",
  pickup_location: "面交地點",
  store_info: "超商店號/店名",
  shipping_address: "寄送地址",
  customer_name: "顧客姓名",
  customer_phone: "聯絡電話",
};

export default function Inbox() {
  const { currentTeam, currentTeamId } = useCurrentTeam();

  const {
    data: collecting = [],
    isLoading: isCollectingLoading,
    isRefetching: isCollectingRefetching,
    refetch: refetchCollecting,
  } = useConversations(currentTeamId, "collecting_info", 50, !!currentTeamId);

  const {
    data: awaiting = [],
    isLoading: isAwaitingLoading,
    isRefetching: isAwaitingRefetching,
    refetch: refetchAwaiting,
  } = useConversations(
    currentTeamId,
    "awaiting_merchant_confirmation",
    50,
    !!currentTeamId
  );

  const {
    data: manual = [],
    isLoading: isManualLoading,
    isRefetching: isManualRefetching,
    refetch: refetchManual,
  } = useConversations(
    currentTeamId,
    "requires_manual_handling",
    50,
    !!currentTeamId
  );

  const {
    data: completed = [],
    isLoading: isCompletedLoading,
    isRefetching: isCompletedRefetching,
    refetch: refetchCompleted,
  } = useConversations(currentTeamId, "completed", 50, !!currentTeamId);

  const confirmConversation = useConfirmConversation();
  const ignoreConversation = useIgnoreConversation();

  const [inboxMode, setInboxMode] = useState<InboxMode>("exception");
  const [operationMode, setOperationMode] = useState<OperationMode>("auto");
  const { mutateAsync: mutateAutoMode, isPending: isUpdatingMode } =
    useUpdateAutoMode();
  useEffect(() => {
    if (currentTeam) {
      setOperationMode(currentTeam.auto_mode ? "auto" : "semi");
    }
  }, [currentTeam?.auto_mode, currentTeam]);

  const handleOperationModeChange = async (newMode: OperationMode) => {
    if (!currentTeamId || isUpdatingMode) return;
    try {
      await mutateAutoMode({
        teamId: currentTeamId,
        autoMode: newMode === "auto",
      });
      setOperationMode(newMode);
    } catch (error) {
      showApiError(error);
    }
  };

  useConversationsRealtime(currentTeamId);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formConversationId, setFormConversationId] = useState<string | null>(
    null
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUserRefreshing, setIsUserRefreshing] = useState(false);
  const conversationDetail = useConversationDetail(detailId, !!detailId);
  const formConversationDetail = useConversationDetail(
    formConversationId,
    !!formConversationId
  );
  const submitDetailForm = async (orderData: ConfirmOrderData) => {
    if (!formConversationId) return;
    try {
      await confirmConversation.mutateAsync({
        conversationId: formConversationId,
        orderData,
      });
      Alert.alert("建立成功", "已為此對話建立訂單");
      setDetailId(null);
      setFormConversationId(null);
      setIsFormOpen(false);
    } catch (error) {
      console.error("confirm conversation error", error);
      Alert.alert("建立失敗", "請稍後再試");
    }
  };

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
    const list = [...collecting, ...awaiting, ...manual];
    return list
      .map((conv) => ({
        id: conv.id,
        customer:
          conv.collected_data?.line_display_name?.trim() ||
          conv.line_user_id ||
          "LINE 使用者",
        status: conv.status,
        issue: "待補資料",
        hint: conv.collected_data ? "已擷取部分資訊，請補齊缺漏" : "",
        lastMessage: conv.lastMessage?.message || "無最新訊息",
        lastTime: formatTime(conv.last_message_at),
        missingFields: (conv.missing_fields || []).map(
          (f) => missingFieldLabels[f] || f
        ),
        collectedData: conv.collected_data || {},
      }))
      .sort(
        (a, b) =>
          new Date(b.lastTime || "").getTime() -
          new Date(a.lastTime || "").getTime()
      );
  }, [collecting, awaiting, manual]);

  const autoRecords = useMemo<AutoRecord[]>(() => {
    return completed.map((conv) => ({
      id: conv.id,
      customer:
        conv.collected_data?.line_display_name?.trim() ||
        conv.line_user_id ||
        "LINE 使用者",
      orderNo:
        conv.order_number ||
        conv.collected_data?.order_number ||
        (conv.order_id ? `訂單 ${conv.order_id.slice(0, 6)}` : undefined),
      pickup: "",
      amount: conv.collected_data?.total_amount ?? 0,
      snippet: conv.lastMessage?.message || "已完成對話",
      createdAt: formatTime(conv.last_message_at),
    }));
  }, [completed]);

  const handleIgnore = async (id: string) => {
    try {
      await ignoreConversation.mutateAsync(id);
    } catch (error) {
      console.error("ignore conversation error", error);
      Alert.alert("操作失敗", "請稍後再試");
    }
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
        <View
          className="px-3 py-1 rounded-full border"
          style={{
            backgroundColor: "rgba(13, 148, 136, 0.12)",
            borderColor: "rgba(13, 148, 136, 0.35)",
          }}
        >
          <Text
            className="text-[11px] font-semibold"
            style={{ color: brandTeal }}
          >
            {ticket.status === "awaiting_merchant_confirmation"
              ? "待確認"
              : "需人工"}
          </Text>
        </View>
      </View>
      <View className="flex-row justify-end mt-2">
        <Pressable
          onPress={() => setDetailId(ticket.id)}
          className="flex-row items-center gap-1 px-3 py-1 rounded-full bg-slate-100"
        >
          <Ionicons name="eye-outline" size={14} color={brandSlate} />
          <Text className="text-[12px] font-semibold text-slate-700">
            查看對話
          </Text>
        </Pressable>
      </View>

      <View
        className="rounded-2xl p-3 mt-4 border"
        style={{
          backgroundColor: "rgba(14, 165, 233, 0.08)",
          borderColor: "rgba(14, 165, 233, 0.25)",
        }}
      >
        <View className="flex-row items-center gap-2 mb-1">
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={brandTeal}
          />
          <Text className="text-sm font-semibold text-slate-900">
            {ticket.issue}
          </Text>
        </View>
        <Text className="text-xs text-slate-600 ml-7">
          {ticket.missingFields.length > 0
            ? `待補：${ticket.missingFields.join("、")}`
            : ticket.hint || "請確認資料"}
        </Text>
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
          onPress={() => handleIgnore(ticket.id)}
          className="flex-1 h-11 rounded-full border flex-row items-center justify-center gap-2 bg-white"
          style={{ borderColor: "#E2E8F0" }}
        >
          <Ionicons name="chatbubble-outline" size={16} color={brandSlate} />
          <Text className="text-sm font-semibold text-slate-700">忽略</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setFormConversationId(ticket.id);
            setIsFormOpen(true);
          }}
          className="flex-1 h-11 rounded-full flex-row items-center justify-center gap-2 shadow-sm"
          style={{ backgroundColor: brandTeal }}
          disabled={confirmConversation.isPending}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color="white" />
          <Text className="text-sm font-semibold text-white">確認建單</Text>
        </Pressable>
      </View>
    </View>
  );

  const AutoRecordCard = ({ record }: { record: AutoRecord }) => {
    const [expanded, setExpanded] = useState(false);
    const amount = record.amount ?? 0;
    const labelColor = expanded ? "white" : brandTeal;

    return (
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        className="rounded-3xl border bg-white mb-3 overflow-hidden"
        style={{
          borderColor: expanded ? "rgba(13, 148, 136, 0.35)" : "#E2E8F0",
          shadowColor: "#0F172A",
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: 10 },
          shadowRadius: 18,
        }}
      >
        <View
          className="px-4 py-3 flex-row items-start justify-between"
          style={{
            backgroundColor: expanded ? brandTeal : "rgba(13, 148, 136, 0.06)",
          }}
        >
          <View>
            <Text
              className="text-[11px] font-semibold"
              style={{ color: labelColor }}
            >
              AI 已建立訂單
            </Text>
            <Text
              className="text-base font-bold mt-1"
              style={{ color: expanded ? "white" : "#0F172A" }}
            >
              {record.orderNo || `對話 ${record.id.slice(0, 6)}`}
            </Text>
          </View>
          <View className="items-end">
            <Text
              className="text-[11px]"
              style={{ color: expanded ? "white" : "#94A3B8" }}
            >
              {record.createdAt}
            </Text>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={expanded ? "white" : "#94A3B8"}
            />
          </View>
        </View>

        <View className="px-4 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-slate-900">
              {record.customer}
            </Text>
            <View
              className="px-2 py-1 rounded-full border"
              style={{
                backgroundColor: "rgba(13, 148, 136, 0.08)",
                borderColor: "rgba(13, 148, 136, 0.25)",
              }}
            >
              <Text
                className="text-[12px] font-semibold"
                style={{ color: brandTeal }}
              >
                ${amount.toLocaleString()}
              </Text>
            </View>
          </View>
          <Text className="text-xs text-slate-500 mt-1">
            {record.pickup || "未填寫取貨時間"}
          </Text>
          <Text
            className="text-xs text-slate-600 mt-2"
            numberOfLines={expanded ? undefined : 1}
          >
            AI 回覆：{record.snippet.replace("AI：", "")}
          </Text>
        </View>

        {expanded && (
          <View
            className="px-4 pb-4"
            style={{
              backgroundColor: "rgba(13, 148, 136, 0.04)",
              borderTopWidth: 1,
              borderTopColor: "rgba(13, 148, 136, 0.15)",
            }}
          >
            <View className="rounded-2xl border border-slate-100 bg-white p-3">
              <View className="flex-row flex-wrap gap-2">
                <View
                  className="px-2 py-1 rounded-full border"
                  style={{
                    borderColor: "rgba(13, 148, 136, 0.3)",
                    backgroundColor: "rgba(13, 148, 136, 0.08)",
                  }}
                >
                  <Text
                    className="text-[11px] font-semibold"
                    style={{ color: brandTeal }}
                  >
                    {record.orderNo || "尚未產生編號"}
                  </Text>
                </View>
                <View className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <Text className="text-[11px] font-semibold text-slate-700">
                    取貨：{record.pickup || "未填"}
                  </Text>
                </View>
                <View className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <Text className="text-[11px] font-semibold text-slate-700">
                    建立時間：{record.createdAt}
                  </Text>
                </View>
              </View>

              <View className="h-px bg-slate-200 my-3" />
              <DetailRow label="顧客" value={record.customer} />
              <DetailRow
                label="金額"
                value={`$${amount.toLocaleString()}`}
                className="mt-1"
              />

              <View className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={16}
                    color={brandTeal}
                  />
                  <Text className="text-[11px] font-semibold text-slate-700">
                    AI 回覆
                  </Text>
                </View>
                <Text className="text-xs text-slate-700 leading-5">
                  {record.snippet}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View className="flex-1 relative">
      <MainLayout
        title="對話收件匣"
        teamName={currentTeam?.team_name || "載入中..."}
        centerContent={
          <View>
            <Text className="text-sm font-semibold text-slate-900">
              收件匣視圖
            </Text>
            <Text className="text-[12px] text-slate-500 mt-1">
              切換例外處理與 AI 自動紀錄
            </Text>
            <View className="mt-2">
              <SegmentedControl
                options={[
                  {
                    label: "例外處理",
                    value: "exception",
                    badge: exceptions.length,
                  },
                  {
                    label: "自動紀錄",
                    value: "auto",
                    badge: autoRecords.length,
                  },
                ]}
                value={inboxMode}
                onChange={(val) => setInboxMode(val as InboxMode)}
                theme="brand"
              />
              <View className="mt-3 bg-gray-100 p-1 rounded-full flex-row">
                <TouchableOpacity
                  onPress={() => handleOperationModeChange("auto")}
                  disabled={isUpdatingMode}
                  className={`flex-1 py-2 px-3 rounded-full flex-row items-center justify-center ${
                    operationMode === "auto" ? "bg-white" : ""
                  }`}
                >
                  {isUpdatingMode && operationMode !== "auto" ? (
                    <ActivityIndicator size="small" color="#9CA3AF" />
                  ) : (
                    <Ionicons
                      size={16}
                      color={operationMode === "auto" ? brandTeal : "#9CA3AF"}
                    />
                  )}
                  <Text
                    className={`ml-2 text-[13px] font-semibold ${
                      operationMode === "auto"
                        ? "text-brand-teal"
                        : "text-slate-500"
                    }`}
                  >
                    全自動
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleOperationModeChange("semi")}
                  disabled={isUpdatingMode}
                  className={`flex-1 py-2 px-3 rounded-full flex-row items-center justify-center ${
                    operationMode === "semi" ? "bg-white" : ""
                  }`}
                >
                  {isUpdatingMode && operationMode !== "semi" ? (
                    <ActivityIndicator size="small" color="#9CA3AF" />
                  ) : (
                    <Ionicons
                      name="file-tray-full-outline"
                      size={16}
                      color={operationMode === "semi" ? brandSlate : "#9CA3AF"}
                    />
                  )}
                  <Text
                    className={`ml-2 text-[13px] font-semibold ${
                      operationMode === "semi"
                        ? "text-brand-slate"
                        : "text-slate-500"
                    }`}
                  >
                    半自動
                  </Text>
                </TouchableOpacity>
              </View>
              <Text className="text-[11px] text-slate-500 mt-2">
                全自動：AI 直接回覆並建單；半自動：AI 建單但由你確認回覆。
              </Text>
            </View>
          </View>
        }
      >
        <ScrollView
          className="px-4 pt-2 pb-24"
          refreshControl={
            <RefreshControl
              refreshing={isUserRefreshing}
              onRefresh={async () => {
                setIsUserRefreshing(true);
                try {
                  if (inboxMode === "exception") {
                    await Promise.all([
                      refetchCollecting(),
                      refetchAwaiting(),
                      refetchManual(),
                    ]);
                  } else {
                    await refetchCompleted();
                  }
                } finally {
                  setIsUserRefreshing(false);
                }
              }}
              tintColor={brandTeal}
            />
          }
        >
          {inboxMode === "exception" ? (
            <>
              <View
                className="rounded-2xl border p-4 mb-3"
                style={{
                  backgroundColor: "rgba(13, 148, 136, 0.08)",
                  borderColor: "rgba(13, 148, 136, 0.25)",
                }}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={brandTeal}
                  />
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: brandTeal }}
                  >
                    有 {exceptions.length} 筆對話需要人工介入處理
                  </Text>
                </View>
                <Text className="text-xs mt-1 text-slate-600">
                  快速回覆或手動建單，確保流程不中斷
                </Text>
              </View>
              {isCollectingLoading || isAwaitingLoading || isManualLoading ? (
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
            <View className="gap-3">
              {isCompletedLoading ? (
                <View
                  className="rounded-2xl border p-4 items-center"
                  style={{
                    backgroundColor: "rgba(13, 148, 136, 0.08)",
                    borderColor: "rgba(13, 148, 136, 0.2)",
                  }}
                >
                  <ActivityIndicator color={brandTeal} />
                  <Text className="text-sm font-semibold text-brand-slate mt-2">
                    AI 建單同步中
                  </Text>
                  <Text className="text-xs text-slate-500 mt-1">
                    稍待數秒，對話會自動更新
                  </Text>
                </View>
              ) : autoRecords.length === 0 ? (
                <View className="rounded-2xl border border-slate-200 bg-white p-5 items-center">
                  <Ionicons
                    name="checkmark-done-outline"
                    size={22}
                    color={brandTeal}
                  />
                  <Text className="text-sm font-semibold text-slate-900 mt-2">
                    目前沒有已完成的對話
                  </Text>
                  <Text className="text-xs text-slate-500 mt-1 text-center">
                    AI 完成訂單會即時顯示在這裡
                  </Text>
                </View>
              ) : (
                <>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name="sparkles-outline"
                        size={18}
                        color={brandTeal}
                      />
                      <Text className="text-sm font-semibold text-slate-900">
                        AI 已建單列表
                      </Text>
                    </View>
                    <View
                      className="px-2 py-1 rounded-full border"
                      style={{
                        backgroundColor: "rgba(13, 148, 136, 0.12)",
                        borderColor: "rgba(13, 148, 136, 0.3)",
                      }}
                    >
                      <Text
                        className="text-[11px] font-semibold"
                        style={{ color: brandTeal }}
                      >
                        {autoRecords.length} 筆
                      </Text>
                    </View>
                  </View>
                  <View className="gap-3">
                    {autoRecords.map((record) => (
                      <AutoRecordCard key={record.id} record={record} />
                    ))}
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>

        <Modal
          visible={!!detailId}
          transparent
          animationType="slide"
          onRequestClose={() => setDetailId(null)}
        >
          <Pressable
            className="flex-1 bg-black/30"
            onPress={() => setDetailId(null)}
          />
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-slate-900">對話詳情</Text>
              <Pressable onPress={() => setDetailId(null)}>
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>
            </View>
            {conversationDetail.isLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator color={brandTeal} />
                <Text className="text-slate-500 mt-2">載入對話...</Text>
              </View>
            ) : conversationDetail.data ? (
              <ScrollView
                className="max-h-[60vh]"
                showsVerticalScrollIndicator={false}
              >
                <View className="mb-3">
                  <Text className="text-xs text-slate-500 mb-1">缺少欄位</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {(conversationDetail.data.conversation.missing_fields || [])
                      .map((f: string) => missingFieldLabels[f] || f)
                      .map((label: string) => (
                        <View
                          key={`${detailId}-${label}`}
                          className="px-2 py-1 rounded-full"
                          style={{ backgroundColor: "rgba(14,165,233,0.1)" }}
                        >
                          <Text className="text-[11px] font-semibold text-brand-slate">
                            待補：{label}
                          </Text>
                        </View>
                      ))}
                    {(!conversationDetail.data.conversation.missing_fields ||
                      conversationDetail.data.conversation.missing_fields
                        .length === 0) && (
                      <Text className="text-[11px] text-slate-500">無缺漏</Text>
                    )}
                  </View>
                </View>
                <View className="gap-3">
                  {conversationDetail.data.history.map((msg, idx) => (
                    <View
                      key={`${detailId}-${idx}`}
                      className="rounded-2xl border border-slate-100 p-3"
                      style={{
                        backgroundColor:
                          msg.role === "ai"
                            ? "rgba(14,165,233,0.05)"
                            : "#FFFFFF",
                      }}
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-xs font-semibold text-slate-500">
                          {msg.role === "ai" ? "AI" : "客人"}
                        </Text>
                        <Text className="text-[11px] text-slate-400">
                          {formatTime(msg.created_at)}
                        </Text>
                      </View>
                      <Text className="text-sm text-slate-800">
                        {msg.message}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="gap-3 mt-4 mb-6">
                  <Pressable
                    onPress={() => {
                      setFormConversationId(detailId);
                      setIsFormOpen(true);
                    }}
                    className="rounded-2xl"
                    style={{ backgroundColor: brandTeal }}
                  >
                    <View className="py-3 flex-row items-center justify-center gap-2">
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text className="text-white text-base font-semibold">
                        補齊資料 / 確認建單
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => setDetailId(null)}
                    className="rounded-2xl border border-slate-200"
                    disabled={confirmConversation.isPending}
                  >
                    <View className="py-3 flex-row items-center justify-center gap-2">
                      <Text className="text-slate-700 text-base font-semibold">
                        關閉
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
              <Text className="text-slate-500">沒有找到對話內容</Text>
            )}
          </View>
        </Modal>

        <Modal
          visible={isFormOpen}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setIsFormOpen(false);
            setFormConversationId(null);
          }}
        >
          <Pressable
            className="flex-1 bg-black/30"
            onPress={() => {
              setIsFormOpen(false);
              setFormConversationId(null);
            }}
          />
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-slate-900">補齊資料</Text>
              <Pressable
                onPress={() => {
                  setIsFormOpen(false);
                  setFormConversationId(null);
                }}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>
            </View>
            {formConversationDetail.isLoading ||
            !formConversationDetail.data ? (
              <View className="py-8 items-center">
                <ActivityIndicator color={brandTeal} />
                <Text className="text-slate-500 mt-2">載入資料...</Text>
              </View>
            ) : (
              <ScrollView
                className="max-h-[60vh]"
                showsVerticalScrollIndicator={false}
              >
                <ConversationConfirmForm
                  collectedData={
                    formConversationDetail.data.conversation.collected_data
                  }
                  isSubmitting={confirmConversation.isPending}
                  onSubmit={submitDetailForm}
                  onCancel={() => {
                    setIsFormOpen(false);
                    setFormConversationId(null);
                  }}
                />
              </ScrollView>
            )}
          </View>
        </Modal>
      </MainLayout>
    </View>
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
