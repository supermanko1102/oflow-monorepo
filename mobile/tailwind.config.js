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
        // Design System Colors
        brand: {
          teal: '#008080', // Teal: AI, Automation, Efficiency
          slate: '#5A6B7C', // Slate Blue: Business, Trust
        },
        status: {
          success: '#22C55E', // Green: Auto-logged
          warning: '#F97316', // Orange: Manual intervention
          danger: '#EF4444',
        },
      }
    },
  },
  plugins: [],
}
