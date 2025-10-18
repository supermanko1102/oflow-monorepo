import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  isLoggedIn: boolean;
  merchantName: string;
  _hasHydrated: boolean;
  login: () => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      merchantName: '甜點小舖',
      _hasHydrated: false,
      login: () => set({ isLoggedIn: true }),
      logout: () => set({ isLoggedIn: false }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // 當從 AsyncStorage 讀取完成後，標記為已 hydrated
        state?.setHasHydrated(true);
      },
      // 只持久化必要的欄位，不持久化 _hasHydrated
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        merchantName: state.merchantName,
      }),
    }
  )
);

