import type { PackageManagerAndBuilder, Provider } from '../core/types.js';

export class PackageManagerProvider implements Provider<PackageManagerAndBuilder> {
  private providers: Record<string, PackageManagerAndBuilder> = {
    bun: {
      name: 'bun',
      title: 'Bun (package manager + builder)',
      packageManager: 'bun@latest',
      buildTool: 'bun',
      installCmd: 'bun install',
      ciSetup: `- name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: "latest"`,
      ciInstall: 'bun install',
      runPrefix: 'bun run',
      devDependencies: {
        'typescript': 'latest',
      },
      scripts: {
        build: 'bun build ./src/index.ts --outdir ./dist --target node --format esm && tsc --declaration --emitDeclarationOnly --outDir dist src/index.ts src/utils.ts',
        dev: 'bun build ./src/index.ts --outdir ./dist --target node --format esm --watch',
        clean: 'rm -rf dist',
        typecheck: 'tsc --noEmit',
      },
    },
    npm: {
      name: 'npm',
      title: 'npm + tsup',
      packageManager: 'npm@latest',
      buildTool: 'tsup',
      installCmd: 'npm install',
      ciSetup: `- name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"`,
      ciInstall: 'npm ci',
      runPrefix: 'npm run',
      devDependencies: {
        'tsup': 'latest',
        'typescript': 'latest',
      },
      scripts: {
        build: 'tsup',
        dev: 'tsup --watch',
        clean: 'rm -rf dist',
        typecheck: 'tsc --noEmit',
      },
      buildConfig: `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});`,
    },
  };

  get(name: string): PackageManagerAndBuilder {
    const provider = this.providers[name];
    if (!provider) {
      throw new Error(`Package manager '${name}' not found`);
    }
    return provider;
  }

  getAll(): Record<string, PackageManagerAndBuilder> {
    return { ...this.providers };
  }

  register(name: string, config: PackageManagerAndBuilder): void {
    this.providers[name] = config;
  }
}

export const packageManagerProvider = new PackageManagerProvider();
