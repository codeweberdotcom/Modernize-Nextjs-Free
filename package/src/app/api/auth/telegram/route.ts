import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';
import { initializeDatabase } from '@/lib/init-db';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const body = await request.json();
    const { id, first_name, last_name, username, photo_url, hash } = body;

    // В реальном приложении здесь должна быть проверка хеша от Telegram
    // Для демонстрации пропустим эту проверку

    if (!id || !first_name) {
      return NextResponse.json(
        { error: 'Недостаточно данных от Telegram' },
        { status: 400 }
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
          telegram_id, telegram_username, telegram_first_name,
          telegram_last_name, telegram_photo_url, name, auth_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, username, first_name, last_name, photo_url, `${first_name} ${last_name || ''}`.trim(), 'telegram']
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