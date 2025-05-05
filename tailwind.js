tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Zen Maru Gothic', 'sans-serif'],
                display: ['"M PLUS Rounded 1c"', 'sans-serif'],
            },
            colors: {
                miku: {
                    50: '#e6fffe', 100: '#c0fffd', 200: '#83fcfa', 300: '#39f0ec',
                    400: '#19d6d3', 500: '#0cb3b1', 600: '#0a9391', 700: '#0e7674',
                    800: '#115e5c', 900: '#124f4d',
                },
                star: {
                    50: '#fff9e6', 100: '#fff0c0', 200: '#ffe483', 300: '#ffcc29',
                    400: '#ffc107', 500: '#e8a506', 600: '#cc8504', 700: '#a56108',
                    800: '#884e10', 900: '#724213',
                },
                space: {
                    50: '#ebeefe', 100: '#d4d9fd', 200: '#adbafc', 300: '#8094f9',
                    400: '#5271ff', 500: '#3f51f6', 600: '#2c31e8', 700: '#2628cc',
                    800: '#2325a3', 900: '#041836',
                },
                pink: {
                    50: '#ffeef6', 100: '#ffd6ea', 200: '#ffadd6', 300: '#ff6bcb',
                    400: '#f83db3', 500: '#e71a96', 600: '#cc0a7a', 700: '#a80c67',
                    800: '#8a0f57', 900: '#740e49',
                }
            },
            animation: {
                'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 3s ease-in-out infinite',
                'fadeIn': 'fadeIn 0.5s ease-in',
                'fadeOut': 'fadeOut 0.5s ease-out',
                'scaleIn': 'scaleIn 0.3s ease-out',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeOut: {
                    '0%': { opacity: '1' },
                    '100%': { opacity: '0' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.8)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
            },
            boxShadow: {
                'glassy': '0 8px 32px rgba(57, 240, 236, 0.25)',
                'glassy-sm': '0 4px 16px rgba(57, 240, 236, 0.15)',
                'highlight': '0 0 15px rgba(57, 240, 236, 0.5)',
            }
        },
    },
};