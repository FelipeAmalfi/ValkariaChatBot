import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Valkaria dark fantasy theme
        valkaria: {
          50: '#f5f0ff',
          100: '#ede0ff',
          200: '#d8c1ff',
          300: '#bb94ff',
          400: '#9a5fff',
          500: '#7c32f5',
          600: '#6b17e4',
          700: '#5a10c0',
          800: '#4b119e',
          900: '#3f1080',
          950: '#270961',
        },
        midnight: {
          900: '#0d0a1a',
          800: '#140f2a',
          700: '#1c1638',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        fantasy: ['Cinzel', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'gradient-valkaria': 'linear-gradient(135deg, #270961 0%, #0d0a1a 50%, #1c1638 100%)',
      },
    },
  },
  plugins: [],
}

export default config
