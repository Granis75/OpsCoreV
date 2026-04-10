/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        shell:
          '0 20px 48px -28px rgba(15, 23, 42, 0.18), 0 10px 28px -24px rgba(15, 23, 42, 0.12)',
        'shell-hover':
          '0 24px 56px -28px rgba(15, 23, 42, 0.22), 0 16px 32px -24px rgba(15, 23, 42, 0.16)',
      },
    },
  },
  plugins: [],
}
