import type { ProjectConfig } from '../core/types.js';

export function generateCI(config: ProjectConfig): string {
  return `name: CI

on:
  pull_request:
  push:
    branches:
      - main

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      ${config.packageManagerAndBuilder.ciSetup}

      - name: Install dependencies
        run: ${config.packageManagerAndBuilder.ciInstall}

      - name: Lint & format
        run: ${config.linterFormatter.ciLintCmd}

      - name: Typecheck
        run: ${config.packageManagerAndBuilder.runPrefix} typecheck

      - name: Test
        run: ${config.packageManagerAndBuilder.runPrefix} test

      - name: Build
        run: ${config.packageManagerAndBuilder.runPrefix} build`;
}
