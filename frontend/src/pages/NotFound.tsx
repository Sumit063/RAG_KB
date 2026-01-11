import { Button, Card, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <Stack gap="lg" align="center">
      <Card className="surface-card fade-in" withBorder p="xl">
        <Stack gap="sm" align="center">
          <Title order={3}>Page not found</Title>
          <Text size="sm" className="muted">
            The page you are looking for does not exist.
          </Text>
          <Button component={Link} to="/dashboard">
            Back to dashboard
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
}
