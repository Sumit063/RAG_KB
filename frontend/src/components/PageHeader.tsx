import { Group, Stack, Text, Title } from '@mantine/core';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Group justify="space-between" align="flex-start" mb="lg">
      <Stack gap={4} className="fade-in">
        <Title order={1}>{title}</Title>
        {subtitle ? (
          <Text size="sm" className="muted">
            {subtitle}
          </Text>
        ) : null}
      </Stack>
      {actions ? <Group gap="sm">{actions}</Group> : null}
    </Group>
  );
}
