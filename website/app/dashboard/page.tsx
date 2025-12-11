"use client";

import type React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { getAllTeams, getInviteCode } from "@/services/teamService";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { TeamRow } from "@/lib/types";
import { useMemo } from "react";

function DashboardPage() {
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      return data.session;
    },
  });

  const teamsQuery = useQuery({
    queryKey: ["admin-teams"],
    queryFn: getAllTeams,
    enabled: !!sessionQuery.data,
  });

  const teams = teamsQuery.data ?? [];
  const teamIds = useMemo(
    () => teams.map((t) => t.team_id).sort(),
    [teams]
  );

  const invitesQuery = useQuery({
    queryKey: ["admin-team-invites", teamIds],
    enabled: !!sessionQuery.data && teamIds.length > 0,
    queryFn: async () => {
      const codes: Record<string, string> = {};
      const errors: Record<string, string> = {};

      await Promise.all(
        teamIds.map(async (teamId) => {
          try {
            const code = await getInviteCode(teamId);
            codes[teamId] = code;
          } catch (error) {
            console.error("Fetch invite code failed", error);
            const statusCode =
              typeof error === "object" && error && "statusCode" in error
                ? (error as { statusCode?: number }).statusCode
                : undefined;
            errors[teamId] =
              statusCode === 401 || statusCode === 403
                ? "無權限"
                : "取得失敗";
          }
        })
      );

      return { codes, errors };
    },
  });

  const sessionError =
    sessionQuery.isError &&
    (sessionQuery.error instanceof Error
      ? sessionQuery.error.message
      : "無法取得登入資訊，請重新登入");

  const teamsError =
    teamsQuery.isError &&
    (teamsQuery.error instanceof Error
      ? teamsQuery.error.message
      : "載入團隊失敗");

  if (sessionQuery.isPending || teamsQuery.isPending) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-sm text-muted-foreground">
        載入中...
      </div>
    );
  }

  if (sessionError) {
    toast.error(sessionError);
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-sm text-muted-foreground">
        無法取得登入資訊：{sessionError}
      </div>
    );
  }

  if (teamsError) {
    toast.error(teamsError);
  }

  const user = sessionQuery.data?.user;
  const userName = user?.user_metadata?.name ?? user?.email ?? "客服成員";
  const userEmail = user?.email ?? "";
  const avatar = user?.user_metadata?.avatar_url as string | undefined;

  const inviteCodes = invitesQuery.data?.codes ?? {};
  const inviteErrors = invitesQuery.data?.errors ?? {};
  const isLoadingInvites = invitesQuery.isLoading;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        user={{ name: userName, email: userEmail, avatar }}
      />
      <SidebarInset>
        <SiteHeader title="客服控制台" subtitle="後台全域團隊列表" />
        <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>所有團隊</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名稱</TableHead>
                    <TableHead>LINE Channel</TableHead>
                    <TableHead>訂閱</TableHead>
                    <TableHead>成員</TableHead>
                    <TableHead>訂單</TableHead>
                    <TableHead>邀請碼</TableHead>
                    <TableHead>建立時間</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-sm text-muted-foreground"
                      >
                        尚無資料，請確認 admin_users 或資料庫內容。
                      </TableCell>
                    </TableRow>
                  ) : (
                    teams.map((team: TeamRow) => (
                      <TableRow key={team.team_id}>
                        <TableCell>
                          <div className="font-medium">{team.team_name}</div>
                          <div className="text-xs text-muted-foreground">
                            slug: {team.team_slug}
                          </div>
                        </TableCell>
                        <TableCell>
                          {team.line_channel_id ? (
                            <div className="text-sm">
                              {team.line_channel_name || "已綁定"}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              未綁定
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {team.subscription_status || "trial"}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {team.member_count}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {team.order_count}
                        </TableCell>
                        <TableCell>
                          {inviteCodes[team.team_id] ? (
                            <span className="font-mono text-xs">
                              {inviteCodes[team.team_id]}
                            </span>
                          ) : inviteErrors[team.team_id] ? (
                            <span className="text-xs text-rose-500">
                              {inviteErrors[team.team_id]}
                            </span>
                          ) : isLoadingInvites ? (
                            <span className="text-xs text-muted-foreground">
                              載入中...
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {team.created_at
                            ? new Date(team.created_at).toLocaleString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default DashboardPage;
