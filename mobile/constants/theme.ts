/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

import { Palette } from "./palette";


export const Colors = {
  light: {
    text: Palette.neutrals.text,
    background: Palette.neutrals.white,
    tint: Palette.brand.primary,
    icon: Palette.neutrals.icon,
    tabIconDefault: Palette.neutrals.icon,
    tabIconSelected: Palette.brand.primary,
    line: {
      green: Palette.brand.primary,
      DEFAULT: Palette.brand.primary,
    },
  },
  dark: {
    text: Palette.neutralsDark.text,
    background: Palette.neutralsDark.background,
    tint: Palette.brand.primary,
    icon: Palette.neutralsDark.icon,
    tabIconDefault: Palette.neutralsDark.iconMuted,
    tabIconSelected: Palette.brand.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
