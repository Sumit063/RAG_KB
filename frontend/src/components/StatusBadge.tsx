import { Badge } from '@mantine/core';
import type { DocumentStatus } from '../api/types';

const statusMap: Record<DocumentStatus, { label: string; color: string }> = {
  UPLOADED: { label: 'Uploaded', color: 'gray' },
  INDEXING: { label: 'Indexing', color: 'yellow' },
  INDEXED: { label: 'Indexed', color: 'brand' },
  FAILED: { label: 'Failed', color: 'red' }
};

type StatusBadgeProps = {
  status: DocumentStatus;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const mapped = statusMap[status] || { label: status, color: 'gray' };
  return (
    <Badge color={mapped.color} variant="light">
      {mapped.label}
    </Badge>
  );
}
