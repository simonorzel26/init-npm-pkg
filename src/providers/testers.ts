import type { Tester, Provider } from '../core/types.js';

export class TesterProvider implements Provider<Tester> {
  private providers: Record<string, Tester> = {
    vitest: {
      name: 'vitest',
      title: 'Vitest',
      devDependencies: {
        'vitest': 'latest',
      },
      scripts: {
        test: 'vitest run',
        'test:watch': 'vitest',
        'test:coverage': 'vitest run --coverage',
      },
      testFiles: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
      configFiles: {
        'vitest.config.ts': `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});`,
      },
    },
    buntest: {
      name: 'buntest',
      title: 'Bun Test',
      devDependencies: {},
      scripts: {
        test: 'bun test',
        'test:watch': 'bun test --watch',
        'test:coverage': 'bun test --coverage',
      },
      testFiles: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
      configFiles: {},
    },
    none: {
      name: 'none',
      title: 'No Testing',
      devDependencies: {},
      scripts: {},
      testFiles: [],
      configFiles: {},
    },
  };

  get(name: string): Tester {
    const provider = this.providers[name];
    if (!provider) {
      throw new Error(`Tester '${name}' not found`);
    }
    return provider;
  }

  getAll(): Record<string, Tester> {
    return { ...this.providers };
  }

  register(name: string, config: Tester): void {
    this.providers[name] = config;
  }
}

export const testerProvider = new TesterProvider();
