/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // LINE 品牌綠色系統
        line: {
          green: '#00B900',
          DEFAULT: '#00B900',
        },
        // 主色系（綠色 - LINE 品牌色）
        primary: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#00B900', // 主要綠
          600: '#009900',
          700: '#007700',
          800: '#005500',
          900: '#003300',
        },
        // 輔助色 - 成功/警告/錯誤
        success: {
          light: '#D1FAE5',
          DEFAULT: '#10B981',
          dark: '#047857',
        },
        warning: {
          light: '#FEF3C7',
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        error: {
          light: '#FEE2E2',
          DEFAULT: '#EF4444',
          dark: '#DC2626',
        },
        info: {
          light: '#DBEAFE',
          DEFAULT: '#3B82F6',
          dark: '#1D4ED8',
        },
        // 中性色（更柔和）
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
      },
      // 陰影系統（LINE 風格 - 更柔和）
      boxShadow: {
        'soft': '0 1px 4px rgba(0, 0, 0, 0.03)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'elevated': '0 4px 12px rgba(0, 0, 0, 0.05)',
        'floating': '0 8px 20px rgba(0, 0, 0, 0.06)',
      },
      // 圓角系統（LINE 風格 - 更大更圓潤）
      borderRadius: {
        'none': '0',
        'sm': '8px',
        'DEFAULT': '12px',
        'md': '16px',
        'lg': '20px',    // LINE 標準圓角
        'xl': '24px',    // LINE 大圓角
        '2xl': '28px',
        '3xl': '32px',
        'full': '9999px',
      },
      // 間距系統（更寬鬆）
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '28': '7rem',
      },
    },
  },
  plugins: [],
}
