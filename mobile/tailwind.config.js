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
      }
    },
  },
  plugins: [],
}
