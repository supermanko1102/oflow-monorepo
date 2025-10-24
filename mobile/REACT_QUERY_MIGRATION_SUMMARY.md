# React Query 遷移總結報告

## ✅ 完成狀態

**遷移日期**: 2025-10-24  
**遷移範圍**: Phase 1 - Teams API  
**狀態**: 🎉 **完成**

---

## 📊 完成項目

### Phase 1: 環境設定與基礎建設 ✅

- [x] 安裝 `@tanstack/react-query` 和相關依賴
- [x] 建立 `lib/queryClient.ts` 並設定 QueryClient
- [x] 在 `app/_layout.tsx` 設定 QueryClientProvider
- [x] 設定 React Query DevTools（開發環境）
- [x] 建立 `hooks/queries/queryKeys.ts` 管理所有 query keys
- [x] 建立 `hooks/queries/` 資料夾結構

### Phase 2: Teams API 遷移 ✅

- [x] 建立 `hooks/queries/useTeams.ts`
  - ✅ `useTeams()` - 查詢團隊列表
  - ✅ `useTeamMembers()` - 查詢團隊成員
  - ✅ `useInviteCode()` - 查詢邀請碼
  - ✅ `useCreateTeam()` - 建立團隊 mutation
  - ✅ `useJoinTeam()` - 加入團隊 mutation
  - ✅ `useLeaveTeam()` - 離開團隊 mutation
  - ✅ `prefetchTeams()` - Prefetch helper

- [x] 重構 `stores/useTeamStore.ts`
  - ✅ 移除所有 server state (`teams`, `teamMembers`)
  - ✅ 移除所有 async 方法
  - ✅ 只保留 `currentTeamId` (client state)
  - ✅ 簡化為純 client state store

- [x] 遷移 Components
  - ✅ `app/(auth)/team-select.tsx`
  - ✅ `app/(auth)/team-create.tsx`
  - ✅ `app/(auth)/team-join.tsx`
  - ✅ `app/(auth)/login.tsx` (加入 prefetch)

### Phase 3: 測試與驗證 ✅

- [x] Linter 檢查：**0 errors**
- [x] TypeScript 類型檢查：**通過**
- [x] 架構一致性檢查：**通過**

### Phase 4: 文件 ✅

- [x] 建立 `REACT_QUERY_GUIDE.md` 使用指南
- [x] 建立 `REACT_QUERY_MIGRATION_SUMMARY.md` 總結報告

---

## 📁 檔案變更摘要

### 新增檔案（6 個）

```
mobile/
├── lib/
│   └── queryClient.ts                           [NEW] QueryClient 設定
├── hooks/
│   └── queries/
│       ├── queryKeys.ts                         [NEW] Query keys 管理
│       └── useTeams.ts                          [NEW] Teams hooks
├── components/
│   └── QueryDevTools.tsx                        [NEW] DevTools wrapper
├── REACT_QUERY_GUIDE.md                         [NEW] 使用指南
└── REACT_QUERY_MIGRATION_SUMMARY.md             [NEW] 本文件
```

### 修改檔案（6 個）

```
mobile/
├── app/
│   ├── _layout.tsx                              [MODIFIED] 加入 QueryClientProvider
│   └── (auth)/
│       ├── login.tsx                            [MODIFIED] 加入 prefetch
│       ├── team-select.tsx                      [MODIFIED] 使用 useTeams
│       ├── team-create.tsx                      [MODIFIED] 使用 useCreateTeam
│       └── team-join.tsx                        [MODIFIED] 使用 useJoinTeam
├── stores/
│   └── useTeamStore.ts                          [REFACTORED] 只保留 client state
└── package.json                                 [MODIFIED] 新增依賴
```

---

## 🎯 架構改進

### Before (純 Zustand)

```typescript
// ❌ 問題：手動管理 loading, error, cache
const teams = useTeamStore(state => state.teams);
const fetchTeams = useTeamStore(state => state.fetchTeams);

useEffect(() => {
  fetchTeams(); // 需要手動呼叫
}, []);

// 沒有自動 refetch、retry、cache 管理
```

### After (React Query + Zustand)

```typescript
// ✅ 改進：自動管理所有 server state
const { data: teams, isLoading, error, refetch } = useTeams();

// 自動：cache、refetch on focus、retry、background updates
```

---

## 📈 效能提升

| 項目 | Before | After | 改進 |
|-----|--------|-------|-----|
| **Cache 管理** | 手動 | 自動 | ✅ |
| **Background Refetch** | ❌ 無 | ✅ 有 | ✅ |
| **重複請求去重** | ❌ 無 | ✅ 有 | ✅ |
| **Loading State** | 手動管理 | 自動提供 | ✅ |
| **Error Handling** | 手動管理 | 統一處理 | ✅ |
| **Retry 機制** | ❌ 無 | ✅ 2 次 | ✅ |
| **Stale Time** | ❌ 無 | ✅ 5 分鐘 | ✅ |

