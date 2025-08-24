import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { ProjectFactory } from "./factory.js";
import { sourceTemplates } from "../templates/source.js";
import { generateCI } from "../templates/ci.js";
import { GitHubService } from "./github.js";
import type { ProjectConfig } from "./prompts.js";

export class ProjectGenerator {
  static async generateProject(config: ProjectConfig): Promise<void> {
    const workingDirectory = process.cwd();
    const targetProjectDirectory = path.resolve(workingDirectory, config.projectName);

    if (fs.existsSync(targetProjectDirectory)) {
      console.error(`Directory ${config.projectName} already exists`);
      process.exit(1);
    }

    const projectConfig = ProjectFactory.createProject(
      config.packageManagerAndBuilder,
      config.linterFormatter,
      config.tester,
      'release-it'
    );

    try {
      fs.mkdirSync(targetProjectDirectory, { recursive: true });

      this.writeProjectFiles(targetProjectDirectory, projectConfig, config);
      this.initializeGitRepo(targetProjectDirectory, config);
      this.runInstall(targetProjectDirectory, config);
      this.displayNextSteps(projectConfig, config);
    } catch (error) {
      // Clean up the created directory if any error occurs
      console.error('\n❌ Error occurred during project creation:', error);
      console.log(`🧹 Cleaning up ${config.projectName} directory...`);

      try {
        fs.rmSync(targetProjectDirectory, { recursive: true, force: true });
        console.log('✅ Cleanup completed');
      } catch (cleanupError) {
        console.error('⚠️  Failed to cleanup directory:', cleanupError);
        console.log(`   You may need to manually remove the ${config.projectName} directory`);
      }

      process.exit(1);
    }
  }

  private static writeProjectFiles(projectDir: string, projectConfig: any, userConfig: ProjectConfig): void {
    this.writePackageJson(projectDir, projectConfig, userConfig);
    this.writeConfigFiles(projectDir, projectConfig);
    this.writeSourceFiles(projectDir, userConfig.projectName, projectConfig);
    this.writeProjectMetadata(projectDir, projectConfig, userConfig);
  }

  private static writePackageJson(projectDir: string, projectConfig: any, userConfig: ProjectConfig): void {
    const packageJsonPath = path.join(projectDir, "package.json");
    const githubUsername = userConfig.createGitRepo ? (GitHubService.detectUsername() || "yourusername") : "yourusername";
    const packageJson = ProjectFactory.generatePackageJson(projectConfig, userConfig.projectName, githubUsername);
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  }

