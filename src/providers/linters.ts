import type { LinterFormatter, Provider } from '../core/types.js';

export class LinterProvider implements Provider<LinterFormatter> {
  private providers: Record<string, LinterFormatter> = {
    biome: {
      name: 'biome',
      title: 'Biome (linter + formatter)',
      devDependencies: {
        '@biomejs/biome': 'latest',
      },
      scripts: {
        lint: 'biome check .',
        format: 'biome format --write .',
        'lint:fix': 'biome check --write .',
      },
      configFiles: {
        'biome.json': `{
  "$schema": "https://biomejs.dev/schemas/2.2.0/schema.json",
  "linter": { "enabled": true },
  "formatter": { "enabled": true },
  "files": {
    "includes": [
      "src/**/*.ts"
    ]
  },
  "javascript": { "formatter": { "quoteStyle": "single", "trailingCommas": "all" } }
}`,
      },
      ciLintCmd: 'npx @biomejs/biome ci .',
    },
    eslint: {
      name: 'eslint',
      title: 'ESLint + Prettier',
      devDependencies: {
        'eslint': 'latest',
        '@eslint/js': 'latest',
        '@typescript-eslint/eslint-plugin': 'latest',
        '@typescript-eslint/parser': 'latest',
        'prettier': 'latest',
        'eslint-config-prettier': 'latest',
        'eslint-plugin-prettier': 'latest',
      },
      scripts: {
        lint: 'eslint .',
        format: 'prettier --write .',
        'lint:fix': 'eslint . --fix',
      },
      configFiles: {
        'eslint.config.js': `import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        node: true,
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier: prettier,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
    },
  },
];`,
        '.prettierrc': `{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80,
  "tabWidth": 2
}`,
      },
      ciLintCmd: 'npm run lint',
    },
  };

  get(name: string): LinterFormatter {
    const provider = this.providers[name];
    if (!provider) {
      throw new Error(`Linter/formatter '${name}' not found`);
    }
    return provider;
  }

  getAll(): Record<string, LinterFormatter> {
    return { ...this.providers };
  }

  register(name: string, config: LinterFormatter): void {
    this.providers[name] = config;
  }
}

export const linterProvider = new LinterProvider();
