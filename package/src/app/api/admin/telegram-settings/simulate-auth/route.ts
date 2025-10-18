import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';
import { initializeDatabase } from '@/lib/init-db';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { botToken, botUsername } = await request.json();

    if (!botToken || !botUsername) {
      return NextResponse.json(
        { error: 'Bot token и username обязательны' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting Telegram authentication simulation...');

    // Шаг 1: Тестируем бота
    try {
      const botResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const botData = await botResponse.json();

      if (!botData.ok) {
        return NextResponse.json({
          error: `Бот не отвечает: ${botData.description}`,
        }, { status: 400 });
      }

      console.log('✅ Bot is active:', botData.result.username);

    } catch (error) {
      return NextResponse.json({
        error: 'Не удается подключиться к боту. Проверьте токен.',
      }, { status: 400 });
    }

    // Шаг 2: Симулируем данные пользователя (как будто он нажал кнопку в боте)
    await initializeDatabase();

    const testUserData = {
      id: Math.floor(Math.random() * 1000000) + 1000000, // Случайный ID для теста
      first_name: 'Тестовый',
      last_name: 'Пользователь',
      username: 'test_user_' + Date.now(),
      auth_date: Math.floor(Date.now() / 1000)
    };

    console.log('Creating test user:', testUserData);

    // Шаг 3: Создаем тестового пользователя
    const existingUser = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [testUserData.id]);

    let user;
    let isNewUser = false;

    if (existingUser) {
      console.log('Updating existing test user');
      await dbRun(
        `UPDATE users SET
         telegram_username = ?,
         telegram_first_name = ?,
         telegram_last_name = ?,
         name = COALESCE(name, ?)
         WHERE telegram_id = ?`,
        [testUserData.username, testUserData.first_name, testUserData.last_name,
         `${testUserData.first_name} ${testUserData.last_name}`.trim(), testUserData.id]
      );

      user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [testUserData.id]);
    } else {
      console.log('Creating new test user');
      const result = await dbRun(
        `INSERT INTO users (
          telegram_id, telegram_username, telegram_first_name,
          telegram_last_name, name, auth_method
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [testUserData.id, testUserData.username, testUserData.first_name,
         testUserData.last_name, `${testUserData.first_name} ${testUserData.last_name}`.trim(), 'telegram']
      );

      user = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);
      isNewUser = true;
    }

    // Шаг 4: Генерируем токен
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegram_id },
      process.env.NEXTAUTH_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('✅ Test authentication completed successfully');
    console.log('Test user created:', user);

    return NextResponse.json({
      success: true,
      message: `Симуляция авторизации успешна! Тестовый пользователь создан и авторизован.`,
      test_user: {
        id: user.id,
        name: user.name,
        telegram_id: user.telegram_id,
        telegram_username: user.telegram_username,
      },
      token,
      is_new: isNewUser,
      simulation_steps: [
        '✅ Бот проверен и активен',
        '✅ Тестовые данные пользователя созданы',
        '✅ Пользователь сохранен в базу данных',
        '✅ JWT токен сгенерирован',
        '✅ Авторизация завершена успешно'
      ]
    });

  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: 'Ошибка симуляции авторизации' },
      { status: 500 }
    );
  }
}