import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      borderRadius: {
        xl: "var(--radius)",
      },
      boxShadow: {
        panel: "0 18px 45px -25px rgb(15 23 42 / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
