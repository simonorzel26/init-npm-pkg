export const sourceTemplates = {
  utils: `export const add = (a: number, b: number): number => a + b;
export const subtract = (a: number, b: number): number => a - b;
export const multiply = (a: number, b: number): number => a * b;
export const divide = (a: number, b: number): number => a / b;`,

  index: `export { add, subtract, multiply, divide } from './utils.js';`,

  vitest: `import { test, expect } from 'vitest';
import { add, subtract, multiply, divide } from './utils.js';

test('add', () => {
  expect(add(1, 2)).toBe(3);
  expect(add(-1, 1)).toBe(0);
});

test('subtract', () => {
  expect(subtract(3, 1)).toBe(2);
  expect(subtract(1, 3)).toBe(-2);
});

test('multiply', () => {
  expect(multiply(2, 3)).toBe(6);
  expect(multiply(0, 5)).toBe(0);
});

test('divide', () => {
  expect(divide(6, 2)).toBe(3);
  expect(divide(5, 2)).toBe(2.5);
});`,

  bun: `import { test, expect } from 'bun:test';
import { add, subtract, multiply, divide } from './utils.js';

test('add', () => {
  expect(add(1, 2)).toBe(3);
  expect(add(-1, 1)).toBe(0);
});

test('subtract', () => {
  expect(subtract(3, 1)).toBe(2);
  expect(subtract(1, 3)).toBe(-2);
});

test('multiply', () => {
  expect(multiply(2, 3)).toBe(6);
  expect(multiply(0, 5)).toBe(0);
});

test('divide', () => {
  expect(divide(6, 2)).toBe(3);
  expect(divide(5, 2)).toBe(2.5);
});`,

  tsconfig: `{
  "compilerOptions": {
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "es2022",
    "allowJs": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "module": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "lib": ["es2022"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}`,

  gitignore: `# OS
.DS_Store

# Dependencies
node_modules/

# Build output
dist/

# Env
.env
.env.*

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
*.log

# Coverage
coverage/

# IDE/editor
.vscode/
.idea/

# Misc
*.local`,

  readme: (projectName: string) => `# ${projectName}

A TypeScript library scaffolded by create-package.

## Installation

\`\`\`bash
npm install ${projectName}
\`\`\`

## Usage

\`\`\`typescript
import { add, subtract, multiply, divide } from '${projectName}';

console.log(add(1, 2)); // 3
console.log(subtract(5, 2)); // 3
console.log(multiply(3, 4)); // 12
console.log(divide(10, 2)); // 5
\`\`\`

## Development

\`\`\`bash
npm install
npm run build
npm test
\`\`\``,

  license: `MIT License

Copyright (c) 2025 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,

  tsupConfig: `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});`,

  vitestConfig: `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});`,
};
