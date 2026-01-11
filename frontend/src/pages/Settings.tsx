import { Card, Stack, Text } from '@mantine/core';
import PageHeader from '../components/PageHeader';

export default function SettingsPage() {
  return (
    <Stack gap="lg">
      <PageHeader title="Settings" subtitle="Workspace and UI preferences." />
      <Card className="surface-card fade-in" withBorder>
        <Text size="sm" className="muted">
          Settings will be added here.
        </Text>
      </Card>
    </Stack>
  );
}
