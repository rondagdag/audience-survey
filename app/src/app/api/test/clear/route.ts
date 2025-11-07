import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/data-store';

export const dynamic = 'force-dynamic';

/**
 * TESTING ONLY: Clear all data and reset state
 * This endpoint should only be available in development/test environments
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    // Clear in-memory data
    dataStore.setSessionsMap(new Map());
    dataStore.setSurveyResultsMap(new Map());

    return NextResponse.json({ success: true, cleared: true });
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear data' },
      { status: 500 }
    );
  }
}
