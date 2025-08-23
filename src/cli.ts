#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import prompts from "prompts";
import type { PromptObject } from "prompts";
import { choices, getChoiceDescriptions, defaultChoices } from "./core/choices.js";
import { ProjectFactory } from "./core/factory.js";
import { sourceTemplates } from "./templates/source.js";
import { generateCI } from "./templates/ci.js";

async function main(): Promise<void> {
  const envProjectName = process.env.CREATE_PACKAGE_NAME;
  const envPackageManager = process.env.CREATE_PACKAGE_PM;
  const envLinterFormatter = process.env.CREATE_PACKAGE_FORMATTER;

  const projectNameQuestion: PromptObject<'projectName'> = {
    type: "text",
    name: "projectName",
    message: "Project name:",
    initial: "my-lib",
  };

  let projectName: string;
  if (typeof envProjectName === "string" && envProjectName.length > 0) {
    projectName = envProjectName;
  } else {
    const projectNameAnswers = await prompts(projectNameQuestion);
    const value = projectNameAnswers.projectName;
    if (typeof value !== "string" || value.length === 0) {
      console.error("Project name is required");
      process.exit(1);
      return;
    }
    projectName = value;
  }

  const descriptions = getChoiceDescriptions();

  const pmbQuestion: PromptObject<'packageManagerAndBuilder'> = {
    type: "select",
    name: "packageManagerAndBuilder",
    message: "Package Manager & Builder:",
    choices: descriptions.packageManagerAndBuilders,
    initial: descriptions.packageManagerAndBuilders.findIndex(c => c.value === defaultChoices.packageManagerAndBuilder),
  };

  const resolvedPackageManagerAndBuilder = envPackageManager && Object.keys(choices.packageManagerAndBuilders).includes(envPackageManager)
    ? envPackageManager
    : (await prompts(pmbQuestion)).packageManagerAndBuilder as string;

  const lfQuestion: PromptObject<'linterFormatter'> = {
    type: "select",
    name: "linterFormatter",
    message: "Linter & Formatter:",
    choices: descriptions.linterFormatters,
    initial: descriptions.linterFormatters.findIndex(c => c.value === defaultChoices.linterFormatter),
  };

  const resolvedLinterFormatter = envLinterFormatter && Object.keys(choices.linterFormatters).includes(envLinterFormatter)
    ? envLinterFormatter
    : (await prompts(lfQuestion)).linterFormatter as string;

  const testerQuestion: PromptObject<'tester'> = {
    type: "select",
    name: "tester",
    message: "Testing Framework:",
    choices: descriptions.testers,
    initial: descriptions.testers.findIndex(c => c.value === defaultChoices.tester),
  };

  const resolvedTester = (await prompts(testerQuestion)).tester as string;

  const resolvedVersioning = 'changeset';

  const workingDirectory = process.cwd();
  const targetProjectDirectory = path.resolve(workingDirectory, projectName);
  if (fs.existsSync(targetProjectDirectory)) {
    console.error(`Directory ${projectName} already exists`);
    process.exit(1);
  }

  const config = ProjectFactory.createProject(
    resolvedPackageManagerAndBuilder,
    resolvedLinterFormatter,
    resolvedTester,
    resolvedVersioning
  );

  fs.mkdirSync(targetProjectDirectory, { recursive: true });

  const packageJsonPath = path.join(targetProjectDirectory, "package.json");
  const packageJson = ProjectFactory.generatePackageJson(config, projectName);
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  const ciYaml = generateCI(config);
  const workflowsDir = path.join(targetProjectDirectory, ".github/workflows");
  fs.mkdirSync(workflowsDir, { recursive: true });
  fs.writeFileSync(path.join(workflowsDir, "ci.yml"), ciYaml);

  writeConfigFiles(targetProjectDirectory, config);
  writeSourceFiles(targetProjectDirectory, projectName, config);

  console.log(`\nCreated ${projectName} with:`);
  console.log(`  Package Manager & Builder: ${config.packageManagerAndBuilder.title}`);
  console.log(`  Linter & Formatter: ${config.linterFormatter.title}`);
  console.log(`  Testing: ${config.tester.title}`);
  console.log(`  Versioning: ${config.versioning.title}`);
  console.log("\nNext steps:");
  console.log(`  cd ${projectName}`);
  console.log(`  ${config.packageManagerAndBuilder.installCmd}`);
  console.log(`  ${config.packageManagerAndBuilder.runPrefix} build`);
  console.log(`  ${config.packageManagerAndBuilder.runPrefix} test`);
}

function writeConfigFiles(projectDir: string, config: any): void {
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

  // Generate TypeScript configuration based on package manager and tester
  const tsconfig = generateTsConfig(config);
  fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), tsconfig);
  fs.writeFileSync(path.join(projectDir, '.gitignore'), sourceTemplates.gitignore);
  fs.writeFileSync(path.join(projectDir, 'README.md'), sourceTemplates.readme(config.packageManagerAndBuilder.name));
  fs.writeFileSync(path.join(projectDir, 'LICENSE'), sourceTemplates.license);
}

function generateTsConfig(config: any): string {
  const baseConfig = JSON.parse(sourceTemplates.tsconfig);

  // Add Bun types only if using Bun package manager (which includes bun-types dependency)
  if (config.packageManagerAndBuilder.name === 'bun') {
    if (!baseConfig.compilerOptions.types) {
      baseConfig.compilerOptions.types = [];
    }
    baseConfig.compilerOptions.types.push('bun-types');
  }

  return JSON.stringify(baseConfig, null, 2);
}

function writeSourceFiles(projectDir: string, projectName: string, config: any): void {
  const srcDir = path.join(projectDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(path.join(srcDir, 'utils.ts'), sourceTemplates.utils);
  fs.writeFileSync(path.join(srcDir, 'index.ts'), sourceTemplates.index);

  // Only create test files if tester is not 'none'
  if (config.tester.name !== 'none') {
    let testTemplate;
    let testExtension;
    switch (config.tester.name) {
      case 'buntest':
        testTemplate = sourceTemplates.bun;
        testExtension = 'ts';
        break;
      case 'vitest':
        testTemplate = sourceTemplates.vitest;
        testExtension = 'ts';
        break;
      default:
        testTemplate = sourceTemplates.vitest;
        testExtension = 'ts';
        break;
    }
    fs.writeFileSync(path.join(srcDir, `utils.test.${testExtension}`), testTemplate);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