---

## 🔧 技術決策

### Cache 策略

```typescript
{
  staleTime: 5 * 60 * 1000,      // 5 分鐘內視為新鮮
  gcTime: 10 * 60 * 1000,        // 10 分鐘後清除
  retry: 2,                       // 失敗重試 2 次
  refetchOnWindowFocus: true,     // App 回到前景時 refetch
  refetchOnReconnect: true,       // 重新連線時 refetch
}
```

### 職責劃分

**React Query（Server State）：**
- ✅ Teams data
- ✅ Team members
- ✅ Invite codes
- 🔜 Orders (Phase 2)
- 🔜 Schedule (Phase 3)

**Zustand（Client State）：**
- ✅ Auth tokens (accessToken, refreshToken)
- ✅ currentTeamId (使用者選擇)
- ✅ UI state (modals, tabs)
- ✅ User preferences

---

## ⚠️ 已知限制與未來改進

### 目前限制

1. **Settings 頁面未完全遷移**
   - 原因：包含許多未實作的 Edge Function endpoints
   - 計畫：待後端 API 完成後再遷移

2. **DevTools 在 React Native 中功能有限**
   - 建議：使用 Flipper plugin 或 Reactotron

3. **Offline Support 尚未實作**
   - 計畫：Phase 3 加入 `@tanstack/query-async-storage-persister`

### 未來改進 (Phase 2+)

- [ ] Orders API 遷移
- [ ] Schedule API 遷移
- [ ] Optimistic Updates 實作
- [ ] Offline Persistence
- [ ] Infinite Queries（分頁）
- [ ] Mutation Queue（離線 mutations）

---

## 📚 開發者指南

### 如何使用 React Query

**1. 查詢資料（GET）**
```typescript
import { useTeams } from '@/hooks/queries/useTeams';

const { data, isLoading, error, refetch } = useTeams();
```

**2. 建立/更新資料（POST/PUT）**
```typescript
import { useCreateTeam } from '@/hooks/queries/useTeams';

const createTeam = useCreateTeam();
await createTeam.mutateAsync({ team_name: "新團隊" });
```

**3. Invalidate Cache**
```typescript
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/hooks/queries/queryKeys';

queryClient.invalidateQueries({ 
  queryKey: queryKeys.teams.list() 
});
```

**完整文件**: 請參考 [`REACT_QUERY_GUIDE.md`](./REACT_QUERY_GUIDE.md)

---

## 🎓 學習資源

- [TanStack Query 官方文件](https://tanstack.com/query/latest/docs/react/overview)
- [Practical React Query by TkDodo](https://tkdodo.eu/blog/practical-react-query)
- [React Query Best Practices](https://tkdodo.eu/blog/react-query-best-practices)

---

## 🤝 團隊協作指南

### 新增 API Query 的步驟

1. **在 `queryKeys.ts` 新增 key**
   ```typescript
   orders: {
     all: () => ['orders'] as const,
     list: () => [...queryKeys.orders.all(), 'list'] as const,
   }
   ```

2. **在 `services/` 建立 API service**
   ```typescript
   export async function getOrders() {
     // API call
   }
   ```

3. **建立 custom hook**
   ```typescript
   export function useOrders() {
     return useQuery({
       queryKey: queryKeys.orders.list(),
       queryFn: getOrders,
     });
   }
   ```

4. **在 component 中使用**
   ```typescript
   const { data: orders } = useOrders();
   ```

---

## ✨ 總結

### 成功指標

- ✅ **0 linter errors**
- ✅ **100% TypeScript type safety**
- ✅ **所有 Teams API 已遷移**
- ✅ **向後相容（currentTeamId 保留在兩個 stores）**
- ✅ **完整文件與使用指南**

### 架構優勢

1. **🚀 效能提升**：自動 cache、去重、背景更新
2. **🎯 開發體驗**：統一 loading/error 處理
3. **🔧 可維護性**：清晰的 server/client state 分離
4. **📈 可擴展性**：易於新增其他 API queries
5. **🧪 可測試性**：Query 邏輯與 UI 分離

### 下一步

這次遷移為整個專案建立了堅實的基礎。接下來可以：

1. **Phase 2**: 遷移 Orders API
2. **Phase 3**: 遷移 Schedule API
3. **Phase 4**: 加入 Offline Support
4. **Phase 5**: Optimistic Updates

---

**遷移完成日期**: 2025-10-24  
**負責人**: AI Technical Coach  
**審查狀態**: ✅ Ready for Review

