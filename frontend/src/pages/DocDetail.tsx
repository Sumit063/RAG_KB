import { Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBolt, IconMessageDots, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteDocument, getDocument, indexDocument } from '../api/client';
import type { Document } from '../api/types';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';

export default function DocDetailPage() {
  const { id } = useParams();
  const docId = Number(id);
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }
    getDocument(docId)
      .then((data) => setDoc(data))
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, [docId]);

  const pollDocument = async (attempts = 0) => {
    if (!docId || attempts > 40) {
      setIndexing(false);
      return;
    }
    try {
      const updated = await getDocument(docId);
      setDoc(updated);
      if (updated.status === 'INDEXED') {
        notifications.show({
          title: 'Indexing complete',
          message: `${updated.title} is ready for questions.`,
          color: 'brand'
        });
        setIndexing(false);
        return;
      }
      if (updated.status === 'FAILED') {
        notifications.show({
          title: 'Indexing failed',
          message: updated.error_message || 'Check the worker logs for details.',
          color: 'red'
        });
        setIndexing(false);
        return;
      }
    } catch (err) {
      setIndexing(false);
      return;
    }

    setTimeout(() => pollDocument(attempts + 1), 2000);
  };

  const handleIndex = async () => {
    if (!docId) return;
    setIndexing(true);
    try {
      await indexDocument(docId);
      notifications.show({
        title: 'Indexing started',
        message: 'We will notify you when it finishes.',
        color: 'brand'
      });
      pollDocument();
    } catch (err) {
      notifications.show({
        title: 'Failed to index',
        message: err instanceof Error ? err.message : 'Unexpected error.',
        color: 'red'
      });
      setIndexing(false);
    }
  };

  const handleDelete = async () => {
    if (!docId) return;
    const confirmed = window.confirm('Delete this document and its indexed chunks?');
    if (!confirmed) {
      return;
    }
    setDeleting(true);
    try {
      await deleteDocument(docId);
      notifications.show({
        title: 'Document deleted',
        message: 'The document has been removed from the knowledge base.',
        color: 'brand'
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      notifications.show({
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Unexpected error.',
        color: 'red'
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Stack gap="lg">
        <PageHeader title="Document" subtitle="Loading document details." />
      </Stack>
    );
  }

  if (!doc) {
    return (
      <Stack gap="lg">
        <PageHeader title="Document" subtitle="Document not found." />
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title={doc.title}
        subtitle="Review status, metadata, and indexing details."
        actions={
          <Group>
            <Button variant="light" leftSection={<IconMessageDots size={16} />} component={Link} to="/ask">
              Ask
            </Button>
            <Button leftSection={<IconBolt size={16} />} loading={indexing} onClick={handleIndex}>
              Re-index
            </Button>
            <Button
              color="red"
              variant="light"
              leftSection={<IconTrash size={16} />}
              loading={deleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </Group>
        }
      />

      <Card className="surface-card fade-in" withBorder>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Stack gap={4}>
            <Text size="xs" className="muted">
              Status
            </Text>
            <StatusBadge status={doc.status} />
          </Stack>
          <Stack gap={4}>
            <Text size="xs" className="muted">
              Chunks
            </Text>
            <Title order={4}>{doc.chunks_count}</Title>
          </Stack>
          <Stack gap={4}>
            <Text size="xs" className="muted">
              Uploaded
            </Text>
            <Text>{doc.created_at || '-'}</Text>
          </Stack>
          <Stack gap={4}>
            <Text size="xs" className="muted">
              Last indexed
            </Text>
            <Text>{doc.last_indexed_at || '-'}</Text>
          </Stack>
          <Stack gap={4}>
            <Text size="xs" className="muted">
              File
            </Text>
            <Text component="a" href={doc.file_url || doc.file} target="_blank" rel="noreferrer">
              {doc.file}
            </Text>
          </Stack>
          {doc.error_message ? (
            <Stack gap={4}>
              <Text size="xs" className="muted">
                Error
              </Text>
              <Text c="red">{doc.error_message}</Text>
            </Stack>
          ) : null}
        </SimpleGrid>
      </Card>
    </Stack>
  );
}
