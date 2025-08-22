#!/usr/bin/env node
import { TestGenerator } from './generator.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isTestMode = args.includes('--test') || args.includes('-t');

  console.log('🧪 Starting comprehensive test suite...\n');

  const testGenerator = new TestGenerator();

  try {
    const variants = isTestMode
      ? testGenerator.generateTestVariants()
      : testGenerator.generateAllVariants();

    console.log(`Generated ${variants.length} test variants:`);
    if (isTestMode) {
      console.log(`  Package Managers & Builders: 2 (npm, bun)`);
      console.log(`  Linter & Formatters: 2 (prettier, biome)`);
      console.log(`  Testers: 2 (vitest, bun)`);
      console.log(`  Versioning: 1 (changeset)`);
      console.log(`  Total combinations: 2 × 2 × 2 × 1 = ${variants.length} (test mode)`);
    } else {
      console.log(`  Package Managers & Builders: 2 (bun, npm)`);
      console.log(`  Linter & Formatters: 4 (biome, ultracite, eslint, prettier)`);
      console.log(`  Testers: 2 (vitest, bun)`);
      console.log(`  Versioning: 1 (changeset)`);
      console.log(`  Total combinations: 2 × 4 × 2 × 1 = ${variants.length}`);
    }
    console.log('');

    const results = await testGenerator.runAllTests();

    testGenerator.generateReport(results);

    const successful = results.filter(r => r.success).length;
    const total = results.length;

    if (successful === total) {
      console.log('\n🎉 All variants passed! The tool is working correctly for all combinations.');
      process.exit(0);
    } else {
      console.log('\n❌ Some variants failed. Please check the errors above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  } finally {
    testGenerator.cleanup();
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
