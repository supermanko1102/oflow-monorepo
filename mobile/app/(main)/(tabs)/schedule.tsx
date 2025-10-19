import React from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { List, Divider, Button, Card } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useToast } from '@/hooks/useToast';
import { SHADOWS } from '@/constants/design';

/**
 * 排程頁面 - 接單模式 + 排班設定
 * 
 * 功能：
 * 1. 選擇接單模式（全自動/半自動）
 * 2. 設定排班小幫手（全自動模式必須設定）
 */
export default function ScheduleTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  
  const autoMode = useSettingsStore((state) => state.autoMode);
  const setAutoMode = useSettingsStore((state) => state.setAutoMode);
  const schedule = useScheduleStore((state) => state.schedule);

  const handleToggleAutoMode = (value: boolean) => {
    if (value && !schedule) {
      // 如果要開啟全自動但還沒設定排班，提示用戶
      toast.warning('請先設定排班時間');
      return;
    }
    setAutoMode(value);
    toast.success(value ? '已切換至全自動模式' : '已切換至半自動模式');
  };

  const getScheduleSummary = () => {
    if (!schedule) return '尚未設定';
    
    const openDays = Object.values(schedule.weeklySchedule).filter(
      day => day.isOpen
    ).length;
    
    const businessTypeText = schedule.businessType === 'pickup' ? '取貨制' : '預約制';
    return `${businessTypeText} · 每週營業 ${openDays} 天`;
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="pb-5 px-6 bg-white border-b border-gray-100"
        style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
      >
        <Text className="text-4xl font-black text-gray-900 mb-2">
          接單設定
        </Text>
        <Text className="text-base text-gray-600">
          選擇接單模式並設定可接單時間
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* 接單模式選擇 */}
        <View className="bg-white mt-4">
          <View className="px-4 pt-3 pb-2">
            <Text className="text-sm font-semibold text-gray-700">
              接單模式
            </Text>
          </View>

          {/* 全自動模式卡片 */}
          <View className="px-4 pb-4">
            <Card 
              className={`border-2 ${
                autoMode 
                  ? 'border-line-green bg-white' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              <Card.Content className="p-4">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <MaterialCommunityIcons
                        name="robot"
                        size={24}
                        color={autoMode ? '#00B900' : '#6B7280'}
                      />
                      <Text className={`text-lg font-bold ml-2 ${
                        autoMode ? 'text-line-green' : 'text-gray-900'
                      }`}>
                        全自動模式
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-600 mb-2">
                      AI 自動判斷可接單時間，直接回覆顧客並建立訂單
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={16}
                        color="#00B900"
                      />
                      <Text className="text-xs text-gray-500 ml-1">
                        需要先設定排班時間
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={autoMode}
                    onValueChange={handleToggleAutoMode}
                    trackColor={{ true: '#00B900' }}
                  />
                </View>

                {autoMode && !schedule && (
                  <View className="mt-3 p-3 bg-gray-100 rounded-lg border border-gray-200">
                    <Text className="text-sm text-gray-700">
                      請先設定排班時間才能啟用全自動模式
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          </View>

          {/* 半自動模式卡片 */}
          <View className="px-4 pb-4">
            <Card 
              className={`border-2 ${
                !autoMode 
                  ? 'border-line-green bg-white' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              <Card.Content className="p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <MaterialCommunityIcons
                        name="account-check"
                        size={24}
                        color={!autoMode ? '#00B900' : '#6B7280'}
                      />
                      <Text className={`text-lg font-bold ml-2 ${
                        !autoMode ? 'text-line-green' : 'text-gray-900'
                      }`}>
                        半自動模式
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-600 mb-2">
                      你手動確認後，AI 才會建立訂單
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <MaterialCommunityIcons
                        name="information"
                        size={16}
                        color="#6B7280"
                      />
                      <Text className="text-xs text-gray-500 ml-1">
                        排班設定為選填
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={!autoMode}
                    onValueChange={(value) => handleToggleAutoMode(!value)}
                    trackColor={{ true: '#00B900' }}
                  />
                </View>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* 排班設定 */}
        <View className="bg-white mt-4">
          <List.Section>
            <List.Subheader>排班小幫手</List.Subheader>
            
            <List.Item
              title="可接單時間"
              description={getScheduleSummary()}
              left={props => <List.Icon {...props} icon="calendar-clock" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push('/(main)/schedule')}
            />
            
            <Divider />
            
            <List.Item
              title="如何運作？"
              description="設定每週營業時間，AI 會在此時段內自動接單"
              left={props => <List.Icon {...props} icon="help-circle-outline" />}
            />
          </List.Section>
        </View>

        {/* 說明 */}
        <View className="mx-4 mt-4 mb-6 px-4">
          <Text className="text-sm text-gray-600 leading-5">
            建議剛開始使用「半自動模式」熟悉系統，穩定後再切換至「全自動模式」。排班設定後，系統只在營業時間內接單。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

