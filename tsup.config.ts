import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/testing/runner.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
});
