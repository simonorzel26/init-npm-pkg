import type { Versioning, Provider } from '../core/types.js';

export class VersioningProvider implements Provider<Versioning> {
  private providers: Record<string, Versioning> = {
    'release-it': {
      name: 'release-it',
      title: 'Release It',
      devDependencies: {
        'release-it': 'latest',
      },
      scripts: {
        release: 'release-it',
      },
      config: `{
  "$schema": "https://unpkg.com/release-it@19/schema/release-it.json",
  "git": {
    "commitMessage": "chore: release v\${version}",
    "tagName": "v\${version}",
    "push": true
  },
  "github": {
    "release": true
  },
  "npm": {
    "publish": true
  },
  "hooks": {
    "before:init": ["bun run build"],
    "after:bump": "echo Version bumped to \${version}"
  }
}`,
    },
  };

  get(name: string): Versioning {
    const provider = this.providers[name];
    if (!provider) {
      throw new Error(`Versioning '${name}' not found`);
    }
    return provider;
  }

  getAll(): Record<string, Versioning> {
    return { ...this.providers };
  }

  register(name: string, config: Versioning): void {
    this.providers[name] = config;
  }
}

export const versioningProvider = new VersioningProvider();
