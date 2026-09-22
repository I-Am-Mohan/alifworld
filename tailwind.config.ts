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
          amber: '#F59E0B',
          amberHover: '#D97706',
          amberSubtle: '#FEF3C7',
          orange: '#FF6A00',
          orangeHover: '#E55F00',
          orangeSubtle: '#FFF7ED',
          black: '#0F172A',
          blackPure: '#000000',
          charcoal: '#18181B',
          footer: '#161614',
          white: '#FFFFFF',
          cream: '#FAF9F6',
          creamSubtle: '#F8FAFC',
          heroNavy: '#0A4B8C',
          skyTint: '#E0F2FE',
          globeBlue: '#0284C7',
          globeLightBlue: '#38BDF8',
          stockGreen: '#16A34A',
          whatsapp: '#25D366',
        },
        pastel: {
          peach: '#FFEDD5',
          peachBorder: '#FED7AA',
          lavender: '#EEF2FF',
          lavenderBorder: '#E0E7FF',
          sand: '#FEF3C7',
          sandBorder: '#FDE68A',
          rose: '#FCE7F3',
          roseBorder: '#FBCFE8',
          mint: '#CCFBF1',
          mintBorder: '#99F6E4',
          jade: '#DCFCE7',
          jadeBorder: '#BBF7D0',
        },
        surface: {
          app: '#FAF9F6',
          card: '#FFFFFF',
          elevated: '#FFFFFF',
          muted: '#F8FAFC',
          subtle: '#F1F5F9',
          footer: '#161614',
        },
      },
    },
  },
  plugins: [],
};

export default config;
