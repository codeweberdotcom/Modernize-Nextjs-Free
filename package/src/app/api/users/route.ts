import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';
import { initializeDatabase } from '@/lib/init-db';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const users = await dbAll('SELECT id, email, name, created_at FROM users ORDER BY created_at DESC');

    return NextResponse.json({
      success: true,
      users: users,
    });
  } catch (error) {
    console.error('Get users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}