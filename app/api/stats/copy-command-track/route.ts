import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ComponentCopy from '@/models/ComponentCopy';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { componentName } = await request.json();
    
    const component = await ComponentCopy.findOneAndUpdate(
      { componentName },
      { $inc: { copyCount: 1 } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, component });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to track copy' }, { status: 500 });
  }
}