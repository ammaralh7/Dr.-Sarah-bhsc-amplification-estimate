import animate from "tailwindcss-animate";
/** Apple (iOS Human Interface) tokens — every colour is a CSS variable in src/index.css. */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', "-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', '"SF Pro Display"', '"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
      colors: {
        bg: "var(--bg)", card: "var(--card)", card2: "var(--card2)",
        label: "var(--label)", label2: "var(--label2)", label3: "var(--label3)",
        sep: "var(--sep)", fill: "var(--fill)", fill2: "var(--fill2)",
        tint: "var(--tint)", "tint-ink": "var(--tint-ink)", "tint-soft": "var(--tint-soft)",
        warn: "var(--warn)", "warn-ink": "var(--warn-ink)", material: "var(--material)",
      },
    },
  },
  plugins: [animate],
};
