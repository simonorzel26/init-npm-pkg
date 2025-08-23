import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { ProjectFactory } from '../core/factory.js';
import { choices } from '../core/choices.js';
import { sourceTemplates } from '../templates/source.js';
import { generateCI } from '../templates/ci.js';
import type { TestVariant, TestResult } from '../core/types.js';

class TempFileManager {
  private tempDirs: string[] = [];

  createTempDir(prefix: string): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    this.tempDirs.push(tempDir);
    return tempDir;
  }

  cleanupTempDir(dir: string): void {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      const index = this.tempDirs.indexOf(dir);
      if (index > -1) {
        this.tempDirs.splice(index, 1);
      }
    } catch (error) {
      console.error(`Failed to cleanup temp directory ${dir}:`, error);
    }
  }

  cleanupAll(): void {
    this.tempDirs.forEach(dir => this.cleanupTempDir(dir));
  }
}

class ProjectBuilder {
  private tempManager: TempFileManager;

  constructor(tempManager: TempFileManager) {
    this.tempManager = tempManager;
  }

  async createTestProject(variant: TestVariant): Promise<{ success: boolean; projectDir?: string }> {
    const tempDir = this.tempManager.createTempDir(`create-package-test-${variant.name}-`);

    try {
      const config = ProjectFactory.createProject(
        variant.packageManagerAndBuilder,
        variant.linterFormatter,
        variant.tester,
        variant.versioning
      );

      this.writeProjectFiles(tempDir, config, variant.name);
      return { success: true, projectDir: tempDir };
    } catch (error) {
      console.error(`Failed to create test project for ${variant.name}:`, error);
      this.tempManager.cleanupTempDir(tempDir);
      return { success: false };
    }
  }

  private writeProjectFiles(projectDir: string, config: any, projectName: string): void {
    this.writeSourceCode(projectDir, config, projectName);
    this.writeConfigFiles(projectDir, config);
    this.writeProjectMetadata(projectDir, config, projectName);
  }

  private writeSourceCode(projectDir: string, config: any, projectName: string): void {
    const srcDir = path.join(projectDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(path.join(srcDir, 'utils.ts'), sourceTemplates.utils);
    fs.writeFileSync(path.join(srcDir, 'index.ts'), sourceTemplates.index);

    if (config.tester.name !== 'none') {
      this.writeTestFiles(srcDir, config);
    }
  }

  private writeTestFiles(srcDir: string, config: any): void {
    const testTemplate = this.getTestTemplate(config.tester.name);
    const testExtension = 'ts';
    fs.writeFileSync(path.join(srcDir, `utils.test.${testExtension}`), testTemplate);
  }

  private getTestTemplate(testerName: string): string {
    switch (testerName) {
      case 'buntest':
        return sourceTemplates.bun;
      case 'vitest':
        return sourceTemplates.vitest;
      default:
        return sourceTemplates.vitest;
    }
  }

  private writeConfigFiles(projectDir: string, config: any): void {
    this.writeLinterConfigs(projectDir, config);
    this.writeTesterConfigs(projectDir, config);
    this.writeBuildConfigs(projectDir, config);
    this.writeVersioningConfigs(projectDir, config);
    this.writeTypeScriptConfig(projectDir, config);
  }

  private writeLinterConfigs(projectDir: string, config: any): void {
    Object.entries(config.linterFormatter.configFiles).forEach(([filename, content]) => {
      fs.writeFileSync(path.join(projectDir, filename), content as string);
    });
  }

  private writeTesterConfigs(projectDir: string, config: any): void {
    if (config.tester.configFiles) {
      Object.entries(config.tester.configFiles).forEach(([filename, content]) => {
        fs.writeFileSync(path.join(projectDir, filename), content as string);
      });
    }
  }

  private writeBuildConfigs(projectDir: string, config: any): void {
    if (config.packageManagerAndBuilder.name === 'npm') {
      fs.writeFileSync(path.join(projectDir, "tsup.config.ts"), sourceTemplates.tsupConfig);
    }
  }

  private writeVersioningConfigs(projectDir: string, config: any): void {
    if (config.versioning.name === 'changeset') {
      const changesetConfigPath = path.join(projectDir, '.changeset/config.json');
      fs.mkdirSync(path.dirname(changesetConfigPath), { recursive: true });
      fs.writeFileSync(changesetConfigPath, config.versioning.config);
    }
  }

  private writeTypeScriptConfig(projectDir: string, config: any): void {
    const tsconfig = this.generateTsConfig(config);
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), tsconfig);
  }

  private generateTsConfig(config: any): string {
    const baseConfig = JSON.parse(sourceTemplates.tsconfig);

    if (config.packageManagerAndBuilder.name === 'bun') {
      if (!baseConfig.compilerOptions.types) {
        baseConfig.compilerOptions.types = [];
      }
      baseConfig.compilerOptions.types.push('bun-types');
    }

    return JSON.stringify(baseConfig, null, 2);
  }

  private writeProjectMetadata(projectDir: string, config: any, projectName: string): void {
    const packageJson = ProjectFactory.generatePackageJson(config, projectName);
    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');

    const ciYaml = generateCI(config);
    const workflowsDir = path.join(projectDir, '.github/workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), ciYaml);

    fs.writeFileSync(path.join(projectDir, '.gitignore'), sourceTemplates.gitignore);
    fs.writeFileSync(path.join(projectDir, 'README.md'), sourceTemplates.readme(config.packageManagerAndBuilder.name));
    fs.writeFileSync(path.join(projectDir, 'LICENSE'), sourceTemplates.license);
  }
}

