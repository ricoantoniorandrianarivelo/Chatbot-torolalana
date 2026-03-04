/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        torolalana: {
          dark: '#005162', // Main deep teal from torolalana.gov.mg --badge-color
          light: '#f2f2f2', // Light text/bg from --badge-text-color
          primary: '#0562c7', // From notification theme
          success: '#1f8838', // From notification theme
          danger: '#bd1120', // From notification theme
          gray: '#f4f4f4', // From button bg theme
          text: '#424242', // Main text gray
        }
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
