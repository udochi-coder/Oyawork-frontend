/** @type {import('tailwindcss').Config} */
// Colours taken from the OyaWork screens in the design brief.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#22C55E", // primary buttons, active tab, toggles
          dark: "#15803D", // text on green tint, prices
          soft: "#DCFCE7", // selected cards, banners, chips
          tint: "#F0FDF4",
        },
        ink: "#111827", // headings + dark balance card
        muted: "#4B5563",
        subtle: "#6B7280",
        line: "#E5E7EB",
        surface: "#F9FAFB",
        field: "#F3F4F6",
        navy: "#1B2A4A", // logo background
        sun: "#F18F01", // logo wordmark + stars
        danger: { DEFAULT: "#EF4444", soft: "#FEE2E2" },
        warn: { DEFAULT: "#B45309", soft: "#FEF3C7" },
      },
      fontFamily: { sans: ["Arimo", "Arial", "Helvetica", "sans-serif"] },
      boxShadow: { card: "0 1px 2px rgba(17,24,39,.06), 0 1px 3px rgba(17,24,39,.08)" },
    },
  },
  plugins: [],
};
