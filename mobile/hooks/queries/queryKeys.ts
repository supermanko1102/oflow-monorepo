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
  auth: {
    user: () => ["auth", "user"] as const,
  },
  dashboard: {
    // 所有 dashboard 相關的 queries
    all: () => ["dashboard"] as const,

    // Dashboard 摘要（今日 + 未來訂單）
    summary: (teamId: string) =>
      [...queryKeys.dashboard.all(), "summary", teamId] as const,

    // 營收統計（支援不同時間範圍）
    revenueStats: (teamId: string, timeRange: string) =>
      [
        ...queryKeys.dashboard.all(),
        "revenueStats",
        teamId,
        timeRange,
      ] as const,

    // 動態時間軸分頁
    activity: (teamId: string) =>
      [...queryKeys.dashboard.all(), "activity", teamId] as const,
  },

  // Products 相關 queries
  products: {
    // 所有 products 相關的 queries
    all: () => ["products"] as const,

    // 團隊商品列表
    list: (teamId: string) =>
      [...queryKeys.products.all(), "list", teamId] as const,

    // 單一商品詳情
    detail: (productId: string) =>
      [...queryKeys.products.all(), "detail", productId] as const,

    // 團隊商品分類列表
    categories: (teamId: string) =>
      [...queryKeys.products.all(), "categories", teamId] as const,
  },

  // Delivery Settings 相關 queries
  deliverySettings: {
    // 所有 delivery settings 相關的 queries
    all: () => ["delivery-settings"] as const,

    // 團隊配送設定
    detail: (teamId: string) =>
      [...queryKeys.deliverySettings.all(), "detail", teamId] as const,
  },

  // Customers 相關 queries
  customers: {
    // 所有 customers 相關的 queries
    all: () => ["customers"] as const,

    // 團隊顧客列表（支援篩選）
    list: (teamId: string, filters?: any) =>
      [...queryKeys.customers.all(), "list", teamId, filters] as const,

    // 單一顧客詳情
    detail: (customerId: string) =>
      [...queryKeys.customers.all(), "detail", customerId] as const,
  },

  // Conversations 相關 queries
  conversations: {
    // 所有 conversations 相關的 queries
    all: () => ["conversations"] as const,

    // 團隊對話列表（支援狀態篩選）
    list: (teamId: string, status?: string) =>
      [...queryKeys.conversations.all(), "list", teamId, status] as const,

    // 單一對話詳情
    detail: (conversationId: string) =>
      [...queryKeys.conversations.all(), "detail", conversationId] as const,
  },
} as const;
