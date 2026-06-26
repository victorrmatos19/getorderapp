/** @type {import('tailwindcss').Config} */
// Espelha o design system do GetOrder (web globals.css + tailwind.config.ts).
// Tokens de marca (primary/accent/price) referenciam CSS vars que o ThemeProvider
// injeta via nativewind `vars()` (white-label por restaurante, derivado em lib/theme.ts).
// Tokens neutros (bg/surface/line/ink/status-*) são constantes da identidade GetOrder.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── marca (white-label, via vars()) ──
        primary: 'var(--primary)',
        'primary-dk': 'var(--primary-dk)',
        'primary-lt': 'var(--primary-lt)',
        accent: 'var(--accent)',
        'accent-dk': 'var(--accent-dk)',
        'accent-lt': 'var(--accent-lt)',
        'on-primary': 'var(--on-primary)',
        'on-accent': 'var(--on-accent)',
        price: 'var(--price)',
        // ── neutros / status (constantes) ──
        bg: '#FAF9F5',
        surface: '#F2F0E8',
        line: '#DDD9CC',
        muted: '#B8B5AB',
        'text-mid': '#6B6A62',
        ink: '#2A2A26',
        'status-new': '#C8871E',
        'status-prep': '#4A6B82',
        'status-ready': '#567D4F',
      },
      fontFamily: {
        serif: ['CormorantGaramond_500Medium'],
        'serif-semibold': ['CormorantGaramond_600SemiBold'],
        sans: ['WorkSans_400Regular'],
        'sans-medium': ['WorkSans_500Medium'],
        'sans-bold': ['WorkSans_700Bold'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '17px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['20px', { lineHeight: '26px' }],
        xl: ['24px', { lineHeight: '29px' }],
        '2xl': ['32px', { lineHeight: '35px' }],
      },
      borderRadius: { xl: '12px', lg: '8px' },
    },
  },
  plugins: [],
}
