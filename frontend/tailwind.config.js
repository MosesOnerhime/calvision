/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F4F6F1',
        surface: '#FFFFFF',
        'surface-subtle': '#E9EEE8',
        'surface-strong': '#DEE6DF',
        ink: '#142019',
        'ink-muted': '#5F6C63',
        'ink-soft': '#7E8A81',
        line: '#D5DED6',
        'line-strong': '#BFCBC1',
        primary: {
          DEFAULT: '#176B45',
          hover: '#115536',
          pressed: '#0B432A',
          soft: '#DDF1E6',
        },
        accent: { DEFAULT: '#D96A3A', soft: '#F7E4DB' },
        protein: { DEFAULT: '#3567A8', soft: '#E2EAF7' },
        carbs: { DEFAULT: '#B87412', soft: '#F6E9CF' },
        fat: { DEFAULT: '#76579A', soft: '#ECE4F4' },
        danger: { DEFAULT: '#B42318', soft: '#FDE8E7' },
        warning: { DEFAULT: '#9A6700', soft: '#FFF0C2' },
        focus: '#245BDB',
        night: {
          canvas: '#0D1410',
          surface: '#141D17',
          subtle: '#1B2720',
          strong: '#223129',
          ink: '#F3F7F2',
          muted: '#A7B3AA',
          line: '#2D3B32',
          'line-strong': '#405247',
          primary: '#62C991',
          'primary-soft': '#173927',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        float: '0 12px 32px rgba(20, 32, 25, 0.10)',
      },
    },
  },
  plugins: [],
}
