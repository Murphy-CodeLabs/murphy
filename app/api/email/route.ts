import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Email from '@/models/Email';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { email } = await request.json();
    
    const newEmail = await Email.create({
      email
    });

    return NextResponse.json({ success: true, email: newEmail });
  } catch (error) {
    console.error("Error subscribing email:", error);
    return NextResponse.json(
      { success: false, error: "Failed to subscribe email" },
      { status: 500 }
    );
  }
}
