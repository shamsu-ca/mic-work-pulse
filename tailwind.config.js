/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0051d5", "on-primary": "#ffffff", "primary-container": "#316bf3", "on-primary-container": "#fefcff", 
        secondary: "#4648d4", "on-secondary": "#ffffff", "secondary-container": "#6063ee", "on-secondary-container": "#fffbff", 
        tertiary: "#b61722", "on-tertiary": "#ffffff", "tertiary-container": "#da3437", "on-tertiary-container": "#fffbff", 
        error: "#ba1a1a", "on-error": "#ffffff", "error-container": "#ffdad6", "on-error-container": "#93000a", 
        background: "#faf8ff", "on-background": "#131b2e", surface: "#faf8ff", "on-surface": "#131b2e", 
        "surface-variant": "#dae2fd", "on-surface-variant": "#424754", outline: "#727785", "outline-variant": "#c2c6d6", 
        "surface-container-lowest": "#ffffff", "surface-container-low": "#f2f3ff", "surface-container": "#eaedff", 
        "surface-container-high": "#e2e7ff", "surface-container-highest": "#dae2fd", "inverse-on-surface": "#eef0ff", 
        "surface-tint": "#0053db", "primary-fixed-dim": "#b4c5ff", "inverse-surface": "#283044", 
        "on-primary-fixed": "#00174b", "tertiary-fixed": "#ffdad7", "on-secondary-fixed": "#07006c", 
        "on-tertiary-fixed-variant": "#930013", "on-tertiary-fixed": "#410004", "tertiary-fixed-dim": "#ffb3ad", 
        "secondary-fixed-dim": "#c0c1ff", "inverse-primary": "#b4c5ff", "surface-bright": "#faf8ff", 
        "on-secondary-fixed-variant": "#2f2ebe", "secondary-fixed": "#e1e0ff", "primary-fixed": "#dbe1ff", 
        "on-primary-fixed-variant": "#003ea8", "surface-dim": "#d2d9f4"
      },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      fontFamily: { headline: ["Manrope", "sans-serif"], body: ["Inter", "sans-serif"], label: ["Inter", "sans-serif"], display: ["Manrope", "sans-serif"] }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
