(function () {
  const h = React.createElement;
  const { useEffect, useMemo, useState } = React;

  const API_TOKEN = window.API_TOKEN || '';
  const USERNAME = window.USERNAME || '';
  const IS_SUPERUSER = !!window.IS_SUPERUSER;
  const CSRF_TOKEN = window.CSRF_TOKEN || '';
  const APP_CONFIG = window.APP_CONFIG || {};
  const ENABLE_REINDEX = APP_CONFIG.enableReindex !== false;

  function apiFetch(url, options) {
    const opts = options || {};
    opts.headers = opts.headers || {};
    if (API_TOKEN) {
      opts.headers['Authorization'] = 'Token ' + API_TOKEN;
    }
    return fetch(url, opts);
  }

  async function apiRequest(url, options) {
    const response = await apiFetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      data = await response.json();
    }
    return { ok: response.ok, status: response.status, data };
  }

  function useTheme() {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
      let saved = null;
      try {
        saved = localStorage.getItem('theme');
      } catch (err) {}
      if (saved) {
        setTheme(saved);
      }
    }, []);

    useEffect(() => {
      document.documentElement.setAttribute('data-theme', theme);
      try {
        localStorage.setItem('theme', theme);
      } catch (err) {}
    }, [theme]);

    return [theme, setTheme];
  }

  function StatusPill(props) {
    const status = props.status || 'UNKNOWN';
    return h('span', { className: 'pill status status-' + status.toLowerCase() }, status);
  }

  function Header(props) {
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
      function onClick(event) {
        if (!event.target.closest('.user-menu')) {
          setMenuOpen(false);
        }
      }
      document.addEventListener('click', onClick);
      return () => document.removeEventListener('click', onClick);
    }, []);

    const navLinks = [
      { href: '/dashboard/', label: 'Dashboard' },
      { href: '/ask/', label: 'Ask' },
    ];
    if (IS_SUPERUSER) {
      navLinks.push({ href: '/admin/', label: 'Admin' });
    }

    const path = window.location.pathname;

    return h(
      'header',
      { className: 'top-bar' },
      h('div', { className: 'brand' }, 'RAG KB'),
      h(
        'nav',
        { className: 'top-nav' },
        navLinks.map((link) =>
          h(
            'a',
            {
              key: link.href,
              href: link.href,
              className: path.startsWith(link.href) ? 'active' : '',
            },
            link.label
          )
        )
      ),
      h(
        'div',
        { className: 'top-actions' },
        h(
          'button',
          {
            className: 'btn btn-ghost',
            type: 'button',
            onClick: () => props.onToggleTheme(),
          },
          props.theme === 'dark' ? 'Light' : 'Dark'
        ),
        h(
          'div',
          { className: 'user-menu' + (menuOpen ? ' open' : '') },
          h(
            'button',
            {
              className: 'user-menu-trigger',
              type: 'button',
              onClick: (event) => {
                event.stopPropagation();
                setMenuOpen(!menuOpen);
              },
              'aria-expanded': menuOpen ? 'true' : 'false',
            },
            h('span', { className: 'user-chip' }, USERNAME || 'User'),
            h('span', { className: 'caret' }, '▾')
          ),
          h(
            'div',
            { className: 'user-menu-panel' },
            h('a', { href: '/profile/' }, 'Profile'),
            h('a', { href: '/settings/' }, 'Settings'),
            h(
              'form',
              { method: 'post', action: '/logout/' },
              h('input', {
                type: 'hidden',
                name: 'csrfmiddlewaretoken',
                value: CSRF_TOKEN,
              }),
              h(
                'button',
                { className: 'btn btn-danger btn-block', type: 'submit' },
                'Sign out'
              )
            )
          )
        )
      )
    );
  }

  function PageHeader(props) {
    return h(
      'div',
      { className: 'page-header' },
      h('div', null, h('h1', null, props.title), props.subtitle && h('p', { className: 'muted' }, props.subtitle)),
      props.actions ? h('div', { className: 'page-actions' }, props.actions) : null
    );
  }

  function EmptyState(props) {
    return h('div', { className: 'empty' }, props.children);
  }

  function DashboardView() {
    const [docs, setDocs] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const loadDocs = async () => {
      const res = await apiRequest('/api/docs/');
      if (res.ok) {
        setDocs(res.data || []);
      }
    };

    useEffect(() => {
      loadDocs();
    }, []);

    const updateDoc = (doc) => {
      setDocs((prev) => prev.map((item) => (item.id === doc.id ? doc : item)));
    };

    const pollDoc = async (docId) => {
      const res = await apiRequest('/api/docs/' + docId + '/');
      if (res.ok && res.data) {
        updateDoc(res.data);
        if (res.data.status === 'INDEXED') {
          setMessage('Indexing complete.');
          setError('');
          setTimeout(() => setMessage(''), 4000);
        } else if (res.data.status === 'FAILED') {
          setMessage('');
          setError(res.data.error_message ? 'Indexing failed: ' + res.data.error_message : 'Indexing failed.');
        }
        if (res.data.status !== 'INDEXED' && res.data.status !== 'FAILED') {
          setTimeout(() => pollDoc(docId), 2000);
        }
      }
    };

    const handleIndex = async (docId) => {
      setMessage('Indexing started...');
      setError('');
      const res = await apiRequest('/api/docs/' + docId + '/index/', { method: 'POST' });
      if (!res.ok) {
        setError('Failed to start indexing.');
        setMessage('');
        return;
      }
      pollDoc(docId);
    };

    const handleUpload = async (event) => {
      event.preventDefault();
      if (!title || !file) {
        setError('Title and file are required.');
        return;
      }
      setLoading(true);
      setMessage('Uploading...');
      setError('');

      const formData = new FormData();
      formData.append('title', title);
      formData.append('file', file);

      const res = await apiFetch('/api/docs/', {
        method: 'POST',
        body: formData,
      });

      setLoading(false);
      if (!res.ok) {
        setError('Upload failed.');
        return;
      }
      setTitle('');
      setFile(null);
      setMessage('Uploaded successfully.');
      loadDocs();
    };

    return h(
      'div',
      { className: 'page' },
      h(PageHeader, {
        title: 'Dashboard',
        subtitle: 'Upload documents, index them, and ask questions with citations.',
      }),
      h(
        'div',
        { className: 'grid-2' },
        h(
          'div',
          { className: 'card' },
          h('h2', null, 'Upload Document'),
          h('p', { className: 'muted' }, 'Supported formats: PDF, TXT, MD. Index after upload.'),
          h(
            'form',
            { className: 'form-grid', onSubmit: handleUpload },
            h(
              'label',
              null,
              'Title',
              h('input', {
                type: 'text',
                value: title,
                onChange: (e) => setTitle(e.target.value),
                placeholder: 'Quarterly report',
              })
            ),
            h(
              'label',
              null,
              'File',
              h('input', {
                type: 'file',
                onChange: (e) => setFile(e.target.files[0] || null),
              })
            ),
            h(
              'div',
              { className: 'form-actions' },
              h(
                'button',
                { className: 'btn btn-primary', type: 'submit', disabled: loading },
                loading ? 'Uploading...' : 'Upload'
              )
            )
          ),
          message && h('div', { className: 'notice info' }, message),
          error && h('div', { className: 'notice error' }, error)
        ),
        h(
          'div',
          { className: 'card' },
          h('h2', null, 'Quick Tips'),
          h(
            'ul',
            { className: 'tip-list' },
            h('li', null, 'Index each document after upload for retrieval.'),
            h('li', null, 'Use TopK to adjust how many chunks are searched.'),
            h('li', null, 'Enable trace to see timing per step.'),
            h('li', null, 'Use document filters for precise answers.')
          )
        )
      ),
      h(
        'div',
        { className: 'card' },
        h('h2', null, 'Documents'),
        docs.length === 0
          ? h(EmptyState, null, 'No documents yet. Upload one to begin.')
          : h(
              'table',
              { className: 'table' },
              h(
                'thead',
                null,
                h('tr', null, h('th', null, 'Title'), h('th', null, 'Status'), h('th', null, 'Chunks'), h('th', null, 'Actions'))
              ),
              h(
                'tbody',
                null,
                docs.map((doc) => {
                  const canIndex = doc.status !== 'INDEXED' || ENABLE_REINDEX;
                  const indexLabel = doc.status === 'INDEXED' ? 'Re-index' : 'Index';
                  return h(
                    'tr',
                    { key: doc.id },
                    h('td', null, doc.title),
                    h('td', null, h(StatusPill, { status: doc.status })),
                    h('td', null, doc.chunks_count),
                    h(
                      'td',
                      null,
                      h(
                        'div',
                        { className: 'table-actions' },
                        h(
                          'a',
                          { className: 'btn btn-ghost btn-small', href: '/docs/' + doc.id + '/' },
                          'View'
                        ),
                        canIndex
                          ? h(
                              'button',
                              {
                                className: 'btn btn-secondary btn-small',
                                type: 'button',
                                onClick: () => handleIndex(doc.id),
                              },
                              indexLabel
                            )
                          : null
                      )
                    )
                  );
                })
              )
            )
      )
    );
  }

  function DocDetailView(props) {
    const [doc, setDoc] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
      apiRequest('/api/docs/' + props.docId + '/').then((res) => {
        if (res.ok) {
          setDoc(res.data);
        } else {
          setError('Document not found.');
        }
      });
    }, [props.docId]);

    const pollDoc = async () => {
      const res = await apiRequest('/api/docs/' + props.docId + '/');
      if (res.ok && res.data) {
        setDoc(res.data);
        if (res.data.status === 'INDEXED') {
          setMessage('Indexing complete.');
          setError('');
          setTimeout(() => setMessage(''), 4000);
        } else if (res.data.status === 'FAILED') {
          setMessage('');
          setError(res.data.error_message ? 'Indexing failed: ' + res.data.error_message : 'Indexing failed.');
        }
        if (res.data.status !== 'INDEXED' && res.data.status !== 'FAILED') {
          setTimeout(() => pollDoc(), 2000);
        }
      }
    };

    const handleIndex = async () => {
      setMessage('Indexing started...');
      setError('');
      const res = await apiRequest('/api/docs/' + props.docId + '/index/', { method: 'POST' });
      if (!res.ok) {
        setError('Failed to start indexing.');
        setMessage('');
        return;
      }
      pollDoc();
    };

    if (!doc) {
      return h('div', { className: 'page' }, h(PageHeader, { title: 'Document' }), error && h('div', { className: 'notice error' }, error));
    }

    const canIndex = doc.status !== 'INDEXED' || ENABLE_REINDEX;
    const indexLabel = doc.status === 'INDEXED' ? 'Re-index' : 'Index';
    const fileLabel = doc.original_filename || doc.file || 'Unavailable';
    const fileUrl = doc.file_url || '';

    return h(
      'div',
      { className: 'page' },
      h(PageHeader, {
        title: doc.title,
        subtitle: 'Review document status and re-index as needed.',
        actions: h(
          'div',
          { className: 'page-actions' },
          canIndex
            ? h(
                'button',
                { className: 'btn btn-secondary', type: 'button', onClick: handleIndex },
                indexLabel
              )
            : null,
          h('a', { className: 'btn btn-ghost', href: '/ask/' }, 'Ask')
        ),
      }),
      h(
        'div',
        { className: 'card' },
        h('div', { className: 'detail-grid' },
          h('div', null, h('div', { className: 'detail-label' }, 'Status'), h(StatusPill, { status: doc.status })),
          h('div', null, h('div', { className: 'detail-label' }, 'Chunks'), h('div', { className: 'detail-value' }, doc.chunks_count)),
          h('div', null, h('div', { className: 'detail-label' }, 'Uploaded'), h('div', { className: 'detail-value' }, doc.created_at || '-')),
          h('div', null, h('div', { className: 'detail-label' }, 'Last indexed'), h('div', { className: 'detail-value' }, doc.last_indexed_at || '-')),
          h('div', null, h('div', { className: 'detail-label' }, 'File'),
            fileUrl ? h('a', { href: fileUrl }, fileLabel) : h('div', { className: 'detail-value' }, fileLabel)
          )
        ),
        message && h('div', { className: 'notice info' }, message),
        error && h('div', { className: 'notice error' }, error)
      )
    );
  }

  function TracePanel(props) {
    const trace = props.trace;
    if (!trace || !trace.steps || trace.steps.length === 0) {
      return null;
    }

    const maxMs = trace.steps.reduce((max, step) => (step.ms > max ? step.ms : max), 1);

    return h(
      'div',
      { className: 'card trace' },
      h('div', { className: 'trace-header' },
        h('h2', null, 'Answer Trace'),
        h(
          'div',
          { className: 'trace-summary' },
          'Total ',
          trace.total_ms,
          ' ms · hits ',
          trace.hits,
          ' · top_k ',
          trace.top_k
        )
      ),
      h(
        'div',
        { className: 'trace-list' },
        trace.steps.map((step, idx) =>
          h(
            'div',
            { className: 'trace-row', key: idx },
            h('div', { className: 'trace-info' },
              h('div', { className: 'trace-title' }, step.name),
              h('div', { className: 'trace-detail' }, step.detail || '')
            ),
            h('div', { className: 'trace-meta' }, step.ms + ' ms'),
            h('div', { className: 'trace-bar' },
              h('span', { style: { width: Math.max(6, (step.ms / maxMs) * 100) + '%' } })
            )
          )
        )
      )
    );
  }

  function AskView() {
    const [docs, setDocs] = useState([]);
    const [question, setQuestion] = useState('');
    const [topK, setTopK] = useState('');
    const [allDocs, setAllDocs] = useState(true);
    const [selectedDocIds, setSelectedDocIds] = useState([]);
    const [explain, setExplain] = useState(false);
    const [answer, setAnswer] = useState('');
    const [sources, setSources] = useState([]);
    const [trace, setTrace] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      apiRequest('/api/docs/').then((res) => {
        if (res.ok) {
          const indexed = (res.data || []).filter((doc) => doc.status === 'INDEXED');
          setDocs(indexed);
        }
      });
    }, []);

    const handleAsk = async (event) => {
      event.preventDefault();
      if (!question.trim()) {
        setError('Question is required.');
        return;
      }
      if (!allDocs && selectedDocIds.length === 0) {
        setError('Select at least one document or search all.');
        return;
      }

      setLoading(true);
      setError('');
      setMessage('Thinking...');
      setAnswer('');
      setSources([]);
      setTrace(null);

      const payload = { question: question.trim() };
      if (topK) {
        payload.top_k = parseInt(topK, 10);
      }
      if (explain) {
        payload.explain = true;
      }
      if (!allDocs) {
        payload.doc_ids = selectedDocIds;
      }

      const res = await apiRequest('/api/ask/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setLoading(false);
      if (!res.ok) {
        if (res.status === 401) {
          setError('Unauthorized. Please sign in again.');
        } else if (res.status === 429) {
          setError('Rate limit exceeded. Try again later.');
        } else {
          setError('Failed to get an answer.');
        }
        setMessage('');
        return;
      }

      setMessage('');
      setAnswer(res.data.answer || '');
      setSources(res.data.sources || []);
      setTrace(res.data.trace || null);
    };

    return h(
      'div',
      { className: 'page' },
      h(PageHeader, {
        title: 'Ask a Question',
        subtitle: 'Answers are grounded only in your indexed documents.',
      }),
      h(
        'div',
        { className: 'card' },
        h(
          'form',
          { className: 'form-grid', onSubmit: handleAsk },
          h(
            'label',
            null,
            'Search scope',
            h(
              'div',
              { className: 'toggle-row' },
              h('label', { className: 'toggle' },
                h('input', {
                  type: 'checkbox',
                  checked: allDocs,
                  onChange: (e) => setAllDocs(e.target.checked),
                }),
                h('span', null, 'Search all indexed documents')
              ),
              h('span', { className: 'muted small' }, docs.length ? docs.length + ' indexed' : 'No indexed docs')
            ),
            h(
              'select',
              {
                multiple: true,
                disabled: allDocs,
                value: selectedDocIds.map(String),
                onChange: (e) => {
                  const values = Array.from(e.target.selectedOptions).map((opt) => parseInt(opt.value, 10));
                  setSelectedDocIds(values);
                },
              },
              docs.map((doc) => h('option', { key: doc.id, value: doc.id }, doc.title + ' (#' + doc.id + ')'))
            )
          ),
          h(
            'label',
            null,
            'Question',
            h('textarea', {
              rows: 4,
              value: question,
              onChange: (e) => setQuestion(e.target.value),
              placeholder: 'What does the policy say about data retention?',
            })
          ),
          h(
            'div',
            { className: 'form-row' },
            h(
              'label',
              null,
              'TopK',
              h('input', {
                type: 'number',
                min: 1,
                value: topK,
                onChange: (e) => setTopK(e.target.value),
                placeholder: '6',
              })
            ),
            h(
              'label',
              { className: 'toggle' },
              h('input', {
                type: 'checkbox',
                checked: explain,
                onChange: (e) => setExplain(e.target.checked),
              }),
              h('span', null, 'Show answer trace')
            )
          ),
          h(
            'div',
            { className: 'form-actions' },
            h(
              'button',
              { className: 'btn btn-primary', type: 'submit', disabled: loading },
              loading ? 'Working...' : 'Ask'
            )
          )
        ),
        message && h('div', { className: 'notice info' }, message),
        error && h('div', { className: 'notice error' }, error)
      ),
      answer &&
        h(
          'div',
          { className: 'card' },
          h('h2', null, 'Answer'),
          h('div', { className: 'answer' }, answer)
        ),
      h(TracePanel, { trace: trace }),
      sources && sources.length > 0
        ? h(
            'div',
            { className: 'card' },
            h('h2', null, 'Sources'),
            h(
              'div',
              { className: 'sources' },
              sources.map((src) =>
                h(
                  'details',
                  { key: src.citation },
                  h('summary', null, '[' + src.citation + '] ' + (src.doc_title || 'Untitled')),
                  h('div', { className: 'source-meta' }, 'Chunk ' + src.chunk_index + ' · Score ' + src.score),
                  h('pre', null, src.text || '')
                )
              )
            )
          )
        : null
    );
  }

  function ProfileView() {
    return h(
      'div',
      { className: 'page' },
      h(PageHeader, { title: 'Profile', subtitle: 'Account details and preferences.' }),
      h('div', { className: 'card' }, h('div', { className: 'notice info' }, 'Coming soon.'))
    );
  }

  function SettingsView() {
    return h(
      'div',
      { className: 'page' },
      h(PageHeader, { title: 'Settings', subtitle: 'Workspace and UI preferences.' }),
      h('div', { className: 'card' }, h('div', { className: 'notice info' }, 'Coming soon.'))
    );
  }

  function App() {
    const [theme, setTheme] = useTheme();
    const path = window.location.pathname;

    let view = h(DashboardView, null);
    if (path.startsWith('/docs/')) {
      const match = path.match(/\/docs\/(\d+)\//);
      if (match) {
        view = h(DocDetailView, { docId: match[1] });
      }
    } else if (path.startsWith('/ask/')) {
      view = h(AskView, null);
    } else if (path.startsWith('/profile/')) {
      view = h(ProfileView, null);
    } else if (path.startsWith('/settings/')) {
      view = h(SettingsView, null);
    }

    return h(
      'div',
      { className: 'app-shell' },
      h(Header, { theme: theme, onToggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }),
      h('main', { className: 'app-main' }, view)
    );
  }

  function init() {
    const root = document.getElementById('app');
    if (!root) return;
    ReactDOM.createRoot(root).render(h(App, null));
  }

  init();
})();