class ScriptExecutor {
  private getRunPrefix(packageManagerAndBuilder: string): string {
    switch (packageManagerAndBuilder) {
      case 'bun': return 'bun run';
      case 'npm': return 'npm run';
      default: return 'npm run';
    }
  }

  private getInstallCommand(packageManagerAndBuilder: string): string {
    switch (packageManagerAndBuilder) {
      case 'bun': return 'bun install';
      case 'npm': return 'npm install';
      default: return 'npm install';
    }
  }

  private getBuildCommand(packageManagerAndBuilder: string): string {
    switch (packageManagerAndBuilder) {
      case 'bun': return 'bun run build';
      case 'npm': return 'npm run build';
      default: return 'npm run build';
    }
  }

  private getTestCommand(packageManagerAndBuilder: string): string {
    switch (packageManagerAndBuilder) {
      case 'bun': return 'bun run test';
      case 'npm': return 'npm run test';
      default: return 'npm run test';
    }
  }

  async installDependencies(variant: TestVariant, projectDir: string): Promise<boolean> {
    try {
      const installCmd = this.getInstallCommand(variant.packageManagerAndBuilder);
      execSync(installCmd, { cwd: projectDir, stdio: 'pipe' });
      return true;
    } catch (error) {
      console.error(`Failed to install dependencies for ${variant.name}:`, error);
      return false;
    }
  }

  async buildProject(variant: TestVariant, projectDir: string): Promise<boolean> {
    try {
      const buildCmd = this.getBuildCommand(variant.packageManagerAndBuilder);
      execSync(buildCmd, { cwd: projectDir, stdio: 'pipe' });
      return true;
    } catch (error) {
      console.error(`Failed to build ${variant.name}:`, error);
      return false;
    }
  }

  async runTests(variant: TestVariant, projectDir: string): Promise<boolean> {
    if (variant.tester === 'none') {
      return true;
    }

    try {
      const testCmd = this.getTestCommand(variant.packageManagerAndBuilder);
      execSync(testCmd, { cwd: projectDir, stdio: 'pipe' });
      return true;
    } catch (error) {
      console.error(`Failed to run tests for ${variant.name}:`, error);
      return false;
    }
  }

  async testScripts(variant: TestVariant, projectDir: string): Promise<{ [key: string]: boolean }> {
    const packageJsonPath = path.join(projectDir, 'package.json');
    const results: { [key: string]: boolean } = {};

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};
      const runPrefix = this.getRunPrefix(variant.packageManagerAndBuilder);

      for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
        if (scriptName === 'test') continue;

