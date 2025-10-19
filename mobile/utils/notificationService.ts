import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// 檢查是否在 Expo Go 環境
// 在 Expo Go 中，Android 推送通知功能受限（從 SDK 53 開始）
const isExpoGo = Constants.appOwnership === 'expo';

// 設定通知處理方式
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NOTIFICATION_TIME_KEY = '@notification_time';
const DEFAULT_NOTIFICATION_HOUR = 8; // 早上 8:00

export interface NotificationSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

/**
 * 請求通知權限
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    // 在 Expo Go 環境中提供警告訊息
    if (isExpoGo && Platform.OS === 'android') {
      console.warn(
        '[Expo Go 限制] Android 推送通知功能在 Expo Go 中受限。' +
        '本地通知仍可正常運作，但遠端推送需要使用 development build。'
      );
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('通知權限被拒絕');
      return false;
    }

    // Android 需要設定通知頻道
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00B900',
      });
    }

    return true;
  } catch (error) {
    console.error('請求通知權限失敗:', error);
    
    // 在 Expo Go 環境提供更友善的錯誤訊息
    if (isExpoGo && Platform.OS === 'android') {
      console.error(
        '這可能是因為在 Expo Go 中執行。請使用 development build 以獲得完整的通知功能。'
      );
    }
    
    return false;
  }
}

/**
 * 取得通知設定
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_TIME_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('讀取通知設定失敗:', error);
  }

  // 預設值
  return {
    enabled: true,
    hour: DEFAULT_NOTIFICATION_HOUR,
    minute: 0,
  };
}

/**
 * 儲存通知設定
 */
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_TIME_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('儲存通知設定失敗:', error);
  }
}

/**
 * 排程每日晨報通知
 * 
 * 注意：本功能使用本地通知（Local Notifications），
 * 在 Expo Go 和 development build 中都能正常運作
 */
export async function scheduleDailyBriefing(
  orderCount: number,
  totalRevenue: number,
  firstPickupTime?: string
): Promise<string | null> {
  try {
    const settings = await getNotificationSettings();

    if (!settings.enabled) {
      console.log('通知已停用');
      return null;
    }

    // 取消舊的通知
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 如果今天沒有訂單，不發送通知
    if (orderCount === 0) {
      console.log('今天沒有訂單，跳過通知');
      return null;
    }

    // 組合通知內容
    let body = `總營收 $${totalRevenue.toLocaleString()}`;
    if (firstPickupTime) {
      body += `，首筆 ${firstPickupTime} 取貨`;
    }

    // 排程每日重複通知（本地通知）
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `早安！今天有 ${orderCount} 筆訂單`,
        body: body,
        sound: true,
        data: { 
          screen: 'today',
          type: 'daily_brief',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: settings.hour,
        minute: settings.minute,
        repeats: true,
      },
    });

    console.log('已排程每日晨報通知:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('排程每日晨報失敗:', error);
    
    if (isExpoGo && Platform.OS === 'android') {
      console.error(
        '注意：雖然在 Expo Go 中 Android 推送通知受限，' +
        '但本地排程通知應該仍可正常運作。如持續失敗，請使用 development build。'
      );
    }
    
    return null;
  }
}

/**
 * 發送測試通知（立即發送）
 */
export async function sendTestNotification(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '測試通知',
        body: '通知系統運作正常',
        sound: true,
        data: { type: 'test' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
      },
    });
  } catch (error) {
    console.error('發送測試通知失敗:', error);
  }
}

/**
 * 取消所有已排程的通知
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('已取消所有通知');
  } catch (error) {
    console.error('取消通知失敗:', error);
  }
}

/**
 * 取得所有已排程的通知
 */
export async function getScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('已排程的通知:', notifications);
    return notifications;
  } catch (error) {
    console.error('取得已排程通知失敗:', error);
    return [];
  }
}

/**
 * 設定通知點擊處理
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * 設定前景通知接收處理
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler);
}

