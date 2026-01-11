from openai import OpenAI
from django.conf import settings


_client = OpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL)


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    response = _client.embeddings.create(
        model=settings.EMBED_MODEL,
        input=texts,
    )
    return [item.embedding for item in response.data]


def chat_complete(system: str, user: str) -> str:
    response = _client.chat.completions.create(
        model=settings.CHAT_MODEL,
        messages=[
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': user},
        ],
        temperature=0,
    )
    return response.choices[0].message.content.strip()
