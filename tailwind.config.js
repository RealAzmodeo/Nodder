/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./{components,hooks,services,modules}/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}", // Para App.tsx en la raíz si aún existiera o index.tsx
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
