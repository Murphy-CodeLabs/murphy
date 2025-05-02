import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ComponentCopy from '@/models/ComponentCopy';
import fs from 'fs';
import path from 'path';

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

export async function GET() {
  try {
    await connectDB();
    
    const totalCopies = await ComponentCopy.aggregate([
      { $group: { _id: null, total: { $sum: '$copyCount' } } }
    ]);

    const components = await ComponentCopy.find()
      .sort({ copyCount: -1 })
      .select('componentName copyCount');

    // Count files in public/r directory
    const publicRPath = path.join(process.cwd(), 'public', 'r');
    const files = fs.readdirSync(publicRPath);
    const totalComponents = files.length;

    return NextResponse.json({
      success: true,
      totalCopies: totalCopies[0]?.total || 0,
      components,
      totalComponents
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
} 