import {
  Accordion,
  Button,
  Card,
  Group,
  MultiSelect,
  NumberInput,
  Stack,
  Switch,
  Text,
  Textarea,
  Title
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMessageDots } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { askQuestion, listDocuments } from '../api/client';
import type { AskResponse, Document } from '../api/types';
import PageHeader from '../components/PageHeader';
import TracePanel from '../components/TracePanel';

export default function AskPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [question, setQuestion] = useState('');
  const [topK, setTopK] = useState<number | undefined>();
  const [searchAll, setSearchAll] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [explain, setExplain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<AskResponse | null>(null);

  useEffect(() => {
    listDocuments()
      .then((data) => setDocs(data.filter((doc) => doc.status === 'INDEXED')))
      .catch(() => {
        notifications.show({
          title: 'Failed to load documents',
          message: 'Upload and index documents to ask questions.',
          color: 'red'
        });
      });
  }, []);

  const docOptions = useMemo(
    () =>
      docs.map((doc) => ({
        value: String(doc.id),
        label: `${doc.title} (#${doc.id})`
      })),
    [docs]
  );

  const handleAsk = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) {
      notifications.show({
        title: 'Question required',
        message: 'Enter a question to continue.',
        color: 'red'
      });
      return;
    }
    if (!searchAll && selectedDocs.length === 0) {
      notifications.show({
        title: 'Select documents',
        message: 'Choose at least one document or search all.',
        color: 'red'
      });
      return;
    }

    setLoading(true);
    setAnswer(null);

    try {
      const payload = {
        question: question.trim(),
        top_k: topK || undefined,
        explain,
        doc_ids: searchAll ? undefined : selectedDocs.map((value) => Number(value))
      };
      const data = await askQuestion(payload);
      setAnswer(data);
    } catch (err) {
      notifications.show({
        title: 'Failed to get answer',
        message: err instanceof Error ? err.message : 'Unexpected error.',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Ask"
        subtitle="Answers are grounded strictly in your indexed documents."
      />

      <Card className="surface-card fade-in" withBorder>
        <form onSubmit={handleAsk}>
          <Stack gap="md">
            <Group align="flex-end" justify="space-between">
              <Switch
                checked={searchAll}
                onChange={(event) => setSearchAll(event.currentTarget.checked)}
                label="Search all indexed documents"
              />
              <Text size="xs" className="muted">
                {docs.length} indexed docs
              </Text>
            </Group>
            <MultiSelect
              label="Select documents"
              data={docOptions}
              placeholder={searchAll ? 'All documents selected' : 'Pick documents'}
              disabled={searchAll}
              value={selectedDocs}
              onChange={setSelectedDocs}
              searchable
            />
            <Textarea
              label="Question"
              minRows={4}
              placeholder="What does the policy say about data retention?"
              value={question}
              onChange={(event) => setQuestion(event.currentTarget.value)}
            />
            <Group align="flex-end" grow>
              <NumberInput
                label="TopK"
                placeholder="6"
                min={1}
                value={topK}
                onChange={(value) => setTopK(typeof value === 'number' ? value : undefined)}
              />
              <Switch
                label="Show answer trace"
                checked={explain}
                onChange={(event) => setExplain(event.currentTarget.checked)}
                mt="lg"
              />
            </Group>
            <Group justify="flex-end">
              <Button type="submit" leftSection={<IconMessageDots size={16} />} loading={loading}>
                Ask
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      {answer ? (
        <Card className="surface-card fade-in" withBorder>
          <Title order={4} mb="sm">
            Answer
          </Title>
          <Text>{answer.answer}</Text>
        </Card>
      ) : null}

      {answer?.sources && answer.sources.length > 0 ? (
        <Card className="surface-card fade-in" data-delay="2" withBorder>
          <Title order={4} mb="sm">
            Sources
          </Title>
          <Accordion variant="contained">
            {answer.sources.map((source, index) => {
              const citation = String(source.citation ?? index + 1);
              return (
              <Accordion.Item key={citation} value={citation}>
                <Accordion.Control>
                  [{citation}] {source.doc_title || 'Untitled'}
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="xs" className="muted" mb="xs">
                    Chunk {source.chunk_index} · Score {source.score}
                  </Text>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {source.text || ''}
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
            )})}
          </Accordion>
        </Card>
      ) : null}

      <TracePanel trace={answer?.trace} />
    </Stack>
  );
}
