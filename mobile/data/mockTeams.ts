import { Team, TeamMember, UserTeam } from "@/types/team";

// 模擬當前登入用戶
export const MOCK_CURRENT_USER_ID = "user_001";

// 團隊資料
export const mockTeams: Team[] = [
  {
    id: "team_001",
    name: "甜點小舖",
    lineOfficialAccountId: "@sweetshop",
    createdAt: "2024-01-15T10:00:00.000Z",
    inviteCode: "123456",
  },
  {
    id: "team_002",
    name: "手工蛋糕工作室",
    lineOfficialAccountId: "@cakestudio",
    createdAt: "2024-03-20T14:30:00.000Z",
    inviteCode: "789012",
  },
];

// 團隊成員資料
export const mockTeamMembers: TeamMember[] = [
  // 甜點小舖成員
  {
    id: "member_001",
    userId: "user_001",
    userName: "王小明",
    userPictureUrl: null,
    teamId: "team_001",
    role: "owner",
    joinedAt: "2024-01-15T10:00:00.000Z",
  },
  {
    id: "member_002",
    userId: "user_002",
    userName: "李美玲",
    userPictureUrl: null,
    teamId: "team_001",
    role: "admin",
    joinedAt: "2024-01-20T11:00:00.000Z",
  },
  {
    id: "member_003",
    userId: "user_003",
    userName: "陳大華",
    userPictureUrl: null,
    teamId: "team_001",
    role: "member",
    joinedAt: "2024-02-10T09:00:00.000Z",
  },
  // 手工蛋糕工作室成員
  {
    id: "member_004",
    userId: "user_001",
    userName: "王小明",
    userPictureUrl: null,
    teamId: "team_002",
    role: "admin",
    joinedAt: "2024-03-20T14:30:00.000Z",
  },
  {
    id: "member_005",
    userId: "user_004",
    userName: "林志玲",
    userPictureUrl: null,
    teamId: "team_002",
    role: "owner",
    joinedAt: "2024-03-20T14:30:00.000Z",
  },
];

// 輔助函數：根據用戶 ID 取得其所屬團隊
export function getUserTeams(userId: string): UserTeam[] {
  const userMemberships = mockTeamMembers.filter((m) => m.userId === userId);

  return userMemberships.map((membership) => {
    const team = mockTeams.find((t) => t.id === membership.teamId)!;
    const memberCount = mockTeamMembers.filter(
      (m) => m.teamId === team.id
    ).length;

    return {
      ...team,
      myRole: membership.role,
      memberCount,
    };
  });
}

// 輔助函數：根據團隊 ID 取得團隊成員
export function getTeamMembers(teamId: string): TeamMember[] {
  return mockTeamMembers.filter((m) => m.teamId === teamId);
}

// 輔助函數：根據團隊 ID 取得團隊資料
export function getTeamById(teamId: string): Team | undefined {
  return mockTeams.find((t) => t.id === teamId);
}

// 輔助函數：根據邀請碼查找團隊
export function getTeamByInviteCode(inviteCode: string): Team | undefined {
  return mockTeams.find((t) => t.inviteCode === inviteCode);
}

// 輔助函數：生成隨機邀請碼
export function generateInviteCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
