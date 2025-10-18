const TelegramBot = require('node-telegram-bot-api');

// Замените на ваш токен бота
const TOKEN = '8470450135:AAHSIdX_6qm-knXEWZm1qVUrPKN4iODoTXQ';

// Создаем бота (используем вебхук для продакшена, polling для разработки)
const bot = new TelegramBot(TOKEN, {
  polling: process.env.NODE_ENV !== 'production'
});

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  console.log('User started bot:', user);

  // Показываем приветствие и кнопку авторизации
  bot.sendMessage(chatId, `Привет, ${user.first_name}! 👋

Нажмите кнопку ниже для авторизации на сайте dnrtop.ru:`, {
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Подтвердить авторизацию', callback_data: 'auth_confirm' }
      ]]
    }
  });
});

// Обработка команды /auth
bot.onText(/\/auth/, (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  console.log('User requested auth:', user);

  // Показываем кнопку авторизации
  bot.sendMessage(chatId, 'Нажмите кнопку для авторизации:', {
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Подтвердить авторизацию', callback_data: 'auth_confirm' }
      ]]
    }
  });
});

// Обработка нажатий на кнопки
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const user = query.from;
  const data = query.data;

  if (data === 'auth_confirm') {
    console.log('User confirmed auth:', user);

    try {
      // Определяем URL для отправки данных (локальный для разработки, продакшн для сервера)
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://dnrtop.ru'
        : 'http://localhost:3000';

      // Отправляем данные пользователя на сервер
      const response = await fetch(`${baseUrl}/api/auth/telegram/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          auth_date: Math.floor(Date.now() / 1000)
        })
      });

      const result = await response.json();

      if (result.success) {
        // Показываем успешное сообщение
        bot.answerCallbackQuery(query.id, '✅ Авторизация успешна!');
        bot.sendMessage(chatId, `✅ Добро пожаловать, ${user.first_name}!

Вы успешно авторизованы на сайте dnrtop.ru.

Теперь можете вернуться на сайт и продолжить работу.

🔗 Ссылка: ${result.redirect_url || 'http://localhost:3000'}`);
      } else {
        bot.answerCallbackQuery(query.id, '❌ Ошибка авторизации');
        bot.sendMessage(chatId, `❌ Произошла ошибка при авторизации: ${result.error || 'Попробуйте еще раз.'}`);
      }

    } catch (error) {
      console.error('Error sending auth data:', error);
      bot.answerCallbackQuery(query.id, '❌ Ошибка сервера');
      bot.sendMessage(chatId, '❌ Ошибка сервера. Попробуйте еще раз позже.');
    }
  }
});

// Обработка всех сообщений
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // Игнорируем команды (они обрабатываются выше)
  if (msg.text && msg.text.startsWith('/')) {
    return;
  }

  // Для любых других сообщений показываем помощь
  bot.sendMessage(chatId, 'Используйте команды:\n/auth - авторизация на сайте\n/start - начать работу');
});

console.log('🤖 Telegram бот запущен и готов к работе!');
console.log('Бот будет обрабатывать команды /start и /auth');
console.log('Пользователи смогут авторизоваться через кнопку подтверждения');