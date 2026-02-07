import re


ARTICLE_PATTERN = re.compile(
    r"(?m)^(article|clause|section)\s+\d+[A-Za-z0-9\.\-\:]*\b.*$"
)


def chunk_by_articles(text):
    if not text:
        return []

    lines = text.splitlines()
    chunks = []
    current = []

    for line in lines:
        if ARTICLE_PATTERN.match(line.strip()):
            if current:
                chunks.append("\n".join(current).strip())
                current = []
        current.append(line)

    if current:
        chunks.append("\n".join(current).strip())

    cleaned = [chunk for chunk in chunks if chunk]
    return cleaned if cleaned else [text]
