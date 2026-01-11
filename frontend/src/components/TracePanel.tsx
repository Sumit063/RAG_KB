import { Card, Group, Progress, Stack, Text, Title } from '@mantine/core';
import type { AskTrace } from '../api/types';

type TracePanelProps = {
  trace?: AskTrace | null;
};

export default function TracePanel({ trace }: TracePanelProps) {
  if (!trace || !trace.steps || trace.steps.length === 0) {
    return null;
  }

  const maxMs = Math.max(...trace.steps.map((step) => step.ms));

  return (
    <Card withBorder radius="md" className="surface-card fade-in" data-delay="3" mt="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>Answer Trace</Title>
        <Text size="sm" className="muted">
          Total {trace.total_ms} ms · hits {trace.hits} · top_k {trace.top_k}
        </Text>
      </Group>
      <Stack gap="sm">
        {trace.steps.map((step, idx) => (
          <Stack key={`${step.name}-${idx}`} gap={6}>
            <Group justify="space-between">
              <Text fw={600}>{step.name}</Text>
              <Text size="sm" className="muted">
                {step.ms} ms
              </Text>
            </Group>
            {step.detail ? (
              <Text size="sm" className="muted">
                {step.detail}
              </Text>
            ) : null}
            <Progress value={Math.max(5, (step.ms / maxMs) * 100)} radius="xl" color="brand" />
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
