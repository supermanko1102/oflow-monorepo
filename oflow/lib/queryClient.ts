import { QueryClient } from '@tanstack/react-query';

/**
 * React Query 全域設定
 * 
 * Cache 策略：
 * - staleTime: 資料多久後視為過期（會觸發背景 refetch）
 * - gcTime: 未使用的 cache 多久後被清除（原 cacheTime）
 * - retry: 失敗後重試次數
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 分鐘內的資料視為新鮮，不會重新請求
      staleTime: 5 * 60 * 1000,
      
      // 未使用的 cache 保留 10 分鐘
      gcTime: 10 * 60 * 1000,
      
      // 失敗後重試 2 次
      retry: 2,
      
      // 重試延遲（指數退避）
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // App 回到前景時重新驗證資料
      refetchOnWindowFocus: true,
      
      // 網路重新連線時重新驗證
      refetchOnReconnect: true,
      
      // Mount 時不自動 refetch（避免不必要的請求）
      refetchOnMount: false,
    },
    mutations: {
      // Mutation 失敗後重試 1 次
      retry: 1,
    },
  },
});