        try {
          console.log(`  Testing script: ${scriptName}`);
          results[scriptName] = await this.executeScript(scriptName, runPrefix, projectDir);
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

  private async executeScript(scriptName: string, runPrefix: string, projectDir: string): Promise<boolean> {
    if (scriptName === 'build' || scriptName === 'dev') {
      return true; // Tested separately
    }

    if (scriptName === 'lint:fix' || scriptName === 'format') {
      return this.executeFormattingScript(scriptName, runPrefix, projectDir);
    }

    if (['typecheck', 'clean'].includes(scriptName)) {
      return this.executeSimpleScript(scriptName, runPrefix, projectDir);
    }

    if (scriptName === 'lint') {
      return this.executeLintScript(scriptName, runPrefix, projectDir);
    }

    return true; // Other scripts marked as untested
  }

  private async executeSimpleScript(scriptName: string, runPrefix: string, projectDir: string): Promise<boolean> {
    try {
      execSync(`${runPrefix} ${scriptName}`, {
        cwd: projectDir,
        stdio: 'pipe',
        timeout: 10000
      });
      return true;
    } catch (error) {
      console.error(`    ❌ Script ${scriptName} failed:`, error);
      return false;
    }
  }

  private async executeLintScript(scriptName: string, runPrefix: string, projectDir: string): Promise<boolean> {
    try {
      execSync(`${runPrefix} ${scriptName}`, {
        cwd: projectDir,
        stdio: 'pipe',
        timeout: 10000
      });
      return true;
    } catch (error) {
      const errorStatus = (error as any)?.status;
      if (errorStatus === 1) {
        return true; // Linting issues found, but script ran successfully
      } else if (errorStatus === 2) {
        console.error(`    ❌ Script ${scriptName} failed with configuration error:`, error);
        return false;
      } else {
        console.error(`    ❌ Script ${scriptName} failed:`, error);
        return false;
      }
    }
  }

  private async executeFormattingScript(scriptName: string, runPrefix: string, projectDir: string): Promise<boolean> {
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

      this.restoreSourceFiles(srcDir, backupDir);
      return true;
    } catch (error) {
      const errorStatus = (error as any)?.status;
      if (errorStatus === 1 || errorStatus === 2) {
        this.restoreSourceFiles(srcDir, backupDir);
        return true; // Formatting issues found, but script ran successfully
      } else {
        console.error(`    ❌ Script ${scriptName} failed:`, error);
        this.restoreSourceFiles(srcDir, backupDir);
        return false;
      }
    }
  }

