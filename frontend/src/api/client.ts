import { TOKEN_KEY } from '../constants';
import { getStoredValue } from '../storage';
import type { AskResponse, Document, IndexJob } from './types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
};

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

function buildUrl(path: string): string {
  if (!path.startsWith('/')) {
    return `${BASE_URL}/${path}`;
  }
  return `${BASE_URL}${path}`;
}

async function parseJson(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}

export async function apiRequest<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>> {
  const opts: RequestOptions = options ? { ...options } : {};
  const headers = new Headers(opts.headers || undefined);

  if (!opts.skipAuth) {
    const token = getStoredValue(TOKEN_KEY);
    if (token) {
      headers.set('Authorization', `Token ${token}`);
    }
  }

  opts.headers = headers;

  const response = await fetch(buildUrl(path), opts);
  const data = await parseJson(response);
  return { ok: response.ok, status: response.status, data } as ApiResult<T>;
}

export async function loginWithToken(username: string, password: string): Promise<string> {
  const res = await apiRequest<{ token?: string; non_field_errors?: string[] }>(
    '/api/token/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      skipAuth: true
    }
  );

  if (!res.ok || !res.data?.token) {
    const message = res.data?.non_field_errors?.[0] || 'Login failed.';
    throw new Error(message);
  }

  return res.data.token;
}

export async function listDocuments(): Promise<Document[]> {
  const res = await apiRequest<Document[]>('/api/docs/');
  if (!res.ok || !res.data) {
    throw new Error('Failed to load documents.');
  }
  return res.data;
}

export async function getDocument(docId: number): Promise<Document> {
  const res = await apiRequest<Document>(`/api/docs/${docId}/`);
  if (!res.ok || !res.data) {
    throw new Error('Document not found.');
  }
  return res.data;
}

export async function uploadDocument(title: string, file: File): Promise<Document> {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('file', file);

  const res = await apiRequest<Document>('/api/docs/', {
    method: 'POST',
    body: formData
  });

  if (!res.ok || !res.data) {
    throw new Error('Upload failed.');
  }

  return res.data;
}

export async function indexDocument(docId: number): Promise<{ job_id: string; status: string }> {
  const res = await apiRequest<{ job_id: string; status: string }>(`/api/docs/${docId}/index/`, {
    method: 'POST'
  });

  if (!res.ok || !res.data) {
    throw new Error('Failed to start indexing.');
  }

  return res.data;
}

export async function deleteDocument(docId: number): Promise<void> {
  const res = await apiRequest<null>(`/api/docs/${docId}/`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    throw new Error('Failed to delete document.');
  }
}

export async function fetchJob(jobId: string): Promise<IndexJob> {
  const res = await apiRequest<IndexJob>(`/api/jobs/${jobId}/`);
  if (!res.ok || !res.data) {
    throw new Error('Job not found.');
  }
  return res.data;
}

export async function askQuestion(payload: {
  question: string;
  top_k?: number;
  doc_ids?: number[];
  explain?: boolean;
}): Promise<AskResponse> {
  const res = await apiRequest<AskResponse>('/api/ask/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok || !res.data) {
    throw new Error('Failed to get answer.');
  }

  return res.data;
}
