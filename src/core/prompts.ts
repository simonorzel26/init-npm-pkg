import prompts from "prompts";
import type { PromptObject } from "prompts";
import { choices, getChoiceDescriptions, defaultChoices } from "./choices.js";
import { GitHubService } from "./github.js";

export interface ProjectConfig {
  projectName: string;
  packageManagerAndBuilder: string;
  linterFormatter: string;
  tester: string;
  createGitRepo: boolean;
  runInstall: boolean;
}

export class PromptsService {
  static async getProjectConfig(): Promise<ProjectConfig> {
    const envProjectName = process.env.CREATE_PACKAGE_NAME;
    const envPackageManager = process.env.CREATE_PACKAGE_PM;
    const envLinterFormatter = process.env.CREATE_PACKAGE_FORMATTER;

    const projectName = await this.getProjectName(envProjectName);
    const packageManagerAndBuilder = await this.getPackageManagerAndBuilder(envPackageManager);
    const linterFormatter = await this.getLinterFormatter(envLinterFormatter);
    const tester = await this.getTester();
    const createGitRepo = await this.getGitRepoCreation();
    const runInstall = await this.getRunInstall();

    return {
      projectName,
      packageManagerAndBuilder,
      linterFormatter,
      tester,
      createGitRepo,
      runInstall,
    };
  }

  private static async getProjectName(envProjectName?: string): Promise<string> {
    if (typeof envProjectName === "string" && envProjectName.length > 0) {
      return envProjectName;
    }

    const projectNameQuestion: PromptObject<'projectName'> = {
      type: "text",
      name: "projectName",
      message: "Project name:",
      initial: "my-lib",
    };

    const projectNameAnswers = await prompts(projectNameQuestion);
    const value = projectNameAnswers.projectName;

    if (typeof value !== "string" || value.length === 0) {
      console.error("Project name is required");
      process.exit(1);
    }

    return value;
  }

  private static async getPackageManagerAndBuilder(envPackageManager?: string): Promise<string> {
    if (envPackageManager && Object.keys(choices.packageManagerAndBuilders).includes(envPackageManager)) {
      return envPackageManager;
    }

    const descriptions = getChoiceDescriptions();
    const pmbQuestion: PromptObject<'packageManagerAndBuilder'> = {
      type: "select",
      name: "packageManagerAndBuilder",
      message: "Package Manager & Builder:",
      choices: descriptions.packageManagerAndBuilders,
      initial: descriptions.packageManagerAndBuilders.findIndex(c => c.value === defaultChoices.packageManagerAndBuilder),
    };

    const answer = await prompts(pmbQuestion);
    return answer.packageManagerAndBuilder as string;
  }

  private static async getLinterFormatter(envLinterFormatter?: string): Promise<string> {
    if (envLinterFormatter && Object.keys(choices.linterFormatters).includes(envLinterFormatter)) {
      return envLinterFormatter;
    }

    const descriptions = getChoiceDescriptions();
    const lfQuestion: PromptObject<'linterFormatter'> = {
      type: "select",
      name: "linterFormatter",
      message: "Linter & Formatter:",
      choices: descriptions.linterFormatters,
      initial: descriptions.linterFormatters.findIndex(c => c.value === defaultChoices.linterFormatter),
    };

    const answer = await prompts(lfQuestion);
    return answer.linterFormatter as string;
  }

  private static async getTester(): Promise<string> {
    const descriptions = getChoiceDescriptions();
    const testerQuestion: PromptObject<'tester'> = {
      type: "select",
      name: "tester",
      message: "Testing Framework:",
      choices: descriptions.testers,
      initial: descriptions.testers.findIndex(c => c.value === defaultChoices.tester),
    };

    const answer = await prompts(testerQuestion);
    return answer.tester as string;
  }



  private static async getGitRepoCreation(): Promise<boolean> {
    const gitRepoQuestion: PromptObject<'createGitRepo'> = {
      type: "confirm",
      name: "createGitRepo",
      message: "Initialize git repository and create initial commit?",
      initial: true,
    };

    const answer = await prompts(gitRepoQuestion);
    return answer.createGitRepo;
  }

  private static async getRunInstall(): Promise<boolean> {
    const runInstallQuestion: PromptObject<'runInstall'> = {
      type: "confirm",
      name: "runInstall",
      message: "Run package manager install after creation?",
      initial: true,
    };

    const answer = await prompts(runInstallQuestion);
    return answer.runInstall;
  }
}
