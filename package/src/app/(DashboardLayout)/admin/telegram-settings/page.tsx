'use client';
import { useEffect, useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  Box,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';

interface TelegramSettings {
  botToken: string;
  botUsername: string;
  publicBotUsername: string;
}

interface TelegramStats {
  telegramUsers: number;
  totalUsers: number;
  telegramPercentage: number;
}

const TelegramSettingsPage = () => {
  const [settings, setSettings] = useState<TelegramSettings>({
    botToken: '',
    botUsername: '',
    publicBotUsername: '',
  });
  const [stats, setStats] = useState<TelegramStats>({
    telegramUsers: 0,
    totalUsers: 0,
    telegramPercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [testingBot, setTestingBot] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/telegram-settings');
      const data = await response.json();

      if (response.ok) {
        setSettings(data.settings);
        setStats(data.stats);
      } else {
        setError(data.error || 'Ошибка загрузки настроек');
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/telegram-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botToken: settings.botToken,
          botUsername: settings.botUsername,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setSettings(prev => ({
          ...prev,
          publicBotUsername: settings.botUsername,
        }));
      } else {
        setError(data.error || 'Ошибка сохранения настроек');
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте еще раз.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetupWebhook = async () => {
    if (!settings.botToken || !settings.botUsername) {
      setError('Сначала сохраните настройки бота');
      return;
    }

    setSettingWebhook(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/telegram-settings/setup-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botToken: settings.botToken,
          botUsername: settings.botUsername,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
      } else {
        setError(data.error || 'Ошибка установки вебхука');
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте еще раз.');
    } finally {
      setSettingWebhook(false);
    }
  };

  const handleTestBot = async () => {
    if (!settings.botToken || !settings.botUsername) {
      setError('Сначала сохраните настройки бота');
      return;
    }

    setTestingBot(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/telegram-settings/test-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botToken: settings.botToken,
          botUsername: settings.botUsername,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`✅ ${data.message}`);
      } else {
        setError(`❌ ${data.error}`);
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте еще раз.');
    } finally {
      setTestingBot(false);
    }
  };

  const handleChange = (field: keyof TelegramSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSettings(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  if (loading) {
    return (
      <PageContainer title="Настройки Telegram" description="Управление настройками Telegram бота">
        <DashboardCard title="Настройки Telegram">
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        </DashboardCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Настройки Telegram" description="Управление настройками Telegram бота">
      <Grid container spacing={3}>
        {/* Основные настройки */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <DashboardCard title="Настройки Telegram бота">
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Box component="form" sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Токен бота"
                value={settings.botToken}
                onChange={handleChange('botToken')}
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                sx={{ mb: 3 }}
                type="password"
                helperText="Получите токен у @BotFather в Telegram"
              />

              <TextField
                fullWidth
                label="Username бота"
                value={settings.botUsername}
                onChange={handleChange('botUsername')}
                placeholder="your_bot_username"
                sx={{ mb: 3 }}
                helperText="Username бота без @"
              />

              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving || !settings.botToken || !settings.botUsername}
                sx={{ mr: 2 }}
              >
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                onClick={handleSetupWebhook}
                disabled={settingWebhook || !settings.botToken || !settings.botUsername}
                sx={{ mr: 2 }}
              >
                {settingWebhook ? 'Установка...' : 'Настроить вебхук'}
              </Button>

              <Button
                variant="contained"
                color="info"
                onClick={handleTestBot}
                disabled={testingBot || !settings.botToken || !settings.botUsername}
                sx={{ mr: 2 }}
              >
                {testingBot ? 'Тестирование...' : 'Протестировать бота'}
              </Button>

              <Button
                variant="outlined"
                onClick={fetchSettings}
                disabled={saving || settingWebhook || testingBot}
              >
                Отменить
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Инструкции */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Как настроить бота:
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                1. Напишите боту <strong>@BotFather</strong> в Telegram
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                2. Отправьте команду <code>/newbot</code>
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                3. Выберите имя бота и username
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                4. Скопируйте токен и вставьте выше
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                5. Отправьте <code>/setdomain</code> и укажите: <code>dnrtop.ru</code> (для продакшена)
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                6. Сохраните настройки выше - вебхук установится автоматически
              </Typography>
            </Box>
          </DashboardCard>
        </Grid>

        {/* Статистика */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <DashboardCard title="Статистика пользователей">
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" color="primary" gutterBottom>
                {stats.totalUsers}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Всего пользователей
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" color="secondary" gutterBottom>
                {stats.telegramUsers}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Через Telegram
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" gutterBottom>
                Доля пользователей Telegram:
              </Typography>
              <Chip
                label={`${stats.telegramPercentage}%`}
                color={stats.telegramPercentage > 50 ? 'success' : 'default'}
                variant="outlined"
              />
            </Box>
          </DashboardCard>

          {/* Текущее состояние */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Текущее состояние
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Bot Username:
                </Typography>
                <Typography variant="body1">
                  @{settings.publicBotUsername || 'Не настроен'}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Статус:
                </Typography>
                <Chip
                  label={settings.botToken && settings.botUsername ? 'Настроен' : 'Не настроен'}
                  color={settings.botToken && settings.botUsername ? 'success' : 'error'}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default TelegramSettingsPage;