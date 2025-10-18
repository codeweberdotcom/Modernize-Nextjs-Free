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
    } else if (body.id && body.first_name) {
      // Handle direct format from our bot
      userData = {
        id: body.id,
        first_name: body.first_name,
        last_name: body.last_name || '',
        username: body.username || '',
        auth_date: body.auth_date || Math.floor(Date.now() / 1000)
      };
    } else {
      console.error('Invalid webhook format received:', JSON.stringify(body, null, 2));
      return NextResponse.json({ error: 'Invalid webhook format' }, { status: 400 });
    }

    if (!userData.id || !userData.first_name) {
      console.error('Invalid user data received:', userData);
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    console.log('Processing user data:', userData);

    // Check if user exists
    console.log('Checking existing user with telegram_id:', userData.id);
    const existingUser = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [userData.id]);

    let user;
    let isNewUser = false;

    if (existingUser) {
      console.log('Updating existing user:', existingUser.id);
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
      console.log('User updated successfully');
    } else {
      console.log('Creating new user');
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
      console.log('New user created with ID:', user.id);
    }

    // Generate JWT token
    let token;
    try {
      token = jwt.sign(
        { userId: user.id, telegramId: user.telegram_id },
        process.env.NEXTAUTH_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      console.log('JWT token generated successfully');
    } catch (error) {
      console.error('Error generating JWT token:', error);
      return NextResponse.json({ error: 'Error generating authentication token' }, { status: 500 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}?token=${token}&auth=telegram&new=${isNewUser}`;

    console.log('Authentication successful for user:', user.id);

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
      redirect_url: redirectUrl
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}