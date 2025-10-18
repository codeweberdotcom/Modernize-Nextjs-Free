import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth';
import { initializeDatabase } from '@/lib/init-db';

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await registerUser(email, password, name);

    if (result.success) {
      return NextResponse.json({
        message: result.message,
        user: result.user,
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}