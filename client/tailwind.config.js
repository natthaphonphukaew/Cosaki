/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7C3AED',
          pink:   '#EC4899',
          light:  '#EDE9FE',
        },
        surface: {
          base: '#F4F3FF',
          card: '#FFFFFF',
        },
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(to right, #7C3AED, #EC4899)',
        'brand-gradient-br': 'linear-gradient(to bottom right, #7C3AED, #EC4899)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
