import { NextRequest, NextResponse } from 'next/server';
import { getUsageSummary, getUsageSummaryForTimeframe, clearAllUsage, UsageTimeframe } from '@/lib/db';

// GET /api/usage - Get usage summary
// Accepts optional ?timeframe=day|week|month|all parameter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as UsageTimeframe | null;

    // If timeframe is specified, use the new timeframe-based function
    if (timeframe && ['day', 'week', 'month', 'all'].includes(timeframe)) {
      const summary = await getUsageSummaryForTimeframe(timeframe);
      return NextResponse.json(summary);
    }

    // Otherwise, return the legacy full summary for backwards compatibility
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
