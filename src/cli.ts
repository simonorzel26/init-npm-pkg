#!/usr/bin/env node
import { PromptsService } from "./core/prompts.js";
import { ProjectGenerator } from "./core/project-generator.js";

async function main(): Promise<void> {
  try {
    const config = await PromptsService.getProjectConfig();
    await ProjectGenerator.generateProject(config);
  } catch (error) {
    console.error('Failed to create project:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
