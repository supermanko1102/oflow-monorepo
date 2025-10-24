# React Query 使用指南

## 📚 目錄

1. [架構概述](#架構概述)
2. [核心概念](#核心概念)
3. [使用範例](#使用範例)
4. [最佳實踐](#最佳實踐)
5. [疑難排解](#疑難排解)
6. [遷移指南](#遷移指南)

---

## 架構概述

### 職責劃分

本專案採用 **React Query + Zustand 混合架構**：

```
┌─────────────────────────────────────┐
│   Components                         │
├─────────────────────────────────────┤
│   React Query (Server State)        │
│   - Teams, Orders, Members           │
│   - 自動 caching & refetching        │
├─────────────────────────────────────┤
│   Zustand (Client State)            │
│   - Auth tokens                      │
│   - currentTeamId                    │
│   - UI state                         │
├─────────────────────────────────────┤
│   Services (API Layer)               │
│   - teamService                      │
│   - orderService (future)            │
├─────────────────────────────────────┤
│   Edge Functions (Supabase)         │
└─────────────────────────────────────┘
```

### 何時使用 React Query？

**✅ 使用 React Query：**
- 從 API 取得的資料（teams, orders, members）
- 需要 cache 的資料
- 需要背景自動 refetch
- 需要 optimistic updates
- 需要統一 loading/error 處理

**❌ 使用 Zustand：**
- 純前端狀態（modal open/close）
- 需要持久化的資料（auth tokens, user preferences）
- 當前選擇的 ID（currentTeamId）
- 不需要同步到後端的資料

---

## 核心概念

### 1. Query Keys

Query keys 是 React Query 的核心，用於識別和管理 cache。

```typescript
// ❌ 錯誤：硬編碼 key
useQuery({ queryKey: ['teams'], ... })

// ✅ 正確：使用 queryKeys factory
import { queryKeys } from '@/hooks/queries/queryKeys';

useQuery({ queryKey: queryKeys.teams.list(), ... })
```

**Query Keys 階層結構：**

```typescript
queryKeys.teams.all()              → ['teams']
queryKeys.teams.list()             → ['teams', 'list']
queryKeys.teams.members(id)        → ['teams', 'members', id]
queryKeys.teams.inviteCode(id)     → ['teams', 'inviteCode', id]
```

### 2. Cache 策略

**staleTime vs gcTime：**

```typescript
{
  staleTime: 5 * 60 * 1000,  // 5 分鐘內視為「新鮮」，不會 refetch
  gcTime: 10 * 60 * 1000,     // 10 分鐘後清除未使用的 cache
}
```

**預設設定（在 `lib/queryClient.ts`）：**
- `staleTime`: 5 分鐘
- `gcTime`: 10 分鐘
- `retry`: 2 次
- `refetchOnWindowFocus`: true
- `refetchOnReconnect`: true

### 3. Queries vs Mutations

**Query（GET 操作）：**
```typescript
const { data, isLoading, error } = useTeams();
```

**Mutation（POST/PUT/DELETE 操作）：**
```typescript
const createTeam = useCreateTeam();

await createTeam.mutateAsync({ team_name: "新團隊" });
```

---

## 使用範例

### 範例 1: 查詢團隊列表

```typescript
import { useTeams } from '@/hooks/queries/useTeams';

function TeamList() {
  const { data: teams, isLoading, error, refetch } = useTeams();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState 
        message={error.message} 
        onRetry={refetch}
      />
    );
  }

  return (
    <FlatList
      data={teams}
      renderItem={({ item }) => <TeamCard team={item} />}
    />
  );
}
```

### 範例 2: 建立團隊（Mutation）

```typescript
import { useCreateTeam } from '@/hooks/queries/useTeams';
import { useToast } from '@/hooks/useToast';

function CreateTeamForm() {
  const toast = useToast();
  const createTeam = useCreateTeam();
  const [teamName, setTeamName] = useState('');

  const handleSubmit = async () => {
    try {
      const newTeam = await createTeam.mutateAsync({
        team_name: teamName,
      });
      
      toast.success('團隊建立成功！');
      console.log('新團隊 ID:', newTeam.id);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <View>
      <TextInput value={teamName} onChangeText={setTeamName} />
      <Button 
        onPress={handleSubmit}
        disabled={createTeam.isPending}
      >
        {createTeam.isPending ? '建立中...' : '建立團隊'}
      </Button>
    </View>
  );
}
```

### 範例 3: 條件查詢（enabled）

```typescript
import { useTeamMembers } from '@/hooks/queries/useTeams';

function MemberList({ teamId }: { teamId: string | null }) {
  // 只在 teamId 存在時查詢
  const { data: members } = useTeamMembers(
    teamId || '',
    !!teamId  // enabled
  );

  if (!teamId) {
    return <Text>請先選擇團隊</Text>;
  }

  return <MemberListView members={members || []} />;
}
```

### 範例 4: Prefetch 資料

```typescript
import { prefetchTeams } from '@/hooks/queries/useTeams';
import { queryClient } from '@/lib/queryClient';

async function handleLogin() {
  // 登入後預先載入團隊資料
  await prefetchTeams(queryClient);
  
  router.push('/dashboard');
}
```

### 範例 5: 手動 Invalidate Cache

```typescript
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/hooks/queries/queryKeys';

function handleTeamUpdate() {
  // 強制重新載入團隊列表
  queryClient.invalidateQueries({
    queryKey: queryKeys.teams.list(),
  });

  // 清除特定團隊的 cache
  queryClient.removeQueries({
    queryKey: queryKeys.teams.members(teamId),
  });
}
```

---

## 最佳實踐

### ✅ DO

1. **統一使用 queryKeys factory**
   ```typescript
   useQuery({ queryKey: queryKeys.teams.list(), ... })
   ```

2. **處理 loading 和 error states**
   ```typescript
   if (isLoading) return <Loading />;
   if (error) return <Error message={error.message} />;
   ```

3. **使用 TypeScript 類型**
   ```typescript
   const { data: teams } = useTeams(); // teams 已有正確型別
   ```

4. **Mutation 成功後 invalidate 相關 cache**
   ```typescript
   useMutation({
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: queryKeys.teams.list() });
     },
   });
   ```

5. **使用 enabled 控制查詢時機**
   ```typescript
   useQuery({ 
     enabled: !!userId && isLoggedIn,
     ... 
   });
   ```

### ❌ DON'T

1. **不要在 Zustand store 中儲存 server state**
   ```typescript
   // ❌ 錯誤
   const teams = useTeamStore(state => state.teams);
   
   // ✅ 正確
   const { data: teams } = useTeams();
   ```

2. **不要忘記處理 undefined**
   ```typescript
   // ❌ 錯誤
   const { data: teams } = useTeams();
   teams.map(...); // 可能是 undefined！
   
   // ✅ 正確
   teams?.map(...) // 或使用 if (teams)
   ```

3. **不要在迴圈中使用 hooks**
   ```typescript
   // ❌ 錯誤
   teams.map(team => {
     const { data } = useTeamMembers(team.id); // 違反 React hooks 規則
   });
   ```

4. **不要重複定義相同的 query**
   ```typescript
   // ❌ 錯誤：在多處重複定義
   useQuery({ queryKey: ['teams'], queryFn: fetchTeams });
   
   // ✅ 正確：建立 custom hook
   export function useTeams() { ... }
   ```

---

## 疑難排解

### Q: 為什麼我的資料沒有更新？

**A:** 檢查以下幾點：
1. 確認 `staleTime` 是否太長（預設 5 分鐘）
2. Mutation 後是否有 invalidate cache
3. 檢查 query key 是否正確

```typescript
// Mutation 後 invalidate
useMutation({
  onSuccess: () => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.teams.list() 
    });
  },
});
```

### Q: 如何強制重新載入資料？

**A:** 使用 `refetch()` 或 `invalidateQueries()`：

```typescript
// 方法 1: 使用 refetch
const { refetch } = useTeams();
await refetch();

// 方法 2: 使用 invalidateQueries
queryClient.invalidateQueries({ 
  queryKey: queryKeys.teams.list() 
});
```

### Q: 如何實作下拉刷新？

**A:** 使用 `RefreshControl` + `refetch`：

```typescript
const { refetch, isRefetching } = useTeams();

<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={isRefetching}
      onRefresh={refetch}
    />
  }
>
  {/* content */}
</ScrollView>
```

### Q: 資料載入太慢怎麼辦？

**A:** 考慮以下優化：

1. **Prefetch 資料**
   ```typescript
   await queryClient.prefetchQuery({
     queryKey: queryKeys.teams.list(),
     queryFn: fetchTeams,
   });
   ```

2. **調整 staleTime**
   ```typescript
   useQuery({
     staleTime: 10 * 60 * 1000, // 延長到 10 分鐘
   });
   ```

3. **使用 placeholderData**
   ```typescript
   useQuery({
     placeholderData: [], // 顯示空陣列而非 loading
   });
   ```

---

## 遷移指南

### 從 Zustand 遷移到 React Query

**步驟 1: 識別 server state**
```typescript
// ❌ 舊架構：在 Zustand 儲存 API 資料
const teams = useTeamStore(state => state.teams);
const fetchTeams = useTeamStore(state => state.fetchTeams);

useEffect(() => {
  fetchTeams();
}, []);
```

**步驟 2: 改用 React Query**
```typescript
// ✅ 新架構：使用 React Query
const { data: teams } = useTeams(); // 自動載入、cache、refetch
```

**步驟 3: 更新 Zustand store**
```typescript
// 移除 server state
interface TeamState {
  // ❌ 移除
  // teams: Team[];
  // fetchTeams: () => Promise<void>;
  
  // ✅ 保留 client state
  currentTeamId: string | null;
  setCurrentTeamId: (id: string | null) => void;
}
```

### 常見遷移模式

| 舊模式 (Zustand) | 新模式 (React Query) |
|-----------------|---------------------|
| `const teams = useStore(s => s.teams)` | `const { data: teams } = useTeams()` |
| `await fetchTeams()` | 自動載入，或使用 `refetch()` |
| `createTeam(name)` | `await createTeam.mutateAsync({ name })` |
| `store.setTeams([])` | `queryClient.setQueryData(...)` |

---

## 參考資源

- [TanStack Query 官方文件](https://tanstack.com/query/latest/docs/react/overview)
- [Practical React Query](https://tkdodo.eu/blog/practical-react-query)
- [React Query Best Practices](https://tkdodo.eu/blog/react-query-best-practices)

---

## 版本資訊

- **React Query 版本**: `@tanstack/react-query` (最新版)
- **遷移日期**: 2025-10-24
- **遷移範圍**: Teams API (Phase 1)
- **後續計畫**: Orders API, Schedule API

