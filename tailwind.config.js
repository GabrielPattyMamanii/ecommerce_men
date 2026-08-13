/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // NEXO Performance public store (Navbar / Home / ProductDetail)
        "primary": "#000000",
        "primary-strong": "#1a1c1f",
        "on-primary": "#ffffff",
        "background": "#f9f9fb",
        "surface": "#ffffff",
        "surface-container": "#eeeef0",
        "border": "#e2e2e4",
        "muted": "#45474a",
        "outline": "#76777b",

        // Admin dashboard tokens (Space Grotesk theme)
        "admin-primary": "#0d46f2",
        "admin-bg": "#101422",
        "admin-surface": "#1a1f30",
        "admin-card": "#161b2e",
      },
      fontFamily: {
        "display": ["Hanken Grotesk", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "grotesk": ["Space Grotesk", "sans-serif"],
        "mono": ["ui-monospace", "Cascadia Code", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0px",
        sm: "2px",
        lg: "4px",
        full: "9999px",
      },
    },
  },
  plugins: [],
}
