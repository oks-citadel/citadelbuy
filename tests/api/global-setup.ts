/**
 * Global Setup for API Integration Tests
 *
 * Runs once before all tests to ensure the API is ready.
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const MAX_RETRIES = 30;
const RETRY_DELAY = 1000;

async function waitForApi(): Promise<void> {
  console.log(`Waiting for API at ${API_BASE_URL}...`);

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (response.ok) {
        console.log('API is ready!');
        return;
      }
    } catch (error) {
      // API not ready yet
    }

    console.log(`Attempt ${i + 1}/${MAX_RETRIES} - API not ready, retrying...`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
  }

  throw new Error(`API at ${API_BASE_URL} did not become ready within ${MAX_RETRIES * RETRY_DELAY / 1000} seconds`);
}

async function seedTestData(): Promise<void> {
  // Optionally seed test data here
  // This runs once before all tests
  console.log('Test data seeding (if needed)...');
}

module.exports = async function globalSetup(): Promise<void> {
  console.log('\n========================================');
  console.log('API Integration Tests - Global Setup');
  console.log('========================================\n');

  await waitForApi();
  await seedTestData();

  console.log('\nGlobal setup complete!\n');
};
