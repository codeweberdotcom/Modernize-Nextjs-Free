import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';
import { initializeDatabase } from '@/lib/init-db';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    // Читаем текущие настройки из .env.local файла
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';

    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      console.error('Error reading .env.local:', error);
    }

    // Извлекаем настройки Telegram
    const telegramBotToken = getEnvValue(envContent, 'TELEGRAM_BOT_TOKEN') || '';
    const telegramBotUsername = getEnvValue(envContent, 'TELEGRAM_BOT_USERNAME') || '';
    const nextPublicTelegramBotUsername = getEnvValue(envContent, 'NEXT_PUBLIC_TELEGRAM_BOT_USERNAME') || '';

    // Получаем статистику пользователей Telegram
    const telegramUsersCount = await dbGet(
      'SELECT COUNT(*) as count FROM users WHERE auth_method = ?',
      ['telegram']
    );

    const totalUsersCount = await dbGet(
      'SELECT COUNT(*) as count FROM users'
    );

    return NextResponse.json({
      success: true,
      settings: {
        botToken: telegramBotToken,
        botUsername: telegramBotUsername,
        publicBotUsername: nextPublicTelegramBotUsername,
      },
      stats: {
        telegramUsers: telegramUsersCount.count,
        totalUsers: totalUsersCount.count,
        telegramPercentage: totalUsersCount.count > 0
          ? Math.round((telegramUsersCount.count / totalUsersCount.count) * 100)
          : 0,
      },
    });
  } catch (error) {
    console.error('Get Telegram settings error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const { botToken, botUsername } = await request.json();

    if (!botToken || !botUsername) {
      return NextResponse.json(
        { error: 'Bot token и username обязательны' },
        { status: 400 }
      );
    }

    // Читаем текущий .env.local файл
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';

    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      // Если файл не существует, создаем базовый контент
      envContent = `# JWT Secret for authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database
DATABASE_URL=./database.sqlite

# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Telegram Bot Configuration
`;
    }

    // Обновляем настройки Telegram
    envContent = setEnvValue(envContent, 'TELEGRAM_BOT_TOKEN', botToken);
    envContent = setEnvValue(envContent, 'TELEGRAM_BOT_USERNAME', botUsername);
    envContent = setEnvValue(envContent, 'NEXT_PUBLIC_TELEGRAM_BOT_USERNAME', botUsername);

    // Записываем обновленный файл
    fs.writeFileSync(envPath, envContent);

    // Асинхронно устанавливаем вебхук и команды (только для продакшена)
    if (process.env.NODE_ENV === 'production') {
      setupBotAsync(botToken, botUsername).catch(error => {
        console.error('Error setting up bot:', error);
      });
    } else {
      console.log('⏭️ Skipping webhook setup for development mode');
    }

    return NextResponse.json({
      success: true,
      message: 'Настройки Telegram успешно обновлены. Вебхук и команды устанавливаются...',
    });

  } catch (error) {
    console.error('Update Telegram settings error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

function getEnvValue(envContent: string, key: string): string | null {
  const regex = new RegExp(`^${key}=(.*)$`, 'm');
  const match = envContent.match(regex);
  return match ? match[1] : null;
}

function setEnvValue(envContent: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (envContent.match(regex)) {
    // Заменяем существующую строку
    return envContent.replace(regex, `${key}=${value}`);
  } else {
    // Добавляем новую строку
    return envContent + `\n${key}=${value}`;
  }
}

async function setupBotAsync(botToken: string, botUsername: string): Promise<void> {
  try {
    console.log('Setting up Telegram bot completely...');

    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // Определяем URL для вебхука только для продакшена
      const baseUrl = `https://${process.env.VERCEL_URL || 'dnrtop.ru'}`;
      const webhookUrl = `${baseUrl}/api/auth/telegram/webhook`;

      console.log(`Setting webhook to: ${webhookUrl}`);

      // Шаг 1: Устанавливаем вебхук
      const webhookResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: webhookUrl,
            max_connections: 1,
            drop_pending_updates: true,
          }),
        }
      );

      const webhookResult = await webhookResponse.json();

      if (!webhookResult.ok) {
        console.error('❌ Failed to set webhook:', webhookResult);
        throw new Error(`Failed to set webhook: ${webhookResult.description}`);
      }

      console.log('✅ Webhook set successfully');
    } else {
      console.log('⏭️ Skipping webhook setup for development mode');
    }

    // Шаг 2: Устанавливаем команды бота
    const commandsResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/setMyCommands`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commands: [
            {
              command: 'start',
              description: 'Начать работу с ботом'
            },
            {
              command: 'auth',
              description: 'Авторизация на сайте'
            }
          ]
        }),
      }
    );

    const commandsResult = await commandsResponse.json();

    if (commandsResult.ok) {
      console.log('✅ Bot commands set successfully');
    } else {
      console.warn('⚠️ Failed to set bot commands:', commandsResult);
      // Не считаем это критической ошибкой
    }

    // Шаг 3: Устанавливаем описание бота
    const descriptionResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/setMyDescription`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'Бот для авторизации на сайте через Telegram'
        }),
      }
    );

    if (descriptionResponse.ok) {
      console.log('✅ Bot description set successfully');
    }

    console.log('🎉 Bot setup completed successfully');

  } catch (error) {
    console.error('Error setting up bot:', error);
    throw error;
  }
}