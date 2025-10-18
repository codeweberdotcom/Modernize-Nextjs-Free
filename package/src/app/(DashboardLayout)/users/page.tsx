'use client';
import { useEffect, useState } from 'react';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';

interface User {
  id: number;
  email: string;
  name: string;
  telegram_id?: number;
  telegram_username?: string;
  telegram_first_name?: string;
  auth_method: string;
  created_at: string;
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <PageContainer title="Пользователи" description="Список всех зарегистрированных пользователей">
      <DashboardCard title="Зарегистрированные пользователи">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><Typography variant="h6">ID</Typography></TableCell>
                  <TableCell><Typography variant="h6">Имя</Typography></TableCell>
                  <TableCell><Typography variant="h6">Email</Typography></TableCell>
                  <TableCell><Typography variant="h6">Telegram</Typography></TableCell>
                  <TableCell><Typography variant="h6">Метод</Typography></TableCell>
                  <TableCell><Typography variant="h6">Дата регистрации</Typography></TableCell>
                  <TableCell><Typography variant="h6">Статус</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body1" color="textSecondary">
                        Пользователи не найдены
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>
                        <Typography variant="body1" fontWeight={500}>
                          {user.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        {user.telegram_username ? (
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              @{user.telegram_username}
                            </Typography>
                            {user.telegram_first_name && (
                              <Typography variant="caption" color="textSecondary">
                                {user.telegram_first_name}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.auth_method === 'telegram' ? 'Telegram' : 'Email'}
                          color={user.auth_method === 'telegram' ? 'primary' : 'default'}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <Chip
                          label="Активен"
                          color="success"
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {users.length > 0 && (
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              Всего пользователей: {users.length}
            </Typography>
          </Box>
        )}
      </DashboardCard>
    </PageContainer>
  );
};

export default UsersPage;