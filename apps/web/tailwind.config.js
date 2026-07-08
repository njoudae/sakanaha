/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans Arabic", "Noto Sans Arabic", "Segoe UI", "Arial", "sans-serif"],
      },
      colors: {
        ink: "#1f2937",
        clay: "#b86b5a",
        berry: "#7c3a6f",
        skysoft: "#4f8aa8",
        mintdeep: "#2f7d6d",
        linen: "#fbf7f2",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(58, 45, 36, 0.12)",
      },
    },
  },
  plugins: [],
};
