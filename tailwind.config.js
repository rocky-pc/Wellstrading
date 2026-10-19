/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        bull: {
          DEFAULT: "#00c076",
          dark: "#009e60",
          light: "#10b981",
          soft: "rgba(0, 192, 118, 0.12)",
        },
        bear: {
          DEFAULT: "#ff4d4f",
          dark: "#cf1322",
          light: "#f43f5e",
          soft: "rgba(255, 77, 79, 0.12)",
        },
        brand: {
          gold: "#f59e0b",
          red: "#e11d48",
          blue: "#3b82f6",
          dark: "#070b14",
          surface: "#0e1526",
          panel: "#121b2f",
          border: "#1e293b",
        }
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      }
    },
  },
  plugins: [],
}
