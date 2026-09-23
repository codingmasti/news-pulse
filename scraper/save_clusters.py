import os 
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import DBSCAN

load_dotenv()

mongodb_uri = os.getenv("MONGODB_URI")

#connect to mongodb
client = MongoClient(mongodb_uri)

db = client["NewsPulse"]

articles_collection = db["articles"]
clusters_collection = db["clusters"]

def get_articles():
    """
    Get articles that contain extracted article content.
    """
    return list(
        articles_collection.find({
            "content": {"$exists": True, "$ne": None }
        })
    )

def create_clusters(articles):
    """
    Create topic clusters using TF-IDF and DBSCAN.

    DBSCAN groups articles that are sufficiently similar
    and leaves unrelated articles as separate clusters.
    """

    if len(articles) < 2:
        print("Not enough articles for clustering")
        return []

    documents = [
        article.get("content", "")
        for article in articles
    ]

    # Convert article content into TF-IDF vectors
    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=5000
    )

    tfidf_matrix = vectorizer.fit_transform(documents)

    # DBSCAN uses cosine distance.
    # cosine distance = 1 - cosine similarity
    clustering = DBSCAN(
        eps=0.60,
        min_samples=2,
        metric="cosine"
    )

    labels = clustering.fit_predict(tfidf_matrix)

    clusters = []

    # DBSCAN label -1 means noise.
    # We keep noise articles as individual clusters
    # so every article remains visible in the timeline.
    unique_labels = sorted(set(labels))

    for label in unique_labels:

        if label == -1:
            continue

        cluster = [
            index
            for index, cluster_label in enumerate(labels)
            if cluster_label == label
        ]

        clusters.append(cluster)

    # Add noise articles as single-article clusters
    for index, label in enumerate(labels):

        if label == -1:
            clusters.append([index])

    return clusters

def generate_cluster_label(cluster_articles):
    """
    Generate a simple label for a cluster.

    For now, we use the title of the first article
    as the cluster label.
    """

    if not cluster_articles:
        return "Unknown Topic"

    first_article = cluster_articles[0]

    return first_article.get(
        "title",
        "Unknown Topic"
    )


def save_clusters(articles, clusters):
    """
    Save generated clusters into MongoDB.
    """

    # Remove old clusters before creating new ones.
    # This keeps the collection synchronized with
    # the latest clustering result.
    clusters_collection.delete_many({})

    saved_count = 0

    for cluster_number, cluster_indexes in enumerate(
        clusters,
        start=1
    ):

        # Get complete article documents
        cluster_articles = [
            articles[index]
            for index in cluster_indexes
        ]

        # Sort articles by published date
        cluster_articles.sort(
            key=lambda article: (
                article.get("publishedAt")
                or datetime.min
            )
        )

        # Get article IDs
        article_ids = [
            article["_id"]
            for article in cluster_articles
        ]

        # Get published dates
        published_dates = [
            article["publishedAt"]
            for article in cluster_articles
            if article.get("publishedAt")
        ]

        # Calculate earliest and latest article time
        earliest_published = (
            min(published_dates)
            if published_dates
            else None
        )

        latest_published = (
            max(published_dates)
            if published_dates
            else None
        )

        # Create cluster label
        cluster_label = generate_cluster_label(
            cluster_articles
        )

        # Create cluster document
        cluster_document = {
            "clusterId": cluster_number,
            "label": cluster_label,
            "articleIds": article_ids,
            "articleCount": len(article_ids),
            "earliestPublished": earliest_published,
            "latestPublished": latest_published,
            "similarityThreshold": 0.20
        }

        # Save cluster in MongoDB
        clusters_collection.insert_one(
            cluster_document
        )

        saved_count += 1

        print(
            f"Saved Cluster {cluster_number} "
            f"with {len(article_ids)} articles"
        )

    print("\n" + "=" * 60)
    print("CLUSTERING COMPLETE")
    print("=" * 60)
    print("Clusters saved:", saved_count)


if __name__ == "__main__":

    try:
        # Fetch articles
        articles = get_articles()

        print(
            f"Articles available: {len(articles)}"
        )

        # Create clusters
        clusters = create_clusters(articles)

        # Save clusters in MongoDB
        save_clusters(
            articles,
            clusters
        )

    except Exception as error:
        print("\nAn error occurred:")
        print(error)

    finally:
        # Close MongoDB connection
        client.close()