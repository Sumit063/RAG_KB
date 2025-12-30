REFUSAL_TEXT = "I don’t have enough information in the indexed documents."


def build_context(hits: list[dict]) -> str:
    lines = []
    for idx, hit in enumerate(hits, start=1):
        title = hit.get('doc_title') or 'Untitled'
        filename = hit.get('filename') or 'unknown'
        chunk_index = hit.get('chunk_index')
        lines.append(f"[{idx}] Title: {title} | File: {filename} | Chunk: {chunk_index}")
        lines.append(hit.get('text', ''))
    return '\n'.join(lines)


def system_prompt() -> str:
    return (
        "You are a careful assistant. Answer only using the provided context. "
        "If the answer is not fully contained in the context, reply exactly: "
        f"\"{REFUSAL_TEXT}\" "
        "Do not add any other text. "
        "When you provide an answer, include citations like [1], [2] that refer to the context blocks."
    )


def user_prompt(question: str, context: str) -> str:
    return (
        "Context:\n"
        f"{context}\n\n"
        "Question:\n"
        f"{question}\n"
    )
