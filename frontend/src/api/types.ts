export type DocumentStatus = 'UPLOADED' | 'INDEXING' | 'INDEXED' | 'FAILED';

export type Document = {
  id: number;
  title: string;
  file: string;
  file_url?: string | null;
  created_at: string;
  status: DocumentStatus;
  chunks_count: number;
  last_indexed_at?: string | null;
  error_message?: string | null;
};

export type IndexJobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';

export type IndexJob = {
  id: number;
  document: number;
  status: IndexJobStatus;
  started_at?: string | null;
  finished_at?: string | null;
  error_message?: string | null;
  celery_task_id?: string | null;
};

export type AskSource = {
  citation: string;
  doc_title?: string | null;
  chunk_index: number;
  score: number;
  text?: string | null;
};

export type AskTraceStep = {
  name: string;
  detail?: string | null;
  ms: number;
};

export type AskTrace = {
  total_ms: number;
  hits: number;
  top_k: number;
  steps: AskTraceStep[];
};

export type AskResponse = {
  answer: string;
  sources?: AskSource[];
  trace?: AskTrace;
};
