import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/data-store';

export const dynamic = 'force-dynamic';

// Load data on first API call
let dataLoaded = false;

async function ensureDataLoaded() {
  if (dataLoaded) return;
  
  try {
    const { FilePersistence } = require('@/lib/persistence');
    const persistence = new FilePersistence();
    const sessions = await persistence.loadSessions();
    const results = await persistence.loadResults();
    dataStore.setSessionsMap(sessions);
    dataStore.setSurveyResultsMap(results);
    dataLoaded = true;
  } catch (error) {
    console.warn('File persistence not available:', error);
    dataLoaded = true; // Don't try again
  }
}

// Helper to save data after modifications
async function saveData() {
  try {
    const { FilePersistence } = require('@/lib/persistence');
    const persistence = new FilePersistence();
    await persistence.saveAll(dataStore.getSessionsMap(), dataStore.getSurveyResultsMap());
  } catch (error) {
    // Silent fail - persistence is optional
  }
}

// GET /api/sessions - List all sessions
export async function GET() {
  try {
    await ensureDataLoaded();
    const sessions = dataStore.getAllSessions();
    const activeSession = dataStore.getActiveSession();

    return NextResponse.json({
      success: true,
      sessions,
      activeSession,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, adminSecret } = body;

    // Verify admin secret
    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret || adminSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session name is required' },
        { status: 400 }
      );
    }

    const session = dataStore.createSession(name.trim());
    await saveData();

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// PATCH /api/sessions - Close active session
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, adminSecret } = body;

    // Verify admin secret
    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret || adminSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = dataStore.closeSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    await saveData();

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Error closing session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to close session' },
      { status: 500 }
    );
  }
}

// PUT /api/sessions - Reactivate a session
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, adminSecret } = body;

    // Verify admin secret
    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret || adminSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = dataStore.reactivateSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    await saveData();

    return NextResponse.json({
      success: true,
      session,
      message: 'Session reactivated successfully',
    });
  } catch (error) {
    console.error('Error reactivating session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reactivate session' },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions - Delete a session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const adminSecret = searchParams.get('adminSecret');

    // Verify admin secret
    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret || adminSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const deleted = dataStore.deleteSession(sessionId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    await saveData();

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
