import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#000000',
          white: '#FFFFFF',
          orange: '#FF6A00',
          orangeHover: '#E55F00',
          orangeFocus: '#FF8533',
          globeBlue: '#4F8FD9',
          globeLightBlue: '#69B7E8',
          globeDarkBlue: '#3456A3',
        },
        surface: {
          dark: '#111111',
          card: '#181818',
          elevated: '#222222',
        },
      },
    },
  },
  plugins: [],
};

export default config;
