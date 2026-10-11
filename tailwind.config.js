import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'Inter', 'Roboto', ...defaultTheme.fontFamily.sans],
                display: ['"Plus Jakarta Sans"', 'Inter', ...defaultTheme.fontFamily.sans],
                mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'Monaco', ...defaultTheme.fontFamily.mono],
            },
            boxShadow: {
                subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
                card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
                'card-hover': '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04)',
                elevated: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            },
            colors: {
                restrly: {
                    50: '#F2F8F5',
                    100: '#E2F0EA',
                    200: '#C4E1D5',
                    300: '#97CCB7',
                    400: '#5FB092',
                    500: '#349472',
                    600: '#1F7557',
                    700: '#175D46',
                    800: '#134A38',
                    900: '#0F3C2E',
                    950: '#07221A',
                    forest: '#0B271F',
                    'forest-deep': '#071F18',
                    emerald: '#0F3D30',
                    'emerald-light': '#165B47',
                    sage: '#10B981',
                    'sage-hover': '#059669',
                    'sage-light': '#D1FAE5',
                    ivory: '#FBFBF9',
                    cream: '#F6F5F0',
                    sand: '#ECE9E1',
                    charcoal: '#111827',
                    slate: '#1E293B',
                    muted: '#5A6578',
                },
            },
        },
    },

    plugins: [forms],
};
