import { TeamMember, TeamRole } from "@/types/team";
import React from "react";
import { Alert, Text, View } from "react-native";
import { Divider, List, Menu } from "react-native-paper";

interface MemberListProps {
  members: TeamMember[];
  currentUserId: string;
  currentUserRole: TeamRole;
  onUpdateRole?: (userId: string, newRole: TeamRole) => void;
  onRemoveMember?: (userId: string) => void;
}

export function MemberList({
  members,
  currentUserId,
  currentUserRole,
  onUpdateRole,
  onRemoveMember,
}: MemberListProps) {
  const [menuVisible, setMenuVisible] = React.useState<string | null>(null);

  const getRoleText = (role: TeamRole) => {
    switch (role) {
      case "owner":
        return "擁有者";
      case "admin":
        return "管理員";
      case "member":
        return "成員";
    }
  };

  const getRoleBadgeColor = (role: TeamRole) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-700";
      case "admin":
        return "bg-blue-100 text-blue-700";
      case "member":
        return "bg-gray-100 text-gray-700";
    }
  };

  const canManageMember = (member: TeamMember) => {
    // 只有 owner 可以管理其他成員
    // owner 不能管理自己
    return (
      currentUserRole === "owner" &&
      member.userId !== currentUserId &&
      member.role !== "owner"
    );
  };

  const handleRoleChange = (
    userId: string,
    userName: string,
    newRole: TeamRole
  ) => {
    Alert.alert(
      "變更角色",
      `確定要將 ${userName} 的角色變更為「${getRoleText(newRole)}」嗎？`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "確定",
          onPress: () => {
            onUpdateRole?.(userId, newRole);
            setMenuVisible(null);
          },
        },
      ]
    );
  };

  const handleRemove = (userId: string, userName: string) => {
    Alert.alert("移除成員", `確定要將 ${userName} 移除出團隊嗎？`, [
      { text: "取消", style: "cancel" },
      {
        text: "移除",
        style: "destructive",
        onPress: () => {
          onRemoveMember?.(userId);
          setMenuVisible(null);
        },
      },
    ]);
  };

  return (
    <View>
      {members.map((member, index) => (
        <React.Fragment key={member.id}>
          <List.Item
            title={member.userName}
            description={member.userId === currentUserId ? "（你）" : undefined}
            left={(props) => (
              <View className="justify-center items-center w-10 h-10 bg-gray-200 rounded-full ml-2">
                <Text className="text-lg font-semibold text-gray-600">
                  {member.userName.charAt(0)}
                </Text>
              </View>
            )}
            right={() => (
              <View className="flex-row items-center">
                <View
                  className={`px-2 py-1 rounded ${getRoleBadgeColor(
                    member.role
                  )}`}
                >
                  <Text className="text-xs font-medium">
                    {getRoleText(member.role)}
                  </Text>
                </View>
                {canManageMember(member) && (
                  <Menu
                    visible={menuVisible === member.userId}
                    onDismiss={() => setMenuVisible(null)}
                    anchor={
                      <List.Icon
                        icon="dots-vertical"
                        onPress={() => setMenuVisible(member.userId)}
                      />
                    }
                  >
                    <Menu.Item
                      onPress={() =>
                        handleRoleChange(
                          member.userId,
                          member.userName,
                          "admin"
                        )
                      }
                      title="設為管理員"
                      disabled={member.role === "admin"}
                    />
                    <Menu.Item
                      onPress={() =>
                        handleRoleChange(
                          member.userId,
                          member.userName,
                          "member"
                        )
                      }
                      title="設為成員"
                      disabled={member.role === "member"}
                    />
                    <Divider />
                    <Menu.Item
                      onPress={() =>
                        handleRemove(member.userId, member.userName)
                      }
                      title="移除成員"
                      titleStyle={{ color: "#EF4444" }}
                    />
                  </Menu>
                )}
              </View>
            )}
          />
          {index < members.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </View>
  );
}
