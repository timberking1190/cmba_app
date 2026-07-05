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
      // Colors resolve through CSS variables so the app can theme (light/dark). The
      // dark values (globals.css :root) are byte-identical to the previous hex, so the
      // default dark experience is unchanged. Tailwind's white/black are flipped too so
      // pervasive text-white / bg-white/X / border-white/X overlays theme correctly.
      colors: {
        white: "rgb(var(--c-white) / <alpha-value>)",
        black: "rgb(var(--c-black) / <alpha-value>)",
        cmba: {
          red: "rgb(var(--cmba-red) / <alpha-value>)",
          "red-dark": "rgb(var(--cmba-red-dark) / <alpha-value>)",
          "red-deep": "rgb(var(--cmba-red-deep) / <alpha-value>)",
          hot: "rgb(var(--cmba-hot) / <alpha-value>)",
          black: "rgb(var(--cmba-black) / <alpha-value>)",
          "black-light": "rgb(var(--cmba-black-light) / <alpha-value>)",
          "black-card": "rgb(var(--cmba-black-card) / <alpha-value>)",
          "black-surface": "rgb(var(--cmba-black-surface) / <alpha-value>)",
          grey: "rgb(var(--cmba-grey) / <alpha-value>)",
          "grey-light": "rgb(var(--cmba-grey-light) / <alpha-value>)",
          "grey-mid": "rgb(var(--cmba-grey-mid) / <alpha-value>)",
          "grey-dark": "rgb(var(--cmba-grey-dark) / <alpha-value>)",
          white: "rgb(var(--cmba-white) / <alpha-value>)",
          bone: "rgb(var(--cmba-bone) / <alpha-value>)",
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
          "linear-gradient(135deg, rgb(var(--cmba-black) / 0.2) 0%, rgb(var(--cmba-black-light) / 0.35) 40%, rgb(var(--cmba-black) / 0.2) 100%)",
        "red-gradient":
          "linear-gradient(135deg, rgb(var(--cmba-red)) 0%, rgb(var(--cmba-red-dark)) 100%)",
        "card-gradient":
          "linear-gradient(180deg, rgb(var(--cmba-red) / 0.08) 0%, rgb(var(--cmba-black) / 0) 100%)",
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
