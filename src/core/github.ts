import { execSync } from "node:child_process";

export interface GitHubConfig {
  username: string;
  createRepo: boolean;
}

export class GitHubService {
  static detectUsername(): string | null {
    try {
      // Try to get GitHub username from git config
      const gitUser = execSync('git config --global user.name', { encoding: 'utf8', stdio: 'pipe' }).trim();
      const gitEmail = execSync('git config --global user.email', { encoding: 'utf8', stdio: 'pipe' }).trim();

      // Try to extract username from email (common pattern: username@github.com)
      if (gitEmail.includes('@github.com')) {
        return gitEmail.split('@')[0];
      }

      // Try to get from git remote if in a repo
      try {
        const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8', stdio: 'pipe' }).trim();
        const match = remoteUrl.match(/github\.com[:/]([^/]+)/);
        if (match) {
          return match[1];
        }
      } catch {
        // Not in a git repo or no remote
      }

      return gitUser || null;
    } catch {
      return null;
    }
  }

  static initializeGitRepo(projectDir: string): boolean {
    try {
      console.log(`\n🔧 Initializing git repository...`);
      execSync('git init', { cwd: projectDir, stdio: 'pipe' });

      // Set the default branch to 'main' (works with git 2.28+)
      try {
        execSync('git branch -M main', { cwd: projectDir, stdio: 'pipe' });
      } catch {
        // Fallback for older git versions - create and switch to main branch
        execSync('git checkout -b main', { cwd: projectDir, stdio: 'pipe' });
      }

      execSync('git add .', { cwd: projectDir, stdio: 'pipe' });
      execSync('git commit -m "Initial commit: Generated with create-package"', { cwd: projectDir, stdio: 'pipe' });
      console.log(`✅ Git repository initialized with initial commit on main branch`);
      return true;
    } catch (error) {
      console.log(`⚠️  Failed to initialize git repository: ${error}`);
      return false;
    }
  }

  static getRemoteUrl(username: string, projectName: string): string {
    return `https://github.com/${username}/${projectName}.git`;
  }

  static getRepositoryUrl(username: string, projectName: string): string {
    return `https://github.com/${username}/${projectName}`;
  }

  static getIssuesUrl(username: string, projectName: string): string {
    return `https://github.com/${username}/${projectName}/issues`;
  }
}
