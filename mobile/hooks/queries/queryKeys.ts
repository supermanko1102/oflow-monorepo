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
    all: () => ['teams'] as const,
    
    // 使用者的團隊列表
    list: () => [...queryKeys.teams.all(), 'list'] as const,
    
    // 單一團隊詳情
    detail: (teamId: string) => [...queryKeys.teams.all(), 'detail', teamId] as const,
    
    // 團隊成員列表
    members: (teamId: string) => [...queryKeys.teams.all(), 'members', teamId] as const,
    
    // 團隊邀請碼
    inviteCode: (teamId: string) => [...queryKeys.teams.all(), 'inviteCode', teamId] as const,
  },
  
  // Orders 相關 queries (預留，未來使用)
  orders: {
    all: () => ['orders'] as const,
    list: (filters?: any) => [...queryKeys.orders.all(), 'list', filters] as const,
    detail: (orderId: string) => [...queryKeys.orders.all(), 'detail', orderId] as const,
  },
  
  // Schedule 相關 queries (預留，未來使用)
  schedule: {
    all: () => ['schedule'] as const,
    weekly: (date: string) => [...queryKeys.schedule.all(), 'weekly', date] as const,
    monthly: (date: string) => [...queryKeys.schedule.all(), 'monthly', date] as const,
  },
} as const;

