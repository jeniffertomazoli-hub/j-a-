/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14142B",
        royal: "#2F3FE0",
        yellow: "#FFD93D",
        pink: "#FF4D97",
        purple: "#8B7FFF",
        cyan: "#33DDF3",
        mint: "#6EE7B7",
        peach: "#FFA07A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Baloo 2"', "cursive", "sans-serif"],
      },
      boxShadow: {
        brut: "4px 4px 0px #14142B",
        brutsm: "2px 2px 0px #14142B",
        brutlg: "6px 6px 0px #14142B",
      },
      borderWidth: {
        '3': '3px',
      },
      keyframes: {
        popIn: {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceShort: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      },
      animation: {
        popIn: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        fadeUp: 'fadeUp 0.4s ease-out both',
        fadeIn: 'fadeIn 0.5s ease-out both',
        bounceShort: 'bounceShort 1s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
