import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Palette } from "@/constants/palette";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
export default function TabLayout() {
  const activeColor = Palette.brand.primary;
  const tabConfigs = [
    { name: "overview", icon: "view-dashboard", label: "總覽" },
    { name: "orders", icon: "clipboard-list", label: "訂單" },
    { name: "inbox", icon: "message-text", label: "訊息" },
    { name: "customers", icon: "account-group", label: "顧客" },
    { name: "settings", icon: "cog", label: "設定" },
  ] as const;

  return (
    <NativeTabs>
      {tabConfigs.map(({ name, icon, label }) => (
        <NativeTabs.Trigger key={name} name={name}>
          <Icon
            selectedColor={activeColor}
            src={<VectorIcon family={MaterialCommunityIcons} name={icon} />}
          />
          <Label selectedStyle={{ color: activeColor }}>{label}</Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
  
}
