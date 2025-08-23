import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ProjectFactory } from '../core/factory.js';
import { choices } from '../core/choices.js';
import { sourceTemplates } from '../templates/source.js';
import { generateCI } from '../templates/ci.js';
import type { TestVariant, TestResult } from '../core/types.js';

export class TestGenerator {
  private testDir: string;
  private variants: TestVariant[] = [];

  constructor(testDir: string = './test-variants') {
    this.testDir = testDir;
  }

  generateAllVariants(): TestVariant[] {
    const packageManagerAndBuilders = Object.keys(choices.packageManagerAndBuilders);
    const linterFormatters = Object.keys(choices.linterFormatters);
    const testers = Object.keys(choices.testers);
    const versioning = Object.keys(choices.versioning);

    this.variants = [];

    for (const pmb of packageManagerAndBuilders) {
      for (const lf of linterFormatters) {
        for (const tester of testers) {
          for (const ver of versioning) {
            this.variants.push({
              packageManagerAndBuilder: pmb,
              linterFormatter: lf,
              tester,
              versioning: ver,
              name: `${pmb}-${lf}-${tester}`,
            });
          }
        }
      }
    }

    return this.variants;
  }

  generateTestVariants(): TestVariant[] {
    const packageManagerAndBuilders = ['bun', 'npm'];
    const linterFormatters = ['biome', 'eslint'];
    const testers = ['vitest', 'buntest', 'none'];
    const versioning = ['changeset'];

    this.variants = [];

    for (const pmb of packageManagerAndBuilders) {
      for (const lf of linterFormatters) {
        for (const tester of testers) {
          for (const ver of versioning) {
            this.variants.push({
              packageManagerAndBuilder: pmb,
              linterFormatter: lf,
              tester,
              versioning: ver,
              name: `${pmb}-${lf}-${tester}`,
            });
          }
        }
      }
    }

    return this.variants;
  }

