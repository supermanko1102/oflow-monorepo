/**
 * React Query Keys 管理
 *
 * 使用 factory pattern 管理所有 query keys
 * 好處：
 * 1. 集中管理，避免 key 重複或拼錯
 * 2. 方便做 cache invalidation
 * 3. 支援 hierarchical invalidation
 *
 * 範例：
 * - queryKeys.teams.all() → ['teams']
 * - queryKeys.teams.list() → ['teams', 'list']
 * - queryKeys.teams.detail(id) → ['teams', 'detail', id]
 * - queryKeys.teams.members(id) → ['teams', 'members', id]
 */

export const queryKeys = {
  // Teams 相關 queries
  teams: {
    // 所有 teams 相關的 queries
    all: () => ["teams"] as const,

    // 使用者的團隊列表
    list: () => [...queryKeys.teams.all(), "list"] as const,

    // 單一團隊詳情
    detail: (teamId: string) =>
      [...queryKeys.teams.all(), "detail", teamId] as const,

    // 團隊成員列表
    members: (teamId: string) =>
      [...queryKeys.teams.all(), "members", teamId] as const,

    // 團隊邀請碼
    inviteCode: (teamId: string) =>
      [...queryKeys.teams.all(), "inviteCode", teamId] as const,
  },

  // Orders 相關 queries
  orders: {
    // 所有 orders 相關的 queries
    all: () => ["orders"] as const,

    // 團隊訂單列表（支援篩選）
    list: (teamId: string, filters?: any) =>
      [...queryKeys.orders.all(), "list", teamId, filters] as const,

    // 單一訂單詳情
    detail: (orderId: string) =>
      [...queryKeys.orders.all(), "detail", orderId] as const,
  },

  // Dashboard 相關 queries
  dashboard: {
    // 所有 dashboard 相關的 queries
    all: () => ["dashboard"] as const,

    // Dashboard 摘要（今日 + 未來訂單）
    summary: (teamId: string) =>
      [...queryKeys.dashboard.all(), "summary", teamId] as const,
  },

  // Schedule 相關 queries (預留，未來使用)
  schedule: {
    all: () => ["schedule"] as const,
    weekly: (date: string) =>
      [...queryKeys.schedule.all(), "weekly", date] as const,
    monthly: (date: string) =>
      [...queryKeys.schedule.all(), "monthly", date] as const,
  },
} as const;
