import { Text, type TextProps } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, darkColor }, 'text');

  // 根據 type 決定 className
  const getClassName = () => {
    switch (type) {
      case 'title':
        return 'text-3xl font-bold leading-8';
      case 'subtitle':
        return 'text-xl font-bold';
      case 'defaultSemiBold':
        return 'text-base leading-6 font-semibold';
      case 'link':
        return 'text-base leading-7';
      default:
        return 'text-base leading-6';
    }
  };

  return (
    <Text
      className={getClassName()}
      style={[
        { color: type === 'link' ? '#0a7ea4' : color },
        style,
      ]}
      {...rest}
    />
  );
}
