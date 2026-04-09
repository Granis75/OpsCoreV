/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        shell: '0 24px 60px -28px rgba(15, 23, 42, 0.28)',
      },
    },
  },
  plugins: [],
}
