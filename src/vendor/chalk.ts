// Minimal chalk reimplementation
// Only includes the colors actually used in this codebase

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m', 
  red: '\x1b[31m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
} as const;

type ColorName = keyof typeof colors;

function colorize(color: ColorName, text: string): string {
  return `${colors[color]}${text}${colors.reset}`;
}

const chalk = {
  green: (text: string) => colorize('green', text),
  yellow: (text: string) => colorize('yellow', text),
  red: (text: string) => colorize('red', text),
  white: (text: string) => colorize('white', text),
  gray: (text: string) => colorize('gray', text),
  blue: (text: string) => colorize('blue', text),
  cyan: (text: string) => colorize('cyan', text)
};

export default chalk;