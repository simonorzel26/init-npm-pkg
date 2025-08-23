import type { Versioning, Provider } from '../core/types.js';

export class VersioningProvider implements Provider<Versioning> {
  private providers: Record<string, Versioning> = {
    changeset: {
      name: 'changeset',
      title: 'Changesets',
      devDependencies: {
        '@changesets/cli': 'latest',
      },
      scripts: {
        changeset: 'changeset',
        version: 'changeset version',
        release: 'changeset publish',
        'local-release': 'changeset version && changeset publish',
      },
      config: `{
  "$schema": "https://unpkg.com/@changesets/config@2.3.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
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