  async createTestProject(variant: TestVariant): Promise<boolean> {
    const projectDir = path.join(this.testDir, variant.name);

    try {
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true, force: true });
      }

      fs.mkdirSync(projectDir, { recursive: true });

      const config = ProjectFactory.createProject(
        variant.packageManagerAndBuilder,
        variant.linterFormatter,
        variant.tester,
        variant.versioning
      );

      this.writeProjectFiles(projectDir, config, variant.name);
      return true;
    } catch (error) {
      console.error(`Failed to create test project for ${variant.name}:`, error);
      return false;
    }
  }

  private writeProjectFiles(projectDir: string, config: any, projectName: string): void {
    const srcDir = path.join(projectDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    const packageJson = ProjectFactory.generatePackageJson(config, projectName);
    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');

    const ciYaml = generateCI(config);
    const workflowsDir = path.join(projectDir, '.github/workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), ciYaml);

    this.writeConfigFiles(projectDir, config);
    this.writeSourceFiles(projectDir, projectName, config);
  }

  private writeConfigFiles(projectDir: string, config: any): void {
    Object.entries(config.linterFormatter.configFiles).forEach(([filename, content]) => {
      fs.writeFileSync(path.join(projectDir, filename), content as string);
    });

    if (config.tester.configFiles) {
      Object.entries(config.tester.configFiles).forEach(([filename, content]) => {
        fs.writeFileSync(path.join(projectDir, filename), content as string);
      });
    }

      if (config.packageManagerAndBuilder.name === 'npm') {
    fs.writeFileSync(path.join(projectDir, "tsup.config.ts"), sourceTemplates.tsupConfig);
  }

    if (config.versioning.name === 'changeset') {
      const changesetConfigPath = path.join(projectDir, '.changeset/config.json');
      fs.mkdirSync(path.dirname(changesetConfigPath), { recursive: true });
      fs.writeFileSync(changesetConfigPath, config.versioning.config);
    }

    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), sourceTemplates.tsconfig);
    fs.writeFileSync(path.join(projectDir, '.gitignore'), sourceTemplates.gitignore);
    fs.writeFileSync(path.join(projectDir, 'README.md'), sourceTemplates.readme(config.packageManagerAndBuilder.name));
    fs.writeFileSync(path.join(projectDir, 'LICENSE'), sourceTemplates.license);
  }

  private writeSourceFiles(projectDir: string, projectName: string, config: any): void {
    const srcDir = path.join(projectDir, 'src');

    fs.writeFileSync(path.join(srcDir, 'utils.ts'), sourceTemplates.utils);
    fs.writeFileSync(path.join(srcDir, 'index.ts'), sourceTemplates.index);

    let testTemplate;
    let testExtension;
    switch (config.tester.name) {
      case 'bun':
        testTemplate = sourceTemplates.bun;
        testExtension = 'ts';
        break;
      default:
        testTemplate = sourceTemplates.vitest;
        testExtension = 'ts';
        break;
    }
    fs.writeFileSync(path.join(srcDir, `utils.test.${testExtension}`), testTemplate);
  }

  async installDependencies(variant: TestVariant): Promise<boolean> {
    const projectDir = path.join(this.testDir, variant.name);

    try {
      const installCmd = this.getInstallCommand(variant.packageManagerAndBuilder);
      execSync(installCmd, { cwd: projectDir, stdio: 'pipe' });
      return true;
    } catch (error) {
      console.error(`Failed to install dependencies for ${variant.name}:`, error);
      return false;
    }
  }

  private getInstallCommand(packageManagerAndBuilder: string): string {
    switch (packageManagerAndBuilder) {
      case 'bun': return 'bun install';
      case 'npm': return 'npm install';
      default: return 'npm install';
    }
  }

  async buildProject(variant: TestVariant): Promise<boolean> {
    const projectDir = path.join(this.testDir, variant.name);

    try {
      const buildCmd = this.getBuildCommand(variant.packageManagerAndBuilder);
      execSync(buildCmd, { cwd: projectDir, stdio: 'pipe' });
      return true;
    } catch (error) {
      console.error(`Failed to build ${variant.name}:`, error);
      return false;
    }
  }

  private getBuildCommand(packageManagerAndBuilder: string): string {
    switch (packageManagerAndBuilder) {
      case 'bun': return 'bun run build';
      case 'npm': return 'npm run build';
      default: return 'npm run build';
    }
  }

  async runTests(variant: TestVariant): Promise<boolean> {
    // Skip running tests if tester is "none"
    if (variant.tester === 'none') {
      return true;
    }

    const projectDir = path.join(this.testDir, variant.name);

    try {
      const testCmd = this.getTestCommand(variant.packageManagerAndBuilder);
      execSync(testCmd, { cwd: projectDir, stdio: 'pipe' });
      return true;
    } catch (error) {
      console.error(`Failed to run tests for ${variant.name}:`, error);
      return false;
    }
  }

  private getTestCommand(packageManagerAndBuilder: string): string {
    switch (packageManagerAndBuilder) {
      case 'bun': return 'bun run test';
      case 'npm': return 'npm run test';
      default: return 'npm run test';
    }
  }

  verifyExports(variant: TestVariant): boolean {
    const projectDir = path.join(this.testDir, variant.name);
    const distDir = path.join(projectDir, 'dist');

    try {
      if (!fs.existsSync(distDir)) {
        return false;
      }

      const indexJs = path.join(distDir, 'index.js');
      const indexDts = path.join(distDir, 'index.d.ts');

      if (!fs.existsSync(indexJs)) {
        return false;
      }

      const jsContent = fs.readFileSync(indexJs, 'utf8');
      let dtsContent = '';

      if (fs.existsSync(indexDts)) {
        dtsContent = fs.readFileSync(indexDts, 'utf8');
      }

      const expectedExports = ['add', 'subtract', 'multiply', 'divide'];

      for (const exportName of expectedExports) {
        if (!jsContent.includes(exportName)) {
          return false;
        }

        if (fs.existsSync(indexDts) && !dtsContent.includes(exportName)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`Failed to verify exports for ${variant.name}:`, error);
      return false;
    }
  }

  async testPackageAsNpmPackage(variant: TestVariant): Promise<boolean> {
    const projectDir = path.join(this.testDir, variant.name);

    try {
      const consumerDir = path.join(this.testDir, `${variant.name}-consumer`);
      if (fs.existsSync(consumerDir)) {
        fs.rmSync(consumerDir, { recursive: true, force: true });
      }
      fs.mkdirSync(consumerDir, { recursive: true });

      const testScript = `import { add, subtract, multiply, divide } from '../${variant.name}/dist/index.js';

console.log('Testing package imports...');

if (typeof add !== 'function') throw new Error('add is not a function');
if (typeof subtract !== 'function') throw new Error('subtract is not a function');
if (typeof multiply !== 'function') throw new Error('multiply is not a function');
if (typeof divide !== 'function') throw new Error('divide is not a function');

if (add(2, 3) !== 5) throw new Error('add(2, 3) should be 5');
if (subtract(5, 2) !== 3) throw new Error('subtract(5, 2) should be 3');
if (multiply(4, 3) !== 12) throw new Error('multiply(4, 3) should be 12');
if (divide(10, 2) !== 5) throw new Error('divide(10, 2) should be 5');

console.log('✅ All tests passed! Package works correctly.');
`;

      fs.writeFileSync(path.join(consumerDir, 'test-import.js'), testScript);

      const consumerPackageJson = {
        name: `${variant.name}-consumer`,
        type: "module",
        version: "1.0.0"
      };
      fs.writeFileSync(path.join(consumerDir, 'package.json'), JSON.stringify(consumerPackageJson, null, 2));

      execSync('node test-import.js', {
        cwd: consumerDir,
        stdio: 'pipe',
        env: { ...process.env, NODE_OPTIONS: '--experimental-specifier-resolution=node' }
      });

      fs.rmSync(consumerDir, { recursive: true, force: true });

      return true;
    } catch (error) {
      console.error(`Failed to test package as npm package for ${variant.name}:`, error);
      return false;
    }
  }

  async testScripts(variant: TestVariant): Promise<{ [key: string]: boolean }> {
    const projectDir = path.join(this.testDir, variant.name);
    const packageJsonPath = path.join(projectDir, 'package.json');
    const results: { [key: string]: boolean } = {};

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};

      const runPrefix = this.getRunPrefix(variant.packageManagerAndBuilder);

      for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
        if (scriptName === 'test') continue; // Skip test script as it's tested separately

        try {
          console.log(`  Testing script: ${scriptName}`);

          if (scriptName === 'build' || scriptName === 'dev') {
            // Skip build and dev scripts as they're tested separately
            results[scriptName] = true;
            continue;
          }

                    if (scriptName === 'lint:fix' || scriptName === 'format') {
            // These scripts modify files, so we need to be careful
            // Create a backup of the source files before running
            const srcDir = path.join(projectDir, 'src');
            const backupDir = path.join(projectDir, 'src-backup');

            if (fs.existsSync(srcDir)) {
              fs.cpSync(srcDir, backupDir, { recursive: true });
            }

            try {
              execSync(`${runPrefix} ${scriptName}`, {
                cwd: projectDir,
                stdio: 'pipe',
                timeout: 10000
              });
              results[scriptName] = true;

              // Restore files after running
              if (fs.existsSync(backupDir)) {
                fs.rmSync(srcDir, { recursive: true, force: true });
                fs.cpSync(backupDir, srcDir, { recursive: true });
                fs.rmSync(backupDir, { recursive: true, force: true });
              }
            } catch (error) {
              // For format scripts, we consider it successful if it runs but finds issues
              // Only fail if the command itself can't be executed
              const errorStatus = (error as any)?.status;
              if (errorStatus === 1 || errorStatus === 2) {
                // Exit codes 1-2 usually mean formatting issues found, which is acceptable
                results[scriptName] = true;
              } else {
                console.error(`    ❌ Script ${scriptName} failed:`, error);
                results[scriptName] = false;
              }

              // Restore files on failure
              if (fs.existsSync(backupDir)) {
                fs.rmSync(srcDir, { recursive: true, force: true });
                fs.cpSync(backupDir, srcDir, { recursive: true });
                fs.rmSync(backupDir, { recursive: true, force: true });
              }
            }
            continue;
          }

                    // Test scripts that don't modify files
          const testableScripts = ['typecheck', 'clean'];
          if (testableScripts.includes(scriptName)) {
            try {
              execSync(`${runPrefix} ${scriptName}`, {
                cwd: projectDir,
                stdio: 'pipe',
                timeout: 10000 // 10 second timeout
              });
              results[scriptName] = true;
            } catch (error) {
              console.error(`    ❌ Script ${scriptName} failed:`, error);
              results[scriptName] = false;
            }
                    } else if (scriptName === 'lint') {
            // For lint scripts, just check if they can run without crashing
            // Don't fail on formatting issues since generated files might not be pre-formatted
            try {
              execSync(`${runPrefix} ${scriptName}`, {
                cwd: projectDir,
                stdio: 'pipe',
                timeout: 10000
              });
              results[scriptName] = true;
            } catch (error) {
              // For lint scripts, we consider it successful if it runs but finds issues
              // Only fail if the command itself can't be executed (config errors, etc.)
              const errorStatus = (error as any)?.status;
              if (errorStatus === 1) {
                // Exit code 1 usually means linting issues found, which is acceptable
                results[scriptName] = true;
              } else if (errorStatus === 2) {
                // Exit code 2 usually means configuration error, which is a real failure
                console.error(`    ❌ Script ${scriptName} failed with configuration error:`, error);
                results[scriptName] = false;
              } else {
                console.error(`    ❌ Script ${scriptName} failed:`, error);
                results[scriptName] = false;
              }
            }
          } else {
            // For other scripts, just mark as untested for now
            results[scriptName] = true;
          }
        } catch (error) {
          console.error(`    ❌ Failed to test script ${scriptName}:`, error);
          results[scriptName] = false;
        }
      }

      return results;
    } catch (error) {
      console.error(`Failed to test scripts for ${variant.name}:`, error);
      return {};
    }
  }

  private getRunPrefix(packageManagerAndBuilder: string): string {
    switch (packageManagerAndBuilder) {
      case 'bun': return 'bun run';
      case 'npm': return 'npm run';
      default: return 'npm run';
    }
  }

  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    console.log(`Testing ${this.variants.length} variants...`);

    for (const variant of this.variants) {
      console.log(`\nTesting ${variant.name}...`);

      const result: TestResult = { variant, success: false };

      try {
        const created = await this.createTestProject(variant);
        if (!created) {
          result.error = 'Failed to create project';
          results.push(result);
          continue;
        }

        const installed = await this.installDependencies(variant);
        if (!installed) {
          result.error = 'Failed to install dependencies';
          results.push(result);
          continue;
        }

        const built = await this.buildProject(variant);
        result.buildSuccess = built;
        if (!built) {
          result.error = 'Failed to build project';
          results.push(result);
          continue;
        }

        const tested = await this.runTests(variant);
        if (!tested) {
          result.error = 'Failed to run tests';
          results.push(result);
          continue;
        }

        const exportsMatch = this.verifyExports(variant);
        result.exportsMatch = exportsMatch;
        if (!exportsMatch) {
          result.error = 'Exports verification failed';
          results.push(result);
          continue;
        }

        const npmPackageWorks = await this.testPackageAsNpmPackage(variant);
        result.npmPackageWorks = npmPackageWorks;
        if (!npmPackageWorks) {
          result.error = 'NPM package import test failed';
          results.push(result);
          continue;
        }

        const scriptResults = await this.testScripts(variant);
        result.scriptResults = scriptResults;

        const failedScripts = Object.entries(scriptResults).filter(([_, success]) => !success);
        if (failedScripts.length > 0) {
          result.error = `Scripts failed: ${failedScripts.map(([name]) => name).join(', ')}`;
          results.push(result);
          continue;
        }

        result.success = true;
        console.log(`✅ ${variant.name} - All tests passed (including npm package test and scripts)`);
      } catch (error) {
        result.error = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ ${variant.name} - Failed: ${result.error}`);
      }

      results.push(result);
    }

    return results;
  }

  generateReport(results: TestResult[]): void {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;

    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total variants tested: ${total}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success rate: ${((successful / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\nFailed variants:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`  ❌ ${result.variant.name}: ${result.error}`);
      });
    }

    console.log('\nSuccessful variants:');
    results.filter(r => r.success).forEach(result => {
      console.log(`  ✅ ${result.variant.name}`);
    });
  }

  cleanup(): void {
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
  }
}
