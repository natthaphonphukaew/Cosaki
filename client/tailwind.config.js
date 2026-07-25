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
        // Real SF Pro / Thonburi first (Apple devices); bundled look-alikes
        // (Inter + Noto Sans Thai) render consistently everywhere else. Latin
        // glyphs resolve to SF Pro/Inter; Thai falls through to Thonburi/Noto Sans Thai.
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"',
          'Inter', 'Thonburi', '"Noto Sans Thai"', 'system-ui', 'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
