import { NextResponse } from 'next/server';
import { getContentCacheStats, clearExpiredCache, clearAllCache } from '@/lib/db';

// GET /api/cache - Get cache statistics
export async function GET() {
  try {
    const stats = await getContentCacheStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Cache stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cache stats' },
      { status: 500 }
    );
  }
}

// POST /api/cache - Cleanup expired entries
export async function POST() {
  try {
    const clearedCount = await clearExpiredCache();
    return NextResponse.json({ cleared: clearedCount });
  } catch (error) {
    console.error('Cache cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup cache' },
      { status: 500 }
    );
  }
}

// DELETE /api/cache - Clear all cache
export async function DELETE() {
  try {
    await clearAllCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cache clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
