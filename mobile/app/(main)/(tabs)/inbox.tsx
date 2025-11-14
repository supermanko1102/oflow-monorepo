import { ScrollView, Text, View } from "react-native";

export default function inbox() {
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 p-6">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Products</Text>
      </View>
    </ScrollView>
  );
}
