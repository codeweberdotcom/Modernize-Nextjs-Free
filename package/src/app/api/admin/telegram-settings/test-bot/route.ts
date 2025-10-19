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

    console.log('Testing Telegram bot connection...');

    // Тест 1: Проверяем токен бота
    let botInfo;
    try {
      const botResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const botData = await botResponse.json();

      if (!botData.ok) {
        return NextResponse.json({
          error: `Неверный токен бота: ${botData.description}`,
        }, { status: 400 });
      }

      botInfo = botData.result;
      console.log('✅ Bot info received:', botInfo.username);

      // Проверяем, что username совпадает
      if (botInfo.username !== botUsername.replace('@', '')) {
        return NextResponse.json({
          error: `Username бота не совпадает. Ожидался: ${botUsername}, получен: ${botInfo.username}`,
        }, { status: 400 });
      }

    } catch (error) {
      console.error('Error testing bot token:', error);
      return NextResponse.json({
        error: 'Не удается подключиться к Telegram API. Проверьте токен бота.',
      }, { status: 400 });
    }

    // Тест 2: Проверяем вебхук
    try {
      const webhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const webhookData = await webhookResponse.json();

      if (webhookData.ok) {
        const webhookInfo = webhookData.result;
        console.log('✅ Webhook info received:', webhookInfo.url);

        // Определяем ожидаемый URL вебхука
        const isProduction = process.env.NODE_ENV === 'production';
        const port = process.env.PORT || '3000';
        const baseUrl = isProduction
          ? `https://${process.env.VERCEL_URL || 'dnrtop.ru'}`
          : `http://localhost:${port}`;
        const expectedWebhookUrl = `${baseUrl}/api/auth/telegram/webhook`;

        console.log('Current webhook URL:', webhookInfo.url);
        console.log('Expected webhook URL:', expectedWebhookUrl);

        if (webhookInfo.url === expectedWebhookUrl) {
          return NextResponse.json({
            success: true,
            message: `Бот активен (@${botInfo.username}), вебхук настроен правильно`,
            webhookUrl: webhookInfo.url,
            expectedUrl: expectedWebhookUrl,
          });
        } else {
          return NextResponse.json({
            success: true,
            message: `Бот активен (@${botInfo.username}), но вебхук указывает на другой URL`,
            webhookUrl: webhookInfo.url,
            expectedUrl: expectedWebhookUrl,
            issue: webhookInfo.url ? 'wrong_domain' : 'no_webhook',
          });
        }
      } else {
        // Webhook info not available or empty
        return NextResponse.json({
          success: true,
          message: `Бот активен (@${botInfo.username}), но вебхук не настроен`,
          webhookUrl: '',
          expectedUrl: expectedWebhookUrl,
          issue: 'no_webhook',
          suggestion: process.env.NODE_ENV !== 'production'
            ? 'Для разработки используйте polling режим. Для продакшена настройте вебхук.'
            : 'Настройте вебхук для продакшена.',
          setupWebhook: false,
        });
      }

    } catch (error) {
      console.error('Error testing webhook:', error);
      return NextResponse.json({
        success: true,
        message: `Бот активен (@${botInfo.username}), но не удается проверить вебхук`,
      });
    }

    // Тест 3: Проверяем домен (если в продакшене)
    if (process.env.NODE_ENV === 'production') {
      try {
        // Проверяем, принят ли домен
        const domainResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMyCommands`);
        const domainData = await domainResponse.json();

        if (domainData.ok) {
          console.log('✅ Domain accepted by Telegram');
        }
      } catch (error) {
        console.warn('Warning: Could not verify domain acceptance:', error);
      }
    }


  } catch (error) {
    console.error('Test bot error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}