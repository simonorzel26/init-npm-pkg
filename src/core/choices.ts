import { packageManagerProvider } from '../providers/package-managers.js';
import { linterProvider } from '../providers/linters.js';
import { testerProvider } from '../providers/testers.js';
import { versioningProvider } from '../providers/versioning.js';

export const choices = {
  packageManagerAndBuilders: packageManagerProvider.getAll(),
  linterFormatters: linterProvider.getAll(),
  testers: testerProvider.getAll(),
  versioning: versioningProvider.getAll(),
} as const;

export const defaultChoices = {
  packageManagerAndBuilder: 'bun',
  linterFormatter: 'biome',
  tester: 'buntest',
} as const;

export const availableChoices = {
  packageManagerAndBuilders: Object.keys(choices.packageManagerAndBuilders),
  linterFormatters: Object.keys(choices.linterFormatters),
  testers: Object.keys(choices.testers),
  versioning: Object.keys(choices.versioning),
} as const;

export function getChoiceDescriptions() {
  return {
    packageManagerAndBuilders: Object.entries(choices.packageManagerAndBuilders).map(([key, value]) => ({
      title: value.title,
      value: key,
    })),
    linterFormatters: Object.entries(choices.linterFormatters).map(([key, value]) => ({
      title: value.title,
      value: key,
    })),
    testers: Object.entries(choices.testers).map(([key, value]) => ({
      title: value.title,
      value: key,
    })),
    versioning: Object.entries(choices.versioning).map(([key, value]) => ({
      title: value.title,
      value: key,
    })),
  };
}
