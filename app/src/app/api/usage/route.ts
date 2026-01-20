import { NextResponse } from 'next/server';
import { getUsageSummary, clearAllUsage } from '@/lib/db';

// GET /api/usage - Get usage summary
export async function GET() {
  try {
    const summary = await getUsageSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Usage fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}

// DELETE /api/usage - Clear all usage data
export async function DELETE() {
  try {
    await clearAllUsage();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Usage clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear usage data' },
      { status: 500 }
    );
  }
}
