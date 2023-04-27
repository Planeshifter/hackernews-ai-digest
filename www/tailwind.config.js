const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./{src,mdx}/**/*.{js,mjs,jsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontSize: {
        '2xs': '.6875rem',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Mona Sans', ...defaultTheme.fontFamily.sans],
      },
      opacity: {
        2.5: '0.025',
        7.5: '0.075',
        15: '0.15',
      },
      backgroundColor: {
        'primary': '#ff6600', // Hacker News orange
        'secondary': '#828282', // Hacker News gray
        'background': '#f6f6ef' // Hacker News background color
      },
      textColor: {
        'primary': '#ff6600', // Hacker News orange
        'secondary': '#828282' // Hacker News gray
      },
      borderColor: {
        'primary': '#ff6600', // Hacker News orange
        'secondary': '#828282' // Hacker News gray
      }
    }
  },
  plugins: [],
}
