import {
  ActionIcon,
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowRight,
  IconBolt,
  IconCloudUpload,
  IconFileText,
  IconSparkles,
  IconTrash
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteDocument, getDocument, indexDocument, listDocuments, uploadDocument } from '../api/client';
import type { Document } from '../api/types';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';

export default function DashboardPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [indexingId, setIndexingId] = useState<number | null>(null);

  const loadDocs = useCallback(async () => {
    try {
      const data = await listDocuments();
      setDocs(data);
    } catch (err) {
      notifications.show({
        title: 'Failed to load documents',
        message: 'Check your API server and token.',
        color: 'red'
      });
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const statusCounts = useMemo(() => {
    const counts = { total: docs.length, indexed: 0, indexing: 0, failed: 0 };
    docs.forEach((doc) => {
      if (doc.status === 'INDEXED') {
        counts.indexed += 1;
      } else if (doc.status === 'INDEXING') {
        counts.indexing += 1;
      } else if (doc.status === 'FAILED') {
        counts.failed += 1;
      }
    });
    return counts;
  }, [docs]);

  const updateDoc = (updated: Document) => {
    setDocs((prev) => prev.map((doc) => (doc.id === updated.id ? updated : doc)));
  };

  const pollDocument = async (docId: number, attempts = 0) => {
    if (attempts > 40) {
      setIndexingId(null);
      return;
    }
    try {
      const updated = await getDocument(docId);
      updateDoc(updated);
      if (updated.status === 'INDEXED') {
        notifications.show({
          title: 'Indexing complete',
          message: `${updated.title} is ready for questions.`,
          color: 'brand'
        });
        setIndexingId(null);
        return;
      }
      if (updated.status === 'FAILED') {
        notifications.show({
          title: 'Indexing failed',
          message: updated.error_message || 'Check the worker logs for details.',
          color: 'red'
        });
        setIndexingId(null);
        return;
      }
    } catch (err) {
      setIndexingId(null);
      return;
    }

    setTimeout(() => {
      pollDocument(docId, attempts + 1);
    }, 2000);
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title || !file) {
      notifications.show({
        title: 'Missing fields',
        message: 'Provide a title and file before uploading.',
        color: 'red'
      });
      return;
    }

    setUploading(true);
    try {
      await uploadDocument(title, file);
      setTitle('');
      setFile(null);
      notifications.show({
        title: 'Upload complete',
        message: 'Document uploaded. Start indexing when ready.',
        color: 'brand'
      });
      loadDocs();
    } catch (err) {
      notifications.show({
        title: 'Upload failed',
        message: err instanceof Error ? err.message : 'Unexpected error.',
        color: 'red'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleIndex = async (docId: number) => {
    setIndexingId(docId);
    try {
      await indexDocument(docId);
      notifications.show({
        title: 'Indexing started',
        message: 'We will notify you when it finishes.',
        color: 'brand'
      });
      pollDocument(docId);
    } catch (err) {
      notifications.show({
        title: 'Failed to index',
        message: err instanceof Error ? err.message : 'Unexpected error.',
        color: 'red'
      });
      setIndexingId(null);
    }
  };

  const handleDelete = async (docId: number) => {
    const confirmed = window.confirm('Delete this document and its indexed chunks?');
    if (!confirmed) {
      return;
    }
    try {
      await deleteDocument(docId);
      notifications.show({
        title: 'Document deleted',
        message: 'The document has been removed from the knowledge base.',
        color: 'brand'
      });
      setDocs((prev) => prev.filter((doc) => doc.id !== docId));
    } catch (err) {
      notifications.show({
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Unexpected error.',
        color: 'red'
      });
    }
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Dashboard"
        subtitle="Upload documents, index them, and keep your knowledge base sharp."
      />

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        <Card className="surface-card fade-in" data-delay="1" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Documents</Title>
            <Badge variant="light" color="brand">
              {statusCounts.total}
            </Badge>
          </Group>
          <Text size="sm" className="muted">
            {statusCounts.indexed} indexed · {statusCounts.indexing} indexing · {statusCounts.failed} failed
          </Text>
        </Card>
        <Card className="surface-card fade-in" data-delay="2" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Indexing</Title>
            <IconBolt size={24} />
          </Group>
          <Text size="sm" className="muted">
            Keep the worker running to process new uploads. Indexing enables retrieval.
          </Text>
        </Card>
        <Card className="surface-card fade-in" data-delay="3" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Ask</Title>
            <IconSparkles size={24} />
          </Group>
          <Text size="sm" className="muted">
            Ask grounded questions and review citations for every answer.
          </Text>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card className="surface-card fade-in" data-delay="2" withBorder>
          <Group gap="sm" mb="md">
            <IconCloudUpload size={20} />
            <Title order={4}>Upload Document</Title>
          </Group>
          <Text size="sm" className="muted" mb="md">
            Supported: PDF, TXT, MD. Index after upload for retrieval.
          </Text>
          <form onSubmit={handleUpload}>
            <Stack gap="sm">
              <TextInput
                label="Title"
                placeholder="Quarterly report"
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
              />
              <FileInput
                label="File"
                placeholder="Pick a file"
                value={file}
                onChange={(value) => setFile(value)}
              />
              <Group justify="flex-end" mt="xs">
                <Button type="submit" leftSection={<IconCloudUpload size={16} />} loading={uploading}>
                  Upload
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>

        <Card className="surface-card fade-in" data-delay="3" withBorder>
          <Group gap="sm" mb="md">
            <IconFileText size={20} />
            <Title order={4}>Quick Tips</Title>
          </Group>
          <Stack gap="sm">
            <Text size="sm" className="muted">
              Index each document right after upload to enable Q&A.
            </Text>
            <Text size="sm" className="muted">
              Tune TopK in Ask to trade off recall and answer focus.
            </Text>
            <Text size="sm" className="muted">
              Use document filters when you need precise answers.
            </Text>
            <Text size="sm" className="muted">
              Enable trace to inspect retrieval timing and hits.
            </Text>
          </Stack>
        </Card>
      </SimpleGrid>

      <Card className="surface-card fade-in" data-delay="4" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>Documents</Title>
          <Text size="sm" className="muted">
            {docs.length} total
          </Text>
        </Group>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Title</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Chunks</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {docs.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text size="sm" className="muted">
                    No documents yet. Upload one to begin.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              docs.map((doc) => (
                <Table.Tr key={doc.id}>
                  <Table.Td>{doc.title}</Table.Td>
                  <Table.Td>
                    <StatusBadge status={doc.status} />
                  </Table.Td>
                  <Table.Td>{doc.chunks_count}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon component={Link} to={`/docs/${doc.id}`} variant="light">
                        <IconArrowRight size={16} />
                      </ActionIcon>
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconBolt size={14} />}
                        loading={indexingId === doc.id}
                        onClick={() => handleIndex(doc.id)}
                      >
                        Index
                      </Button>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(doc.id)}
                        aria-label="Delete document"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}
