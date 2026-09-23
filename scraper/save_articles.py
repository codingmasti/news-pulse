import os
import feedparser

from pymongo import MongoClient
from dotenv import load_dotenv

from normalize import normaliz_article
from article_extractor import extract_article_text

load_dotenv()

mongodb_uri = os.getenv("MONGODB_URI")

client = MongoClient(mongodb_uri)

db = client["NewsPulse"]
articles_collection = db["articles"]


# RSS feeds used by the News Pulse ingestion pipeline
RSS_FEEDS = {
    "NPR": "https://feeds.npr.org/1001/rss.xml",
    "BBC": "https://feeds.bbci.co.uk/news/rss.xml",
    "Al Jazeera": "https://www.aljazeera.com/xml/rss/all.xml",
}


def article_exists(link):
    """
    Check whether an article already exists in MongoDB.

    The article link is used as the unique identifier
    to prevent duplicate articles.
    """
    return articles_collection.find_one(
        {"link": link},
        {"_id": 1}
    ) is not None


def save_articles():
    """
    Fetch articles from all RSS feeds.

    Existing articles are skipped before article extraction.
    Only new articles are fetched, extracted and saved.
    """

    total_saved = 0
    total_skipped = 0

    # Process each RSS feed one by one
    for source, rss_url in RSS_FEEDS.items():

        print(f"\nProcessing source: {source}")

        feed = feedparser.parse(rss_url)

        print(f"Found {len(feed.entries)} articles")

        # Process every article from the feed
        for article in feed.entries:

            # Get article URL
            link = article.get("link", "").strip()

            # Skip articles without a URL
            if not link:
                print("Skipping article without link.")
                continue

            # -------------------------------------------------
            # IMPORTANT:
            # Check duplicate BEFORE extracting article content.
            # This saves time because existing articles are skipped
            # without opening their webpages again.
            # -------------------------------------------------
            if article_exists(link):
                print("Already exists, skipping:", link)

                total_skipped += 1
                continue

            # Normalize RSS article data
            normalized_article = normaliz_article(
                source,
                article
            )

            print("\nExtracting:", normalized_article["title"])

            # Extract actual article body from webpage
            article_text = extract_article_text(link)

            if article_text:
                normalized_article["content"] = article_text
            else:
                normalized_article["content"] = None

                print("Could not extract article content.")

            # Save only new article
            articles_collection.insert_one(normalized_article)

            print("Saved successfully.")

            total_saved += 1

    print("\n" + "=" * 60)
    print("INGESTION COMPLETE")
    print("=" * 60)

    print("Articles saved:", total_saved)
    print("Articles skipped:", total_skipped)
    return total_saved


# Run ingestion when this file is executed directly
if __name__ == "__main__":

    try:
        save_articles()

    except Exception as error:

        print("\nAn error occurred during ingestion:")
        print(error)

    finally:

        # Always close MongoDB connection
        client.close()