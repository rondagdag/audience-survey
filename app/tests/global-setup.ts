import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * Global setup runs once before all tests.
 * Clears persisted session data to ensure clean test state.
 */
export default async function globalSetup() {
  const dataDir = join(process.cwd(), 'data');
  const sessionsFile = join(dataDir, 'sessions.json');
  const resultsFile = join(dataDir, 'survey-results.json');

  // Delete persisted data files if they exist
  if (existsSync(sessionsFile)) {
    unlinkSync(sessionsFile);
    console.log('✓ Cleared data/sessions.json');
  }

  if (existsSync(resultsFile)) {
    unlinkSync(resultsFile);
    console.log('✓ Cleared data/survey-results.json');
  }

  // Also clear the in-memory data via API endpoint if server is running
  try {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseURL}/api/test/clear`, {
      method: 'POST',
    });
    if (response.ok) {
      console.log('✓ Cleared in-memory data via API');
    }
  } catch (error) {
    // Server might not be running yet, that's okay
    console.log('⚠ Could not clear in-memory data (server not ready yet)');
  }

  console.log('✓ Global test setup complete');
}
