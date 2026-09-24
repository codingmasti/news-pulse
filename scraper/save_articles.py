import os
import feedparser

from pymongo import MongoClient
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

from normalize import normaliz_article
from article_extractor import extract_article_text

load_dotenv()

mongodb_uri = os.getenv("MONGODB_URI")

client = MongoClient(
    mongodb_uri,
    serverSelectionTimeoutMS=10000,
    connectTimeoutMS=10000,
)

db = client["NewsPulse"]
articles_collection = db["articles"]


RSS_FEEDS = {
    "NPR": "https://feeds.npr.org/1001/rss.xml",
    "BBC": "https://feeds.bbci.co.uk/news/rss.xml",
    "Al Jazeera": "https://www.aljazeera.com/xml/rss/all.xml",
}

MAX_WORKERS = 8


def extract_article(article_data):
    """
    Extract article content.
    Runs inside a worker thread.
    """

    source, article, link = article_data

    try:
        normalized_article = normaliz_article(
            source,
            article
        )

        print(f"Extracting: {normalized_article['title']}")

        article_text = extract_article_text(link)

        if article_text:
            normalized_article["content"] = article_text
        else:
            normalized_article["content"] = None
            print(f"Could not extract: {link}")

        return normalized_article

    except Exception as error:
        print(f"Failed to process: {link}")
        print(f"Error: {error}")

        return None


def save_articles():

    total_saved = 0
    total_skipped = 0

    # --------------------------------------------------
    # STEP 1: Collect new articles from all RSS feeds
    # --------------------------------------------------

    new_articles = []

    for source, rss_url in RSS_FEEDS.items():

        print(f"\nProcessing source: {source}")

        try:
            feed = feedparser.parse(rss_url)

            print(f"Found {len(feed.entries)} articles")

            for article in feed.entries:

                link = article.get("link", "").strip()

                if not link:
                    print("Skipping article without link.")
                    continue

                # Only check duplicate here.
                # Existing articles will not be extracted again.
                if articles_collection.find_one(
                    {"link": link},
                    {"_id": 1}
                ):
                    total_skipped += 1
                    continue

                new_articles.append(
                    (source, article, link)
                )

        except Exception as error:

            print(f"Failed to process RSS feed: {source}")
            print(f"Error: {error}")

    print("\n" + "=" * 60)
    print(f"NEW ARTICLES FOUND: {len(new_articles)}")
    print(f"ALREADY EXISTED: {total_skipped}")
    print("=" * 60)

    if not new_articles:
        print("No new articles to ingest.")
        return 0

    # --------------------------------------------------
    # STEP 2: Extract articles in parallel
    # --------------------------------------------------

    processed_articles = []

    print(
        f"\nStarting parallel extraction "
        f"with {MAX_WORKERS} workers..."
    )

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:

        futures = [
            executor.submit(
                extract_article,
                article_data
            )
            for article_data in new_articles
        ]

        for future in as_completed(futures):

            try:
                result = future.result()

                if result:
                    processed_articles.append(result)

            except Exception as error:

                print("Worker failed:")
                print(error)

    # --------------------------------------------------
    # STEP 3: Save all articles in one MongoDB operation
    # --------------------------------------------------

    if processed_articles:

        try:

            result = articles_collection.insert_many(
                processed_articles,
                ordered=False
            )

            total_saved = len(result.inserted_ids)

        except Exception as error:

            print("\nMongoDB bulk insert error:")
            print(error)

    # --------------------------------------------------
    # FINAL REPORT
    # --------------------------------------------------

    print("\n" + "=" * 60)
    print("INGESTION COMPLETE")
    print("=" * 60)

    print("Articles saved:", total_saved)
    print("Articles skipped:", total_skipped)
    print("Extraction failed:",
          len(new_articles) - len(processed_articles))

    return total_saved


if __name__ == "__main__":

    try:

        save_articles()

    except Exception as error:

        print("\nAn error occurred during ingestion:")
        print(error)

    finally:

        client.close()