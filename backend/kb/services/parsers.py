import os

from pypdf import PdfReader


def _ext_from_name(name: str) -> str:
    return os.path.splitext(name)[1].lower()


def load_text(file_path: str) -> str:
    ext = _ext_from_name(file_path)
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


def load_text_from_file(file_obj, filename: str) -> str:
    ext = _ext_from_name(filename)
    file_obj.seek(0)
    if ext == '.pdf':
        reader = PdfReader(file_obj)
        pages_text = []
        for page in reader.pages:
            pages_text.append(page.extract_text() or '')
        return '\n'.join(pages_text)

    if ext in {'.txt', '.md'}:
        data = file_obj.read()
        if isinstance(data, bytes):
            return data.decode('utf-8', errors='ignore')
        return str(data)

    raise ValueError(f"Unsupported file type: {ext}")
