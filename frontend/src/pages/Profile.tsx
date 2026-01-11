import { Card, Stack, Text } from '@mantine/core';
import PageHeader from '../components/PageHeader';

export default function ProfilePage() {
  return (
    <Stack gap="lg">
      <PageHeader title="Profile" subtitle="Account details and preferences." />
      <Card className="surface-card fade-in" withBorder>
        <Text size="sm" className="muted">
          Profile management will be added here.
        </Text>
      </Card>
    </Stack>
  );
}
