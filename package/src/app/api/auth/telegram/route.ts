import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';
import { initializeDatabase } from '@/lib/init-db';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Webhook endpoint for Telegram bot
export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook endpoint active' });
}

function validateTelegramHash(data: any, botToken: string): boolean {
  const secretKey = crypto.createHash('sha256').update(botToken).digest();

  const dataCheckString = Object.keys(data)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');

  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return hmac === data.hash;
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const body = await request.json();
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = body;

    // Handle both webhook data from bot and direct widget data
    let userData = { id, first_name, last_name, username, photo_url, hash };

    // If this is webhook data from bot, validate it
    if (auth_date && !hash) {
      // This is webhook data from bot - validate bot token
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return NextResponse.json({ error: 'Bot not configured' }, { status: 500 });
      }

      // For webhook data, we trust the bot's validation
      userData.hash = 'webhook_validated';
    }

    // Проверяем обязательные поля
    if (!id || !first_name || !hash) {
      return NextResponse.json(
        { error: 'Недостаточно данных от Telegram' },
        { status: 400 }
      );
    }

    // Получаем токен бота из переменных окружения
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN не настроен');
      return NextResponse.json(
        { error: 'Ошибка конфигурации сервера' },
        { status: 500 }
      );
    }

    // Валидация хеша от Telegram
    const isValidHash = validateTelegramHash(body, botToken);
    if (!isValidHash) {
      return NextResponse.json(
        { error: 'Неверная подпись от Telegram' },
        { status: 401 }
      );
    }

    // Проверяем, существует ли пользователь с таким Telegram ID
    const existingUser = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [id]);

    let user;
    let isNewUser = false;

    if (existingUser) {
      // Обновляем данные существующего пользователя
      await dbRun(
        `UPDATE users SET
         telegram_username = ?,
         telegram_first_name = ?,
         telegram_last_name = ?,
         telegram_photo_url = ?,
         name = COALESCE(name, ?)
         WHERE telegram_id = ?`,
        [username, first_name, last_name, photo_url, `${first_name} ${last_name || ''}`.trim(), id]
      );

      user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [id]);
    } else {
      // Создаем нового пользователя
      const result = await dbRun(
        `INSERT INTO users (
          email, password, telegram_id, telegram_username, telegram_first_name,
          telegram_last_name, telegram_photo_url, name, auth_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`telegram_${id}@user.local`, `telegram_auth_${id}`, id, username,
         first_name, last_name, photo_url, `${first_name} ${last_name || ''}`.trim(), 'telegram']
      );

      user = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);
      isNewUser = true;
    }

    // Генерируем JWT токен
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegram_id },
      process.env.NEXTAUTH_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      message: isNewUser ? 'Пользователь успешно зарегистрирован через Telegram' : 'Успешный вход через Telegram',
      user: {
        id: user.id,
        name: user.name,
        telegram_username: user.telegram_username,
        telegram_first_name: user.telegram_first_name,
        telegram_photo_url: user.telegram_photo_url,
      },
      token,
      isNewUser,
    });

  } catch (error) {
    console.error('Telegram auth error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}