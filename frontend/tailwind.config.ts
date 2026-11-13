import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmic: {
          950: "#0a0118",
          900: "#0e0422",
          850: "#14082d",
          neon: "#c47fe5",
          glow: "#dbbdf7",
        },
        canvas: "#0B0B0E",
        surface: {
          DEFAULT: "#111113",
          high: "#17171a",
        },
        border: {
          DEFAULT: "#26262b",
        },
        accent: {
          DEFAULT: "#6D4AFF",
          hover: "#5b36ed",
          active: "#4e2cc7",
          subtle: "#6D4AFF15",
          primary: "#713DFF",
          light: "#D7CDFF",
          soft: "#BAB3FF",
        },
        text: {
          primary: "#ededf0",
          secondary: "#8b8b94",
          tertiary: "#5a5a63",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        serif: ["Playfair Display", "Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
