/**
 * 設計系統常數
 * 統一的陰影、動畫、圓角、間距定義
 */

// 陰影系統
export const SHADOWS = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

// 動畫時長
export const ANIMATIONS = {
  fast: 200,
  normal: 300,
  slow: 500,
};

// 字體層級
export const TYPOGRAPHY = {
  h1: 'text-3xl font-bold',      // 30px
  h2: 'text-2xl font-bold',      // 24px
  h3: 'text-xl font-semibold',   // 20px
  h4: 'text-lg font-semibold',   // 18px
  body: 'text-base',             // 16px
  small: 'text-sm',              // 14px
  tiny: 'text-xs',               // 12px
};

// 圓角層級
export const RADIUS = {
  small: 8,    // badge, chip
  medium: 12,  // card
  large: 16,   // large card
  xlarge: 20,  // container
  full: 9999,  // pill
};

// 間距系統
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

// 漸層定義
export const GRADIENTS = {
  primary: ['#00B900', '#009900'],
  success: ['#10B981', '#059669'],
  warning: ['#F59E0B', '#D97706'],
  error: ['#EF4444', '#DC2626'],
  info: ['#3B82F6', '#2563EB'],
  // 柔和漸層
  softGreen: ['#DCFCE7', '#BBF7D0'],
  softBlue: ['#DBEAFE', '#BFDBFE'],
  softYellow: ['#FEF3C7', '#FDE68A'],
  softRed: ['#FEE2E2', '#FECACA'],
};

// 色彩系統
export const COLORS = {
  primary: '#00B900',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
};

