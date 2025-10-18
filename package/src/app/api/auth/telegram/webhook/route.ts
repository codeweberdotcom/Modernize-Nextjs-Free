import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';
import { initializeDatabase } from '@/lib/init-db';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const body = await request.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    // Handle different webhook formats
    let userData: any = {};

    if (body.message && body.message.from) {
      // Handle message format
      const from = body.message.from;
      userData = {
        id: from.id,
        first_name: from.first_name,
        last_name: from.last_name,
        username: from.username,
        auth_date: Math.floor(Date.now() / 1000)
      };
    } else if (body.callback_query && body.callback_query.from) {
      // Handle callback query format
      const from = body.callback_query.from;
      userData = {
        id: from.id,
        first_name: from.first_name,
        last_name: from.last_name,
        username: from.username,
        auth_date: Math.floor(Date.now() / 1000)
      };
    } else {
      return NextResponse.json({ error: 'Invalid webhook format' }, { status: 400 });
    }

    if (!userData.id || !userData.first_name) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [userData.id]);

    let user;
    let isNewUser = false;

    if (existingUser) {
      // Update existing user
      await dbRun(
        `UPDATE users SET
         telegram_username = ?,
         telegram_first_name = ?,
         telegram_last_name = ?,
         name = COALESCE(name, ?)
         WHERE telegram_id = ?`,
        [userData.username, userData.first_name, userData.last_name,
         `${userData.first_name} ${userData.last_name || ''}`.trim(), userData.id]
      );

      user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [userData.id]);
    } else {
      // Create new user
      const result = await dbRun(
        `INSERT INTO users (
          telegram_id, telegram_username, telegram_first_name,
          telegram_last_name, name, auth_method
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [userData.id, userData.username, userData.first_name,
         userData.last_name, `${userData.first_name} ${userData.last_name || ''}`.trim(), 'telegram']
      );

      user = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);
      isNewUser = true;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegram_id },
      process.env.NEXTAUTH_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return success response for bot
    return NextResponse.json({
      success: true,
      message: isNewUser ? 'User registered successfully' : 'User logged in successfully',
      user: {
        id: user.id,
        name: user.name,
        telegram_username: user.telegram_username,
      },
      token,
      redirect_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?token=${token}&auth=telegram&new=${isNewUser}`
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}