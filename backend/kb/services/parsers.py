import os

from pypdf import PdfReader


def load_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        reader = PdfReader(file_path)
        pages_text = []
        for page in reader.pages:
            pages_text.append(page.extract_text() or '')
        return '\n'.join(pages_text)

    if ext in {'.txt', '.md'}:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as handle:
            return handle.read()

    raise ValueError(f"Unsupported file type: {ext}")
