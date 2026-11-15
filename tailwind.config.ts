import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        ink: { DEFAULT: "#0a0a12", 2: "#11111c", 3: "#191926" },
        sunset: { 1: "#ffb347", 2: "#ff5f6d", 3: "#e1306c", 4: "#8a3ab9" },
      },
      keyframes: {
        page: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
        drawer: { from: { transform: "translateX(40px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
        pop: { from: { transform: "scale(0.96)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
      },
      animation: {
        page: "page .35s cubic-bezier(.2,.8,.2,1) both",
        fade: "fade .2s ease-out both",
        drawer: "drawer .3s cubic-bezier(.2,.8,.2,1) both",
        pop: "pop .25s cubic-bezier(.2,.8,.2,1) both",
      },
      backgroundImage: {
        sunset: "linear-gradient(135deg, #ffb347 0%, #ff5f6d 35%, #e1306c 65%, #8a3ab9 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
