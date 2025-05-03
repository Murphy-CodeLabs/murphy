import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Feedback from '@/models/Feedback';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { happiness, feedback } = await request.json();
    
    const newFeedback = await Feedback.create({
      happiness,
      feedback
    });

    return NextResponse.json({ success: true, feedback: newFeedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit feedback' }, { status: 500 });
  }
} 