import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        approve: {
          primary: "var(--approve-primary)",
          "primary-dark": "var(--approve-primary-dark)",
          "primary-light": "var(--approve-primary-light)",
          text: "var(--approve-text)",
          "text-secondary": "var(--approve-text-secondary)",
          surface: "var(--approve-surface)",
          "surface-alt": "var(--approve-surface-alt)",
          border: "var(--approve-border)",
        },
        status: {
          pending: "var(--status-pending)",
          "pending-bg": "var(--status-pending-bg)",
          approved: "var(--status-approved)",
          "approved-bg": "var(--status-approved-bg)",
          rejected: "var(--status-rejected)",
          "rejected-bg": "var(--status-rejected-bg)",
          "sent-back": "var(--status-sent-back)",
          "sent-back-bg": "var(--status-sent-back-bg)",
          draft: "var(--status-draft)",
          "draft-bg": "var(--status-draft-bg)",
        },
        grey: {
          100: "#F7F7F9",
          200: "#E4E7EC",
          300: "#D0D5DD",
          400: "#98A2B3",
          500: "#667085",
          600: "#344054",
          700: "#1D2939",
        },
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "24px",
        "6": "32px",
        "7": "40px",
        "8": "48px",
        "9": "64px",
        "10": "80px",
      },
      borderRadius: {
        card: "12px",
        btn: "6px",
        badge: "20px",
      },
      maxWidth: {
        content: "1200px",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
