import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'skygray': {
          300: '#d0ddea'
        },
        'royalblue': {
          400: '#3e5a8e'
        },
        'cobalt': {
          700: '#353c49'
        }
      },
      boxShadow: {
        'bold': '4px 4px 8px #919191'
      }
    },
    fontFamily: {
      'sans': ['Helvetica', 'sans-serif']
    }
  },
  plugins: [
    //   expose colors as variables available to CSS e.g. globals.css, from https://gist.github.com/Merott/d2a19b32db07565e94f10d13d11a8574
    function({ addBase, theme }) {
      function extractColorVars(colorObj, colorGroup = '') {
        return Object.keys(colorObj).reduce((vars, colorKey) => {
          const value = colorObj[colorKey];

          const newVars =
              typeof value === 'string'
                  ? { [`--color${colorGroup}-${colorKey}`]: value }
                  : extractColorVars(value, `-${colorKey}`);

          return { ...vars, ...newVars };
        }, {});
      }

      addBase({
        ':root': extractColorVars(theme('colors')),
      });
    },
  ],
}
export default config
