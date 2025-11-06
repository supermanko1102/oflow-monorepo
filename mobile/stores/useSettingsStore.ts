import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  // autoMode 已移至 Server State (teams.auto_mode)，請使用 useTeams() 查詢
  notificationsEnabled: boolean;
  reminderToday: boolean;
  reminder3Days: boolean;
  reminder7Days: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  setReminderToday: (value: boolean) => void;
  setReminder3Days: (value: boolean) => void;
  setReminder7Days: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notificationsEnabled: true,
      reminderToday: true,
      reminder3Days: true,
      reminder7Days: true,
      setNotificationsEnabled: (value) => set({ notificationsEnabled: value }),
      setReminderToday: (value) => set({ reminderToday: value }),
      setReminder3Days: (value) => set({ reminder3Days: value }),
      setReminder7Days: (value) => set({ reminder7Days: value }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

