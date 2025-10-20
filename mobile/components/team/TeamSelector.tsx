import { UserTeam } from "@/types/team";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Dialog, Portal, RadioButton } from "react-native-paper";

interface TeamSelectorProps {
  visible: boolean;
  teams: UserTeam[];
  currentTeamId: string | null;
  onDismiss: () => void;
  onSelectTeam: (teamId: string) => void;
}

export function TeamSelector({
  visible,
  teams,
  currentTeamId,
  onDismiss,
  onSelectTeam,
}: TeamSelectorProps) {
  const [selectedId, setSelectedId] = React.useState(currentTeamId);

  const handleConfirm = () => {
    if (selectedId) {
      onSelectTeam(selectedId);
    }
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>切換團隊</Dialog.Title>
        <Dialog.Content>
          <ScrollView className="max-h-96">
            <RadioButton.Group
              onValueChange={(value) => setSelectedId(value)}
              value={selectedId || ""}
            >
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  onPress={() => setSelectedId(team.id)}
                  className="flex-row items-center py-3 border-b border-gray-100"
                >
                  <RadioButton value={team.id} />
                  <View className="flex-1 ml-2">
                    <Text className="text-base font-semibold text-gray-900">
                      {team.name}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Text className="text-xs text-gray-500 mr-2">
                        {team.memberCount} 位成員
                      </Text>
                      <View className="px-2 py-0.5 bg-gray-100 rounded">
                        <Text className="text-xs text-gray-700">
                          {team.myRole === "owner"
                            ? "擁有者"
                            : team.myRole === "admin"
                            ? "管理員"
                            : "成員"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </RadioButton.Group>
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <TouchableOpacity onPress={onDismiss} className="px-4 py-2">
            <Text className="text-gray-600 font-medium">取消</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleConfirm} className="px-4 py-2">
            <Text className="text-line-green font-semibold">確定</Text>
          </TouchableOpacity>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