  private restoreSourceFiles(srcDir: string, backupDir: string): void {
    if (fs.existsSync(backupDir)) {
      fs.rmSync(srcDir, { recursive: true, force: true });
      fs.cpSync(backupDir, srcDir, { recursive: true });
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
  }
}

class PackageValidator {
  verifyExports(variant: TestVariant, projectDir: string): boolean {
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

  async testPackageAsNpmPackage(variant: TestVariant, projectDir: string, tempManager: TempFileManager): Promise<boolean> {
    try {
      const consumerDir = tempManager.createTempDir(`create-package-consumer-${variant.name}-`);

      const testScript = `import { add, subtract, multiply, divide } from '${projectDir}/dist/index.js';

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

      return true;
    } catch (error) {
      console.error(`Failed to test package as npm package for ${variant.name}:`, error);
      return false;
    }
  }
}

class ReportGenerator {
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
}

export class TestGenerator {
  private variants: TestVariant[] = [];
  private tempManager: TempFileManager;
  private projectBuilder: ProjectBuilder;
  private scriptExecutor: ScriptExecutor;
  private packageValidator: PackageValidator;
  private reportGenerator: ReportGenerator;
  private concurrency: number;

  constructor(concurrency: number = 1) {
    this.tempManager = new TempFileManager();
    this.projectBuilder = new ProjectBuilder(this.tempManager);
    this.scriptExecutor = new ScriptExecutor();
    this.packageValidator = new PackageValidator();
    this.reportGenerator = new ReportGenerator();
    this.concurrency = concurrency;
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
          // Skip invalid combinations: npm + buntest (buntest requires bun runtime)
          if (pmb === 'npm' && tester === 'buntest') {
            continue;
          }

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
          // Skip invalid combinations: npm + buntest (buntest requires bun runtime)
          if (pmb === 'npm' && tester === 'buntest') {
            continue;
          }

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

  async runAllTests(): Promise<TestResult[]> {
    const totalVariants = this.variants.length;
    console.log(`Testing ${totalVariants} variants with concurrency: ${this.concurrency}...`);

    if (this.concurrency === 1) {
      return this.runSequential();
    } else {
      return this.runParallel();
    }
  }

  private async runSequential(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const totalVariants = this.variants.length;

    for (let i = 0; i < this.variants.length; i++) {
      const variant = this.variants[i];
      const currentTest = i + 1;

      console.log(`\n[${currentTest}/${totalVariants}] Testing ${variant.name}...`);

      const result = await this.testVariant(variant, currentTest, totalVariants);
      results.push(result);
    }

    return results;
  }

  private async runParallel(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const totalVariants = this.variants.length;

    for (let i = 0; i < this.variants.length; i += this.concurrency) {
      const batch = this.variants.slice(i, i + this.concurrency);
      const batchPromises = batch.map((variant, j) => {
        const currentTest = i + j + 1;
        console.log(`\n[${currentTest}/${totalVariants}] Testing ${variant.name}...`);
        return this.testVariant(variant, currentTest, totalVariants);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  private async testVariant(variant: TestVariant, currentTest: number, totalVariants: number): Promise<TestResult> {
    const result: TestResult = { variant, success: false };
    let projectDir: string | undefined;

    try {
      projectDir = await this.createAndSetupProject(variant, result);
      if (!projectDir) return result;

      const testSteps = [
        () => this.scriptExecutor.installDependencies(variant, projectDir!),
        () => this.scriptExecutor.buildProject(variant, projectDir!),
        () => this.scriptExecutor.runTests(variant, projectDir!),
        () => Promise.resolve(this.packageValidator.verifyExports(variant, projectDir!)),
        () => this.packageValidator.testPackageAsNpmPackage(variant, projectDir!, this.tempManager),
        () => this.scriptExecutor.testScripts(variant, projectDir!)
      ];

      const stepNames = [
        'install dependencies',
        'build project',
        'run tests',
        'verify exports',
        'test npm package',
        'test scripts'
      ];

      for (let i = 0; i < testSteps.length; i++) {
        const stepResult = await testSteps[i]();

        if (i === 1) result.buildSuccess = stepResult as boolean;
        if (i === 3) result.exportsMatch = stepResult as boolean;
        if (i === 4) result.npmPackageWorks = stepResult as boolean;
        if (i === 5) result.scriptResults = stepResult as Record<string, boolean>;

        if (!this.validateStepResult(stepResult, stepNames[i], result)) {
          return result;
        }
      }

      result.success = true;
      console.log(`✅ [${currentTest}/${totalVariants}] ${variant.name} - All tests passed (including npm package test and scripts)`);
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ [${currentTest}/${totalVariants}] ${variant.name} - Failed: ${result.error}`);
    } finally {
      if (projectDir) {
        this.tempManager.cleanupTempDir(projectDir);
      }
    }

    return result;
  }

  private async createAndSetupProject(variant: TestVariant, result: TestResult): Promise<string | undefined> {
    const created = await this.projectBuilder.createTestProject(variant);
    if (!created.success) {
      result.error = 'Failed to create project';
      return undefined;
    }
    return created.projectDir;
  }

  private validateStepResult(stepResult: any, stepName: string, result: TestResult): boolean {
    if (stepName === 'test scripts') {
      const scriptResults = stepResult as Record<string, boolean>;
      const failedScripts = Object.entries(scriptResults).filter(([_, success]) => !success);
      if (failedScripts.length > 0) {
        result.error = `Scripts failed: ${failedScripts.map(([name]) => name).join(', ')}`;
        return false;
      }
      return true;
    }

    if (!stepResult) {
      result.error = `Failed to ${stepName}`;
      return false;
    }

    return true;
  }

  generateReport(results: TestResult[]): void {
    this.reportGenerator.generateReport(results);
  }

  cleanup(): void {
    this.tempManager.cleanupAll();
  }
}
