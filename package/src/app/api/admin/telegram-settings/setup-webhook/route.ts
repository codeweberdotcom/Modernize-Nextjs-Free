import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { botToken, botUsername } = await request.json();

    if (!botToken || !botUsername) {
      return NextResponse.json(
        { error: 'Bot token и username обязательны' },
        { status: 400 }
      );
    }

    console.log('Setting up Telegram webhook manually...');

    // Определяем URL для вебхука в зависимости от окружения
    const isProduction = process.env.NODE_ENV === 'production';
    const baseUrl = isProduction
      ? `https://${process.env.VERCEL_URL || 'dnrtop.ru'}`
      : 'http://localhost:3000';

    const webhookUrl = `${baseUrl}/api/auth/telegram/webhook`;

    console.log(`Setting webhook to: ${webhookUrl}`);

    // Устанавливаем вебхук через Telegram API
    const response = await fetch(
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

    const result = await response.json();

    if (result.ok) {
      console.log('✅ Webhook set successfully');
      return NextResponse.json({
        success: true,
        message: 'Вебхук успешно установлен',
      });
    } else {
      console.error('❌ Failed to set webhook:', result);
      return NextResponse.json(
        { error: `Ошибка Telegram API: ${result.description}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Setup webhook error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}