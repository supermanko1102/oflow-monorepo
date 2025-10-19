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
        // LINE 品牌綠色（唯一的彩色）
        line: {
          green: '#00B900',
          DEFAULT: '#00B900',
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
