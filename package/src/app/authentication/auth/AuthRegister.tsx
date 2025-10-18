import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, Divider } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import CustomTextField from '@/app/(DashboardLayout)/components/forms/theme-elements/CustomTextField';
import { Stack } from '@mui/system';

interface registerType {
    title?: string;
    subtitle?: React.ReactNode;
    subtext?: React.ReactNode;
}

declare global {
    interface Window {
        TelegramLoginWidget: any;
    }
}

const AuthRegister = ({ title, subtitle, subtext }: registerType) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [telegramLoading, setTelegramLoading] = useState(false);
    const router = useRouter();

    // Добавляем отладочную информацию
    console.log('AuthRegister component mounted');

    useEffect(() => {
        // Инициализация Telegram Widget только на клиенте
        if (typeof window !== 'undefined') {
            console.log('Starting Telegram widget initialization...');

            // Проверяем, загружен ли уже скрипт
            const existingScript = document.querySelector('script[src*="telegram-widget.js"]');
            if (existingScript) {
                console.log('Script already exists, initializing...');
                initTelegramWidget();
                return;
            }

            try {
                const script = document.createElement('script');
                script.src = 'https://telegram.org/js/telegram-widget.js?22';
                script.async = true;
                script.onload = () => {
                    console.log('Telegram script loaded successfully');
                    initTelegramWidget();
                };
                script.onerror = () => {
                    console.error('Failed to load Telegram script');
                    showFallbackButton();
                };

                console.log('Appending script to head...');
                document.head.appendChild(script);
                console.log('Script appended successfully');

                return () => {
                    if (document.head.contains(script)) {
                        document.head.removeChild(script);
                    }
                };
            } catch (error) {
                console.error('Error creating Telegram script:', error);
                showFallbackButton();
            }
        }
    }, []);

    const initTelegramWidget = () => {
        console.log('initTelegramWidget called');

        // Ждем немного для полной загрузки скрипта
        setTimeout(() => {
            console.log('Checking TelegramLoginWidget availability...');
            console.log('window.TelegramLoginWidget:', window.TelegramLoginWidget);

            if (window.TelegramLoginWidget && window.TelegramLoginWidget.init) {
                try {
                    console.log('Initializing Telegram widget...');
                    window.TelegramLoginWidget.init();
                    console.log('Telegram widget initialized successfully');
                } catch (error) {
                    console.error('Error initializing Telegram widget:', error);
                    showFallbackButton();
                }
            } else {
                console.warn('TelegramLoginWidget not available, available properties:', Object.keys(window));
                showFallbackButton();
            }
        }, 1000);
    };

    const showFallbackButton = () => {
        const fallbackDiv = document.getElementById('telegram-fallback');
        if (fallbackDiv) {
            fallbackDiv.style.display = 'flex';
            fallbackDiv.style.cursor = 'pointer';
            fallbackDiv.innerHTML = '🚀 Войти через Telegram';

            // Добавляем обработчик клика
            fallbackDiv.onclick = () => {
                window.open('https://t.me/domashka1979bot?start=auth', '_blank');
            };
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(data.message);
                // Redirect to login page after successful registration
                setTimeout(() => {
                    router.push('/authentication/login');
                }, 2000);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleTelegramAuth = async (user: any) => {
        setTelegramLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(user),
            });

            const data = await response.json();

            if (response.ok) {
                // Store token
                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', data.token);
                }

                if (data.isNewUser) {
                    setSuccess('Добро пожаловать! Вы успешно зарегистрированы через Telegram.');
                } else {
                    setSuccess('С возвращением! Успешный вход через Telegram.');
                }

                // Redirect to dashboard
                setTimeout(() => {
                    router.push('/');
                }, 1500);
            } else {
                setError(data.error || 'Ошибка аутентификации через Telegram');
            }
        } catch (err) {
            setError('Ошибка сети. Попробуйте еще раз.');
        } finally {
            setTelegramLoading(false);
        }
    };

    // Обработчик для Telegram Widget
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleTelegramCallback = (user: any) => {
                console.log('Telegram auth callback triggered:', user);
                handleTelegramAuth(user);
            };

            // @ts-ignore
            window.handleTelegramAuth = handleTelegramCallback;

            // Попытка повторной инициализации через 2 секунды
            const retryInit = setTimeout(() => {
                initTelegramWidget();
            }, 2000);

            return () => {
                // @ts-ignore
                delete window.handleTelegramAuth;
                clearTimeout(retryInit);
            };
        }
    }, []);

    return (
        <>
            {title ? (
                <Typography fontWeight="700" variant="h2" mb={1}>
                    {title}
                </Typography>
            ) : null}

            {subtext}

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

            {/* Telegram Login Widget */}
            <Box mb={3}>
                <Typography variant="h6" mb={2} textAlign="center">
                    Регистрация через Telegram
                </Typography>
                <Box display="flex" justifyContent="center" mb={2}>
                    <div
                        className="telegram-login"
                        data-telegram-login="domashka1979bot"
                        data-size="large"
                        data-radius="10"
                        data-auth-url="https://dnrtop.ru"
                        data-request-access="write"
                        style={{
                            display: 'inline-block',
                            minHeight: '50px',
                            backgroundColor: '#0088cc',
                            borderRadius: '10px',
                            padding: '2px'
                        }}
                    >
                        {/* Fallback button if widget fails to load */}
                        <div id="telegram-fallback" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '46px',
                            backgroundColor: '#0088cc',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}>
                            🚀 Войти через Telegram
                        </div>
                    </div>
                </Box>
                <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                        ИЛИ
                    </Typography>
                </Divider>
            </Box>

            {/* Traditional Registration Form */}
            <Typography variant="h6" mb={2} textAlign="center">
                Регистрация через Email
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
                <Stack mb={3}>
                    <Typography variant="subtitle1"
                        fontWeight={600} component="label" htmlFor='name' mb="5px">Имя</Typography>
                    <CustomTextField
                        id="name"
                        name="name"
                        variant="outlined"
                        fullWidth
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />

                    <Typography variant="subtitle1"
                        fontWeight={600} component="label" htmlFor='email' mb="5px" mt="25px">Email адрес</Typography>
                    <CustomTextField
                        id="email"
                        name="email"
                        type="email"
                        variant="outlined"
                        fullWidth
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                    <Typography variant="subtitle1"
                        fontWeight={600} component="label" htmlFor='password' mb="5px" mt="25px">Пароль</Typography>
                    <CustomTextField
                        id="password"
                        name="password"
                        type="password"
                        variant="outlined"
                        fullWidth
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </Stack>
                <Button
                    color="primary"
                    variant="contained"
                    size="large"
                    fullWidth
                    type="submit"
                    disabled={loading}
                >
                    {loading ? 'Создание аккаунта...' : 'Зарегистрироваться'}
                </Button>
            </Box>
            {subtitle}
        </>
    );
};

export default AuthRegister;
