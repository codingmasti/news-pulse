# News Pulse

A full-stack news aggregation and topic-clustering application that collects articles from multiple public RSS feeds, extracts article content, removes duplicates, groups related stories into topic clusters, and presents them through an interactive timeline.

## Features

* Aggregates news from BBC, NPR, and Al Jazeera RSS feeds
* Normalizes inconsistent RSS feed fields
* Extracts article body content using Trafilatura
* Prevents duplicate articles using unique article links
* Groups related articles using TF-IDF + DBSCAN
* Stores articles and clusters in MongoDB Atlas
* REST APIs built with Node.js and Express
* Interactive visual news timeline
* Cluster details in a side panel
* Search by topic
* Filter by news source
* Dashboard statistics
* Refresh and background ingestion status tracking

---

## Architecture

```text
RSS Feeds
   ↓
Python Scraper
   ↓
Article Extraction
   ↓
Duplicate Detection
   ↓
TF-IDF
   ↓
DBSCAN Clustering
   ↓
MongoDB Atlas
   ↓
Node.js / Express API
   ↓
React + Tailwind CSS
   ↓
Interactive News Timeline
```

---

## Tech Stack

| Layer              | Technology       |
| ------------------ | ---------------- |
| Scraper            | Python           |
| RSS Parsing        | Feedparser       |
| Article Extraction | Trafilatura      |
| Clustering         | Scikit-learn     |
| Backend            | Node.js, Express |
| Database           | MongoDB Atlas    |
| Frontend           | React, Vite      |
| Styling            | Tailwind CSS     |
| HTTP Client        | Axios            |

---

## Project Structure

```text
news-pulse/
│
├── scraper/
│   ├── rss_reader.py
│   ├── article_extractor.py
│   ├── save_articles.py
│   ├── save_clusters.py
│   ├── run_pipeline.py
│   └── ...
│
├── backend/
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── ...
│   └── ...
│
└── README.md
```

---

## Data Sources

The scraper currently uses three public RSS sources:

* BBC
* NPR
* Al Jazeera

Because RSS feeds can have different field structures, the scraper normalizes fields such as:

* Title
* Description/content
* Link
* Source
* Published date

Missing or inconsistent fields are handled where possible.

---

## Article Extraction

RSS feeds may contain only a summary of an article.

The application attempts to fetch the original article page and extract readable article content using **Trafilatura**.

If extraction fails for an individual article, the pipeline continues processing the remaining articles.

---

## Duplicate Handling

Articles are identified using their original URL.

Before inserting a new article, the scraper checks whether the link already exists.

MongoDB also uses a unique index on the `link` field to prevent duplicate records.

This allows the ingestion pipeline to be run repeatedly without creating duplicate articles.

---

## Clustering Approach

The application uses **TF-IDF + DBSCAN** to group related articles.

### TF-IDF

Article text is converted into TF-IDF vectors using:

```python
TfidfVectorizer(
    stop_words="english",
    max_features=5000
)
```

### DBSCAN

The vectors are clustered using cosine distance:

```python
DBSCAN(
    eps=0.60,
    min_samples=2,
    metric="cosine"
)
```

### Parameters

| Parameter      |   Value |
| -------------- | ------: |
| `max_features` |    5000 |
| `stop_words`   | English |
| `eps`          |    0.60 |
| `min_samples`  |       2 |
| `metric`       |  cosine |

DBSCAN may classify some articles as noise (`-1`). Instead of removing them, the application converts each noise article into a single-article cluster so that every processed article remains visible.

### Limitation

TF-IDF is based on textual similarity, so articles using similar vocabulary can sometimes be grouped even when they describe different events. More advanced semantic embeddings could improve clustering quality in a future version.

---

## Database

MongoDB Atlas is used for persistent storage.

The application uses the `NewsPulse` database with collections for:

```text
articles
clusters
```

---

## Backend API

| Method | Endpoint                | Purpose                |
| ------ | ----------------------- | ---------------------- |
| GET    | `/`                     | Backend health check   |
| GET    | `/clusters`             | Get all clusters       |
| GET    | `/clusters/:id`         | Get cluster details    |
| GET    | `/timeline`             | Get timeline data      |
| POST   | `/ingest/trigger`       | Start ingestion        |
| GET    | `/ingest/status/:jobId` | Check ingestion status |

### Ingestion Flow

```text
POST /ingest/trigger
        ↓
Python pipeline starts
        ↓
Frontend polls job status
        ↓
GET /ingest/status/:jobId
        ↓
Job completes
        ↓
GET /timeline
```

---

## Frontend

The React frontend provides:

### Visual Timeline

Clusters are displayed as a vertical timeline rather than a simple article list.

### Cluster Details

Clicking a cluster opens a side panel showing:

* Article headline
* Source
* Published date
* Original article link

### Search

Users can search topics by cluster label.

### Source Filter

Available filters:

```text
All
BBC
NPR
Al Jazeera
```

Search and source filtering can be used together.

### Dashboard

The dashboard displays:

```text
Topics
Articles
Sources
Last Updated
```

### Refresh

The Refresh button triggers a new ingestion job, monitors its status, and updates the timeline when processing is complete.

---

## Environment Variables

Create `.env` files for sensitive configuration.

### Scraper

```env
MONGODB_URI=your_mongodb_connection_string
```

### Backend

```env
MONGODB_URI=your_mongodb_connection_string
PORT=8000
```

Do not commit real credentials or connection strings to the repository.

---

## Local Setup

### 1. Clone

```bash
git clone <repository-url>
cd news-pulse
```

### 2. Scraper

```bash
cd scraper

python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure `.env`, then run:

```bash
python run_pipeline.py
```

### 3. Backend

```bash
cd ../backend
npm install
node server.js
```

Backend:

```text
http://localhost:8000
```

### 4. Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL provided by Vite.

---

## Error Handling

The application handles failures at multiple stages:

* Failed article extraction does not stop the complete scraper.
* Duplicate articles are skipped.
* Backend APIs return appropriate error responses.
* Ingestion jobs expose `running`, `completed`, and `failed` states.
* Frontend provides loading and empty states.

---

## Limitations

* RSS feed structure can change over time.
* Some article websites may block or prevent content extraction.
* TF-IDF clustering is based on textual similarity rather than semantic understanding.
* Ingestion job status is currently maintained in backend memory and can be lost if the server restarts.

---

## Future Improvements

* Semantic embeddings for improved clustering
* Better automatic cluster labels
* Persistent background job queue
* Additional news sources
* Improved cluster quality evaluation
* Production monitoring and logging
* Pagination for very large datasets

---

## License

This project was created as a technical assessment project.
