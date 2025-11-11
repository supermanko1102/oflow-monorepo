import { TeamMember, TeamRole } from "@/types/team";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

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
      member.user_id !== currentUserId &&
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
        <React.Fragment key={member.member_id}>
          <View className="px-4 py-3 flex-row items-center">
            {/* Avatar */}
            <View className="justify-center items-center w-10 h-10 bg-gray-200 rounded-full">
              <Text className="text-lg font-semibold text-gray-600">
                {member.user_name.charAt(0)}
              </Text>
            </View>

            {/* Name and description */}
            <View className="flex-1 ml-3">
              <Text className="text-base font-medium text-gray-900">
                {member.user_name}
              </Text>
              {member.user_id === currentUserId && (
                <Text className="text-sm text-gray-500">（你）</Text>
              )}
            </View>

            {/* Role badge */}
            <View
              className={`px-2 py-1 rounded ${getRoleBadgeColor(
                member.role as TeamRole
              )}`}
            >
              <Text className="text-xs font-medium">
                {getRoleText(member.role as TeamRole)}
              </Text>
            </View>

            {/* Menu button */}
            {canManageMember(member) && (
              <View className="relative">
                <TouchableOpacity
                  onPress={() =>
                    setMenuVisible(
                      menuVisible === member.user_id ? null : member.user_id
                    )
                  }
                  className="w-10 h-10 items-center justify-center"
                  activeOpacity={0.6}
                >
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>

                {/* Dropdown menu */}
                {menuVisible === member.user_id && (
                  <View className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 w-36">
                    <TouchableOpacity
                      onPress={() =>
                        handleRoleChange(
                          member.user_id,
                          member.user_name,
                          "admin"
                        )
                      }
                      disabled={member.role === "admin"}
                      className="px-4 py-3 border-b border-gray-100"
                      activeOpacity={0.7}
                      style={{ opacity: member.role === "admin" ? 0.5 : 1 }}
                    >
                      <Text className="text-sm text-gray-900">設為管理員</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        handleRoleChange(
                          member.user_id,
                          member.user_name,
                          "member"
                        )
                      }
                      disabled={member.role === "member"}
                      className="px-4 py-3 border-b border-gray-100"
                      activeOpacity={0.7}
                      style={{ opacity: member.role === "member" ? 0.5 : 1 }}
                    >
                      <Text className="text-sm text-gray-900">設為成員</Text>
                    </TouchableOpacity>
                    <View className="h-px bg-gray-200" />
                    <TouchableOpacity
                      onPress={() =>
                        handleRemove(member.user_id, member.user_name)
                      }
                      className="px-4 py-3"
                      activeOpacity={0.7}
                    >
                      <Text className="text-sm text-red-500">移除成員</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
          {index < members.length - 1 && <View className="h-px bg-gray-200" />}
        </React.Fragment>
      ))}
    </View>
  );
}
