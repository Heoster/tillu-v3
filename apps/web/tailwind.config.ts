import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tillu semantic color system (UI spec §103)
        tillu: {
          green:  "#22c55e",   // healthy / strong
          yellow: "#f59e0b",   // watch / moderate
          red:    "#ef4444",   // urgent / weak
          blue:   "#3b82f6",   // informational
          purple: "#8b5cf6",   // Tillu / AI intelligence
          gray:   "#6b7280",   // inactive / historical
        },
        // Surface system
        surface: {
          base:    "#030712",   // bg-gray-950
          card:    "#111827",   // bg-gray-900
          raised:  "#1f2937",   // bg-gray-800
          border:  "#1f2937",
          muted:   "#374151",   // bg-gray-700
        },
      },
      width: {
        nav:     "240px",
        sidebar: "320px",
      },
      minWidth: {
        nav:     "240px",
        sidebar: "280px",
      },
      maxWidth: {
        sidebar: "320px",
      },
      animation: {
        "fade-in":    "fadeIn 0.15s ease-out",
        "slide-up":   "slideUp 0.2s ease-out",
        "slide-left": "slideLeft 0.2s ease-out",
        "pulse-soft": "pulseSoft 2s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        fadeIn:    { "0%": { opacity: "0" },               "100%": { opacity: "1" } },
        slideUp:   { "0%": { transform: "translateY(8px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        slideLeft: { "0%": { transform: "translateX(16px)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
        pulseSoft: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
      },
    },
  },
  plugins: [],
};

export default config;
