import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/auth/verify - Verify admin secret without creating sessions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminSecret } = body;

    // Verify admin secret
    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret || adminSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admin secret verified',
    });
  } catch (error) {
    console.error('Error verifying admin secret:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify credentials' },
      { status: 500 }
    );
  }
}
