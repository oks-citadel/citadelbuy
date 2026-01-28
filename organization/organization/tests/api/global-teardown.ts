/**
 * Global Teardown for API Integration Tests
 *
 * Runs once after all tests to clean up.
 */

async function cleanupTestData(): Promise<void> {
  // Optionally clean up test data here
  // This runs once after all tests
  console.log('Test data cleanup (if needed)...');
}

module.exports = async function globalTeardown(): Promise<void> {
  console.log('\n========================================');
  console.log('API Integration Tests - Global Teardown');
  console.log('========================================\n');

  await cleanupTestData();

  console.log('Global teardown complete!\n');
};
