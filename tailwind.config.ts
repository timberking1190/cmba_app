import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "480px",
      },
      colors: {
        cmba: {
          red: "#EB1C24",
          "red-dark": "#CC0000",
          "red-deep": "#660000",
          hot: "#FF2438",
          black: "#08080A",
          "black-light": "#0E0E12",
          "black-card": "#141418",
          "black-surface": "#1B1B20",
          grey: "#9A9AA2",
          "grey-light": "#F1F1ED",
          // WCAG AA on #08080A: grey-mid lifted to ~5.4:1 (secondary text); grey-dark
          // lifted for legible placeholders + more visible borders (decorative token).
          "grey-mid": "#8E8E96",
          "grey-dark": "#55555E",
          white: "#FFFFFF",
          bone: "#F7F6F2",
        },
      },
      fontFamily: {
        display: ["var(--font-archivo)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.03em",
        tighter2: "-0.02em",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, rgba(8,8,10,0.2) 0%, rgba(14,14,18,0.35) 40%, rgba(8,8,10,0.2) 100%)",
        "red-gradient":
          "linear-gradient(135deg, #EB1C24 0%, #CC0000 100%)",
        "card-gradient":
          "linear-gradient(180deg, rgba(235,28,36,0.08) 0%, rgba(8,8,10,0) 100%)",
      },
      animation: {
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.5s ease-out",
        "pulse-red": "pulseRed 2s infinite",
        rise: "rise 0.9s cubic-bezier(.16,1,.3,1) forwards",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseRed: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(235,28,36,0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(235,28,36,0)" },
        },
        rise: {
          to: { transform: "translateY(0)" },
        },
        scrollx: {
          to: { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
