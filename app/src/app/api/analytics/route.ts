import { NextRequest, NextResponse } from 'next/server';
import { trackAnalyticsEvent, getAnalyticsSummary, clearAllAnalytics, AnalyticsEventInput } from '@/lib/db';

// POST /api/analytics - Track an analytics event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const event: AnalyticsEventInput = {
      eventType: body.eventType,
      itemId: body.itemId,
      itemType: body.itemType,
      awarenessLevel: body.awarenessLevel || 'emerging',
      momentumScore: body.momentumScore || 5,
      isSweetSpot: body.isSweetSpot || false,
      niche: body.niche,
      sourceType: body.sourceType,
    };

    await trackAnalyticsEvent(event);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}

// GET /api/analytics - Get analytics summary
export async function GET() {
  try {
    const summary = await getAnalyticsSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// DELETE /api/analytics - Clear all analytics
export async function DELETE() {
  try {
    await clearAllAnalytics();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear analytics' },
      { status: 500 }
    );
  }
}
