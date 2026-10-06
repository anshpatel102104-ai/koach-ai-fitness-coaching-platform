/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    screens: {
      xs: '390px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-body)'],
        heading: ['var(--font-heading)'],
        body: ['var(--font-body)'],
      },
      borderRadius: {
        sm:   'calc(var(--radius) - 4px)',
        md:   'calc(var(--radius))',
        lg:   'calc(var(--radius) + 2px)',
        xl:   'calc(var(--radius) + 4px)',
        '2xl':'calc(var(--radius) + 8px)',
        '3xl':'calc(var(--radius) + 16px)',
      },
      colors: {
        background:  'rgb(var(--background) / <alpha-value>)',
        foreground:  'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT:    'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT:    'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT:    'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT:    'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT:    'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT:    'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT:    'rgb(var(--destructive) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)',
        },
        border:  'rgb(var(--border) / <alpha-value>)',
        input:   'rgb(var(--input) / <alpha-value>)',
        ring:    'rgb(var(--ring) / <alpha-value>)',
        brand: {
          DEFAULT:    'rgb(var(--brand) / <alpha-value>)',
          foreground: 'rgb(var(--brand-foreground) / <alpha-value>)',
          soft:       'rgb(var(--brand-soft) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          soft:    'rgb(var(--success-soft) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          soft:    'rgb(var(--warning-soft) / <alpha-value>)',
        },
        partial: 'rgb(var(--partial) / <alpha-value>)',
        ai: {
          DEFAULT:    'rgb(var(--ai) / <alpha-value>)',
          foreground: 'rgb(var(--ai-foreground) / <alpha-value>)',
        },
        chart: {
          '1': 'rgb(var(--chart-1))',
          '2': 'rgb(var(--chart-2))',
          '3': 'rgb(var(--chart-3))',
          '4': 'rgb(var(--chart-4))',
          '5': 'rgb(var(--chart-5))',
        },
        sidebar: {
          DEFAULT:              'rgb(var(--sidebar-background) / <alpha-value>)',
          foreground:           'rgb(var(--sidebar-foreground) / <alpha-value>)',
          muted:                'rgb(var(--sidebar-muted) / <alpha-value>)',
          primary:              'rgb(var(--sidebar-primary) / <alpha-value>)',
          'primary-foreground': 'rgb(var(--sidebar-primary-foreground) / <alpha-value>)',
          accent:               'rgb(var(--sidebar-accent) / <alpha-value>)',
          'accent-foreground':  'rgb(var(--sidebar-accent-foreground) / <alpha-value>)',
          border:               'rgb(var(--sidebar-border))',
          ring:                 'rgb(var(--sidebar-ring) / <alpha-value>)',
        },
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
