export const Palette = {
  brand: {
    primary: "#00B900",
  },
  neutrals: {
    white: "#FFFFFF",
    surface: "#F8FAFC",
    text: "#11181C",
    heading: "#111827",
    slate600: "#4B5563",
    icon: "#687076",
    iconMuted: "#9BA1A6",
    placeholder: "#9CA3AF",
    darkSurface: "#151718",
  },
  neutralsDark: {
    text: "#ECEDEE",
    background: "#151718",
    surface: "#1F2125",
    heading: "#F8FAFC",
    icon: "#9BA1A6",
    iconMuted: "#6B7280",
    border: "#1F2933",
  },
  status: {
    success: "#22C55E",
    warning: "#F97316",
    danger: "#EF4444",
    info: "#0EA5E9",
  },
} as const;

export type Palette = typeof Palette;
