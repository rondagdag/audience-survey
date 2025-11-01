import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/data-store';

export const dynamic = 'force-dynamic';

// GET /api/sessions - List all sessions
export async function GET() {
  try {
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
