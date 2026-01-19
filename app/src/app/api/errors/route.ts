import { NextRequest, NextResponse } from 'next/server';
import { getRecentErrors, getErrorStats, clearAllErrors, logError } from '@/lib/db';

// GET /api/errors - Get error logs and stats
export async function GET() {
  try {
    const [errors, stats] = await Promise.all([
      getRecentErrors(100),
      getErrorStats(),
    ]);
    return NextResponse.json({ errors, stats });
  } catch (error) {
    console.error('Error fetching error logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
      { status: 500 }
    );
  }
}

// POST /api/errors - Log an error (for client-side error logging)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await logError({
      endpoint: body.endpoint || 'client',
      errorType: body.errorType || 'unknown',
      message: body.message || 'No message provided',
      statusCode: body.statusCode,
      requestData: body.requestData,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging error:', error);
    return NextResponse.json(
      { error: 'Failed to log error' },
      { status: 500 }
    );
  }
}

// DELETE /api/errors - Clear all error logs
export async function DELETE() {
  try {
    await clearAllErrors();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing error logs:', error);
    return NextResponse.json(
      { error: 'Failed to clear error logs' },
      { status: 500 }
    );
  }
}
