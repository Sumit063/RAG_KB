import {
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Divider,
  Group,
  Menu,
  NavLink,
  Stack,
  Text,
  Title,
  UnstyledButton
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChevronDown,
  IconChevronRight,
  IconDashboard,
  IconLogout,
  IconMessageDots,
  IconSettings,
  IconUser
} from '@tabler/icons-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: IconDashboard },
  { label: 'Ask', to: '/ask', icon: IconMessageDots },
  { label: 'Profile', to: '/profile', icon: IconUser },
  { label: 'Settings', to: '/settings', icon: IconSettings }
];

export default function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { username, logout } = useAuth();
  const displayName = username || 'User';
  const avatarLetter = displayName.slice(0, 1).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header className="app-header">
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Box>
              <Title order={3} style={{ letterSpacing: '-0.02em' }}>
                RAG KB
              </Title>
              <Text size="xs" className="muted">
                Knowledge workspace
              </Text>
            </Box>
          </Group>
          <Group gap="sm" wrap="nowrap">
            <Badge variant="light" color="brand" className="header-badge">
              Secure API
            </Badge>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <UnstyledButton className="user-chip">
                  <Group gap="sm" wrap="nowrap">
                    <Avatar radius="xl" color="brand">
                      {avatarLetter}
                    </Avatar>
                    <Box className="user-meta">
                      <Text className="user-name">{displayName}</Text>
                      <Text size="xs" className="muted">
                        Signed in
                      </Text>
                    </Box>
                    <IconChevronDown size={16} className="muted" />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item component={Link} to="/profile" leftSection={<IconUser size={16} />}>
                  Profile
                </Menu.Item>
                <Menu.Item component={Link} to="/settings" leftSection={<IconSettings size={16} />}>
                  Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={handleLogout}>
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="sm">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                component={Link}
                to={item.to}
                label={item.label}
                leftSection={<Icon size={18} />}
                rightSection={<IconChevronRight size={16} />}
                active={active}
                onClick={() => close()}
                variant={active ? 'filled' : 'light'}
              />
            );
          })}
        </Stack>
        <Divider my="lg" />
        <Box className="keyline">
          <Text size="xs" fw={600} tt="uppercase" className="muted">
            Tips
          </Text>
          <Text size="sm" mt={6}>
            Index docs after upload to enable grounded answers and citations.
          </Text>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box className="app-backdrop" />
        <Box className="page-shell">
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
