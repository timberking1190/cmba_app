import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cmba: {
          red: "#EB1C24",
          "red-dark": "#CC0000",
          "red-deep": "#660000",
          black: "#121212",
          "black-light": "#1A1A1A",
          "black-card": "#1E1E1E",
          "black-surface": "#252525",
          grey: "#A3A3A3",
          "grey-light": "#EEEEEE",
          "grey-mid": "#808080",
          "grey-dark": "#353535",
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ["var(--font-barlow-condensed)", "sans-serif"],
        body: ["var(--font-barlow)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, #121212 0%, #1A1A1A 40%, #121212 100%)",
        "red-gradient":
          "linear-gradient(135deg, #EB1C24 0%, #CC0000 100%)",
        "card-gradient":
          "linear-gradient(180deg, rgba(235,28,36,0.08) 0%, rgba(18,18,18,0) 100%)",
      },
      animation: {
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.5s ease-out",
        "pulse-red": "pulseRed 2s infinite",
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
      },
    },
  },
  plugins: [],
};
export default config;
