import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { initializeDatabase } from '@/lib/init-db';

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await loginUser(email, password);

    if (result.success) {
      return NextResponse.json({
        message: result.message,
        user: result.user,
        token: result.token,
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}