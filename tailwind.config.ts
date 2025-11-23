import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // HumaticAI Brand Colors - matching exactly
        background: "#111111",
        surface: "#1a1a1a",
        border: "#2c2c2c",
        "text-primary": "#f0f0f0",
        "text-secondary": "#a0a0a0",
        accent: "#007aff",
        "accent-hover": "#0056b3",
        danger: "#ff453a",
        success: "#30d158",
        warning: "#ff9f0a",
      },
      fontFamily: {
        sans: [
          "'Inter'",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      fontWeight: {
        regular: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
      borderRadius: {
        DEFAULT: "12px",
        lg: "16px",
        md: "10px",
        sm: "6px",
      },
      spacing: {
        unit: "8px",
      },
      maxWidth: {
        container: "1100px",
      },
      transitionDuration: {
        DEFAULT: "300ms",
      },
      boxShadow: {
        card: "0 0 24px rgba(0, 122, 255, 0.12), 0 0 64px rgba(0, 122, 255, 0.06)",
        "card-hover": "0 10px 20px rgba(0, 0, 0, 0.1), 0 0 24px rgba(0, 122, 255, 0.16), 0 0 64px rgba(0, 122, 255, 0.1)",
        "modal": "0 10px 20px rgba(0, 0, 0, 0.25)",
      },
      backgroundImage: {
        "card-gradient": "linear-gradient(180deg, rgba(0, 122, 255, 0.08), transparent 70%)",
      },
      backdropBlur: {
        xs: "2px",
      },
      zIndex: {
        "header": "1000",
        "mobile-nav": "2500",
        "modal": "2000",
        "toast": "4000",
        "consent": "3000",
      },
    },
  },
  plugins: [],
};
export default config;

