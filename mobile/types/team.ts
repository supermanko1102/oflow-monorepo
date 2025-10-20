export type TeamRole = "owner" | "admin" | "member";

export interface Team {
  id: string;
  name: string;
  lineOfficialAccountId: string | null;
  createdAt: string;
  inviteCode: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  userName: string;
  userPictureUrl: string | null;
  teamId: string;
  role: TeamRole;
  joinedAt: string;
}

// 用戶視角的團隊資料（包含該用戶在團隊中的角色）
export interface UserTeam extends Team {
  myRole: TeamRole;
  memberCount: number;
}
