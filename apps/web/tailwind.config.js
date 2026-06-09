/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        os: {
          black: "#000000",
          dark: "#121212",
          surface: "#18181b",
          pink: "#ff007f",
          cyan: "#00e5ff",
        }
      },
      boxShadow: {
        'neon-pink': '0 0 5px #ff007f, 0 0 20px #ff007f',
        'neon-cyan': '0 0 5px #00e5ff, 0 0 20px #00e5ff',
      }
    },
  },
  plugins: [],
}
