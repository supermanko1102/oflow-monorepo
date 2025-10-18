/**
 * 簡化版的主題顏色 hook - 只返回淺色主題
 */

const lightColors = {
  text: '#11181C',
  background: '#fff',
  tint: '#0a7ea4',
  icon: '#687076',
  tabIconDefault: '#687076',
  tabIconSelected: '#0a7ea4',
};

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof lightColors
) {
  // 如果提供了 light 屬性，使用它；否則使用預設的淺色主題顏色
  return props.light ?? lightColors[colorName];
}

