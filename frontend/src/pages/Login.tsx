import {
  Box,
  Button,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginWithToken } from '../api/client';
import { useAuth } from '../auth';

export default function LoginPage() {
  const demoUsername = import.meta.env.VITE_DEMO_USERNAME || 'admin';
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || 'StrongPassword123';
  const [username, setUsername] = useState(demoUsername);
  const [password, setPassword] = useState(demoPassword);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = await loginWithToken(username, password);
      login(token, username);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="auth-shell">
      <Box className="app-backdrop" />
      <Paper className="surface-card auth-card fade-in" withBorder radius="lg" p="xl">
        <Stack gap="md">
          <Box>
            <Title order={2}>Welcome back</Title>
            <Text size="sm" className="muted">
              Sign in with your Django admin credentials to access the knowledge workspace.
            </Text>
          </Box>
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Username"
                placeholder="admin"
                value={username}
                onChange={(event) => setUsername(event.currentTarget.value)}
                required
              />
              <PasswordInput
                label="Password"
                placeholder="Your password"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                required
              />
              {error ? (
                <Text size="sm" c="red">
                  {error}
                </Text>
              ) : null}
              <Group justify="space-between" mt="xs">
                <Text size="xs" className="muted">
                  Token auth via /api/token/
                </Text>
                <Button type="submit" loading={loading}>
                  Sign in
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Box>
  );
}
