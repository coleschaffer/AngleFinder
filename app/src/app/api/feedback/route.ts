import { NextResponse } from 'next/server';
import { getAllFeedback, addFeedback, deleteFeedback, clearAllFeedback } from '@/lib/db';

// GET - Retrieve all feedback
export async function GET() {
  try {
    const feedback = await getAllFeedback();
    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback', feedback: [] },
      { status: 500 }
    );
  }
}

// POST - Add new feedback
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, message, userAgent } = body;

    if (!email || !message) {
      return NextResponse.json(
        { error: 'Email and message are required' },
        { status: 400 }
      );
    }

    const newFeedback = await addFeedback({
      email,
      message,
      date: new Date().toISOString(),
      userAgent: userAgent || 'unknown',
    });

    return NextResponse.json({ success: true, feedback: newFeedback });
  } catch (error) {
    console.error('Error adding feedback:', error);
    return NextResponse.json(
      { error: 'Failed to add feedback' },
      { status: 500 }
    );
  }
}

// DELETE - Delete feedback by ID or clear all
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll');

    if (clearAll === 'true') {
      await clearAllFeedback();
      return NextResponse.json({ success: true, message: 'All feedback cleared' });
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    await deleteFeedback(id);
    return NextResponse.json({ success: true, message: 'Feedback deleted' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to delete feedback' },
      { status: 500 }
    );
  }
}