  private static writeConfigFiles(projectDir: string, projectConfig: any): void {
    // Write linter configs
    Object.entries(projectConfig.linterFormatter.configFiles).forEach(([filename, content]) => {
      fs.writeFileSync(path.join(projectDir, filename), content as string);
    });

    // Write tester configs
    if (projectConfig.tester.configFiles) {
      Object.entries(projectConfig.tester.configFiles).forEach(([filename, content]) => {
        fs.writeFileSync(path.join(projectDir, filename), content as string);
      });
    }

    // Write build configs
    if (projectConfig.packageManagerAndBuilder.name === 'npm') {
      fs.writeFileSync(path.join(projectDir, "tsup.config.ts"), sourceTemplates.tsupConfig);
    }

    // Write versioning configs
    if (projectConfig.versioning.name === 'release-it') {
      const releaseItConfigPath = path.join(projectDir, '.release-it.json');
      fs.writeFileSync(releaseItConfigPath, projectConfig.versioning.config);
    }

    // Write TypeScript config
    const tsconfig = this.generateTsConfig(projectConfig);
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), tsconfig);
  }

  private static writeSourceFiles(projectDir: string, projectName: string, projectConfig: any): void {
    const srcDir = path.join(projectDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(path.join(srcDir, 'utils.ts'), sourceTemplates.utils);
    fs.writeFileSync(path.join(srcDir, 'index.ts'), sourceTemplates.index);

    if (projectConfig.tester.name !== 'none') {
      this.writeTestFiles(srcDir, projectConfig);
    }
  }

  private static writeTestFiles(srcDir: string, projectConfig: any): void {
    const testTemplate = this.getTestTemplate(projectConfig.tester.name);
    const testExtension = 'ts';
    fs.writeFileSync(path.join(srcDir, `utils.test.${testExtension}`), testTemplate);
  }

  private static getTestTemplate(testerName: string): string {
    switch (testerName) {
      case 'buntest':
        return sourceTemplates.bun;
      case 'vitest':
        return sourceTemplates.vitest;
      default:
        return sourceTemplates.vitest;
    }
  }

  private static writeProjectMetadata(projectDir: string, projectConfig: any, userConfig: ProjectConfig): void {
    const ciYaml = generateCI(projectConfig);
    const workflowsDir = path.join(projectDir, '.github/workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), ciYaml);

    fs.writeFileSync(path.join(projectDir, '.gitignore'), sourceTemplates.gitignore);
    fs.writeFileSync(path.join(projectDir, 'README.md'), sourceTemplates.readme(projectConfig.packageManagerAndBuilder.name));
    fs.writeFileSync(path.join(projectDir, 'LICENSE'), sourceTemplates.license);
  }

  private static generateTsConfig(projectConfig: any): string {
    const baseConfig = JSON.parse(sourceTemplates.tsconfig);

    if (projectConfig.packageManagerAndBuilder.name === 'bun') {
      if (!baseConfig.compilerOptions.types) {
        baseConfig.compilerOptions.types = [];
      }
      baseConfig.compilerOptions.types.push('bun-types');
    }

    return JSON.stringify(baseConfig, null, 2);
  }

  private static initializeGitRepo(projectDir: string, userConfig: ProjectConfig): void {
    if (userConfig.createGitRepo) {
      GitHubService.initializeGitRepo(projectDir);
    }
  }

    private static runInstall(projectDir: string, userConfig: ProjectConfig): void {
    if (userConfig.runInstall) {
      const installCmd = userConfig.packageManagerAndBuilder === 'bun' ? 'bun install' : 'npm install';

      console.log(`\nRunning ${installCmd}...`);
      try {
        // Add timeout and better error handling
        const result = execSync(installCmd, {
          cwd: projectDir,
          stdio: 'inherit',
          timeout: 60000 // 60 second timeout
        });
        console.log('✅ Dependencies installed successfully!');
      } catch (error: any) {
        if (error.signal === 'SIGTERM') {
          console.log('⚠️  Install timed out, but dependencies may have been installed successfully.');
          console.log('   You can verify by running the install command manually.');
        } else {
          console.error('❌ Failed to install dependencies:', error.message);
        }
      }
    }
  }

  private static displayNextSteps(projectConfig: any, userConfig: ProjectConfig): void {
    console.log(`\nCreated ${userConfig.projectName} with:`);
    console.log(`  Package Manager & Builder: ${projectConfig.packageManagerAndBuilder.title}`);
    console.log(`  Linter & Formatter: ${projectConfig.linterFormatter.title}`);
    console.log(`  Testing: ${projectConfig.tester.title}`);
    console.log(`  Versioning: ${projectConfig.versioning.title}`);

    console.log("\nNext steps:");
    console.log(`  cd ${userConfig.projectName}`);
    if (!userConfig.runInstall) {
      console.log(`  ${projectConfig.packageManagerAndBuilder.installCmd}`);
    }
    console.log(`  ${projectConfig.packageManagerAndBuilder.runPrefix} build`);
    console.log(`  ${projectConfig.packageManagerAndBuilder.runPrefix} test`);

    if (userConfig.createGitRepo) {
      const githubUsername = GitHubService.detectUsername() || "yourusername";
      console.log(`\n📦 To publish to GitHub:`);
      console.log(`  1. Create a new repository on GitHub:`);
      console.log(`     • Go to https://github.com/new`);
      console.log(`     • Repository name: ${userConfig.projectName}`);
      console.log(`     • Choose public or private`);
      console.log(`     • Don't initialize with README (we already have one)`);
      console.log(`  2. Connect and push your local repository:`);
      console.log(`     git remote add origin ${GitHubService.getRemoteUrl(githubUsername, userConfig.projectName)}`);
      console.log(`     git push -u origin main`);
      console.log(`\n💡 Tip: You can also use GitHub CLI if you have it installed:`);
      console.log(`     gh repo create ${userConfig.projectName} --public --source=. --remote=origin --push`);
    }
  }
}
