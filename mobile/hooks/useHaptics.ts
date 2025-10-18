/**
 * Haptic Feedback Hook
 * 提供觸覺回饋功能
 */

import * as Haptics from 'expo-haptics';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export function useHaptics() {
  /**
   * 觸發震動回饋
   * @param type - 震動類型
   */
  const trigger = async (type: HapticType = 'light') => {
    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch (error) {
      // Haptics 可能在某些設備上不支援，靜默處理錯誤
      console.debug('Haptics not supported:', error);
    }
  };

  /**
   * 選擇震動 (用於選擇項目時)
   */
  const selection = async () => {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.debug('Haptics not supported:', error);
    }
  };

  return {
    trigger,
    selection,
    // 便捷方法
    light: () => trigger('light'),
    medium: () => trigger('medium'),
    heavy: () => trigger('heavy'),
    success: () => trigger('success'),
    warning: () => trigger('warning'),
    error: () => trigger('error'),
  };
}

