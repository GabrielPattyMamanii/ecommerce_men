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
        // TEKGEAR public store (Navbar / Home / ProductDetail)
        "primary": "#00f0ff",
        "primary-dark": "#00a3cc",
        "accent": "#2d3446",
        "background-dark": "#050505",
        "surface": "#0a0f14",
        "surface-light": "#131a24",
        "neon-blue": "#00f0ff",
        "tech-grey": "#8b9bb4",

        // Admin dashboard tokens (Space Grotesk theme)
        "admin-primary": "#0d46f2",
        "admin-bg": "#101422",
        "admin-surface": "#1a1f30",
        "admin-card": "#161b2e",
      },
      fontFamily: {
        "display": ["Chakra Petch", "Rajdhani", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "grotesk": ["Space Grotesk", "sans-serif"],
        "mono": ["ui-monospace", "Cascadia Code", "monospace"],
      },
      boxShadow: {
        "neon": '0 0 5px #00f0ff, 0 0 20px #00f0ff',
        "neon-sm": '0 0 2px #00f0ff, 0 0 10px #00f0ff',
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
