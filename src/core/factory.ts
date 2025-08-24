import type { ProjectConfig } from './types.js';
import { packageManagerProvider } from '../providers/package-managers.js';
import { linterProvider } from '../providers/linters.js';
import { testerProvider } from '../providers/testers.js';
import { versioningProvider } from '../providers/versioning.js';

export class ProjectFactory {
  static createProject(
    packageManagerAndBuilderName: string,
    linterFormatterName: string,
    testerName: string = 'vitest',
    versioningName: string = 'release-it'
  ): ProjectConfig {
    const packageManagerAndBuilder = packageManagerProvider.get(packageManagerAndBuilderName);
    const linterFormatter = linterProvider.get(linterFormatterName);
    const tester = testerProvider.get(testerName);
    const versioning = versioningProvider.get(versioningName);

    return {
      packageManagerAndBuilder,
      linterFormatter,
      tester,
      versioning,
    };
  }

  static validateProject(
    packageManagerAndBuilderName: string,
    linterFormatterName: string,
    testerName: string = 'vitest',
    versioningName: string = 'release-it'
  ): void {
    packageManagerProvider.get(packageManagerAndBuilderName);
    linterProvider.get(linterFormatterName);
    testerProvider.get(testerName);
    versioningProvider.get(versioningName);
  }

  static generatePackageJson(config: ProjectConfig, projectName: string, githubUsername: string = "yourusername"): Record<string, any> {
    const allDevDependencies = {
      ...config.packageManagerAndBuilder.devDependencies,
      ...config.linterFormatter.devDependencies,
      ...config.tester.devDependencies,
      ...config.versioning.devDependencies,
    };

    const allScripts = {
      ...config.packageManagerAndBuilder.scripts,
      ...config.linterFormatter.scripts,
      ...config.tester.scripts,
      ...config.versioning.scripts,
    };

    return {
      name: projectName,
      version: "1.0.0",
      description: "A TypeScript package",
      keywords: ["typescript", "package"],
      homepage: `https://github.com/${githubUsername}/${projectName}`,
      bugs: {
        url: `https://github.com/${githubUsername}/${projectName}/issues`
      },
      author: "",
      repository: {
        type: "git",
        url: `git+https://github.com/${githubUsername}/${projectName}.git`
      },
      files: ["dist"],
      type: "module",
      main: "dist/index.js",
      types: "dist/index.d.ts",
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
          default: "./dist/index.js"
        },
      },
      scripts: allScripts,
      devDependencies: allDevDependencies,
      license: "MIT",
    };
  }
}
