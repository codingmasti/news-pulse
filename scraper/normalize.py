from datetime import datetime;

def normaliz_article(source, article):
    title = article.get("title","").strip()
    link = article.get("link", "").strip()

    description = (
        article.get("summry") or article.get("description") or ""
    ).strip()

    published = article.get("published")

    published_at = None

    if published:
        try:
            published_at = datetime(*article.published_parsed[:6])
        except Exception:
            published_at = None
    return {
        "source": source,
        "title": title,
        "link": link,
        "publishedAt": published_at,
        "description": description
    }