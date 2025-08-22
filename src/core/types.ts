export interface PackageManagerAndBuilder {
  name: string;
  title: string;
  packageManager: string;
  buildTool: string;
  installCmd: string;
  ciSetup: string;
  ciInstall: string;
  runPrefix: string;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  buildConfig?: string;
}

export interface LinterFormatter {
  name: string;
  title: string;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  configFiles: Record<string, string>;
  ciLintCmd: string;
}

export interface Tester {
  name: string;
  title: string;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  testFiles: string[];
  configFiles?: Record<string, string>;
}

export interface Versioning {
  name: string;
  title: string;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  config: string;
}

export interface ProjectConfig {
  packageManagerAndBuilder: PackageManagerAndBuilder;
  linterFormatter: LinterFormatter;
  tester: Tester;
  versioning: Versioning;
}

export interface Provider<T> {
  get(name: string): T;
  getAll(): Record<string, T>;
  register(name: string, config: T): void;
}

export interface TestVariant {
  packageManagerAndBuilder: string;
  linterFormatter: string;
  tester: string;
  versioning: string;
  name: string;
}

export interface TestResult {
  variant: TestVariant;
  success: boolean;
  error?: string;
  buildSuccess?: boolean;
  exportsMatch?: boolean;
  npmPackageWorks?: boolean;
  scriptResults?: { [key: string]: boolean };
}
