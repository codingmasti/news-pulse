# News Pulse

A full-stack news aggregation and topic-clustering application that collects articles from multiple public RSS feeds, extracts article content, removes duplicates, groups related stories into topic clusters, and presents them through an interactive timeline.

## Features

* Aggregates news from BBC, NPR, and Al Jazeera RSS feeds
* Normalizes inconsistent RSS feed fields
* Extracts article body content using Requests + Trafilatura
* Performs article extraction concurrently using Python ThreadPoolExecutor
* Prevents duplicate articles using unique article links
* Saves new articles using MongoDB bulk insertion
* Groups related articles using TF-IDF + DBSCAN
* Stores articles and clusters in MongoDB Atlas
* REST APIs built with Node.js and Express
* Interactive visual news timeline
* Cluster details in a side panel
* Search by topic
* Filter by news source
* Dashboard statistics
* Asynchronous refresh and background ingestion status tracking

---

## Architecture

```text
RSS Feeds
    ↓
Python Scraper
    ↓
RSS Normalization
    ↓
Duplicate Detection
    ↓
Parallel Article Extraction
    ↓
MongoDB Articles
    ↓
TF-IDF
    ↓
DBSCAN Clustering
    ↓
MongoDB Clusters
    ↓
Node.js / Express API
    ↓
React + Tailwind CSS
    ↓
Interactive News Timeline
```

---

## Tech Stack

| Layer               | Technology         |
| ------------------- | ------------------ |
| Scraper             | Python             |
| RSS Parsing         | Feedparser         |
| HTTP Requests       | Requests           |
| Article Extraction  | Trafilatura        |
| Parallel Processing | ThreadPoolExecutor |
| Clustering          | Scikit-learn       |
| Backend             | Node.js, Express   |
| Database            | MongoDB Atlas      |
| Frontend            | React, Vite        |
| Styling             | Tailwind CSS       |
| HTTP Client         | Axios              |

---

## Project Structure

```text
news-pulse/
│
├── scraper/
│   ├── rss_reader.py
│   ├── article_extractor.py
│   ├── normalize.py
│   ├── save_articles.py
│   ├── save_clusters.py
│   ├── run_pipeline.py
│   ├── app.py
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

The application attempts to fetch the original article page and extract readable article content using **Requests** and **Trafilatura**.

Article extraction uses a `ThreadPoolExecutor` with up to **8 workers**, allowing multiple article pages to be processed concurrently instead of waiting for each article sequentially.

A request timeout is also used so that a slow or unavailable article page does not block the complete ingestion process.

If extraction fails for an individual article, the pipeline continues processing the remaining articles.

---

## Duplicate Handling

Articles are identified using their original URL.

Before extracting article content, the scraper checks whether the link already exists in MongoDB.

Existing articles are skipped without requesting their webpages again. This avoids unnecessary network requests and reduces ingestion time.

MongoDB also uses a unique index on the `link` field to prevent duplicate records.

This allows the ingestion pipeline to be run repeatedly without creating duplicate articles.

---

## Optimized Ingestion

The ingestion pipeline is optimized in two main areas:

### Parallel Article Extraction

New article pages are extracted concurrently using:

```python
ThreadPoolExecutor(max_workers=8)
```

This allows multiple network requests to run at the same time.

### Bulk MongoDB Insert

Instead of inserting every article individually with `insert_one()`, successfully processed articles are saved using:

```python
insert_many(processed_articles, ordered=False)
```

This reduces the number of individual database operations during ingestion.

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

A unique index is maintained on the article `link` field to prevent duplicate records.

---

## Backend API

| Method | Endpoint                | Purpose                      |
| ------ | ----------------------- | ---------------------------- |
| GET    | `/`                     | Backend health check         |
| GET    | `/clusters`             | Get all clusters             |
| GET    | `/clusters/:id`         | Get cluster details          |
| GET    | `/timeline`             | Get timeline data            |
| POST   | `/ingest/trigger`       | Start asynchronous ingestion |
| GET    | `/ingest/status/:jobId` | Check ingestion status       |

---

## Ingestion Flow

The ingestion process is asynchronous so that the frontend does not have to wait for the complete scraper operation inside the initial trigger request.

```text
Frontend
   ↓
POST /ingest/trigger
   ↓
Backend creates jobId
   ↓
HTTP 202 response
   ↓
Backend starts scraper in background
   ↓
Python Scraper
   ↓
RSS → Duplicate Check → Extraction → MongoDB
   ↓
Job status updated
   ↓
Frontend polls /ingest/status/:jobId
   ↓
Job completed
   ↓
Frontend fetches /timeline
   ↓
Timeline updated
```

Possible ingestion job states:

```text
running
completed
failed
```

If the scraper encounters an error, the job is marked as `failed` and the error message is stored with the job status.

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

The Refresh button starts a new asynchronous ingestion job.

The frontend:

1. Sends `POST /ingest/trigger`
2. Receives a `jobId`
3. Polls `/ingest/status/:jobId`
4. Waits until the job is completed
5. Fetches the latest timeline
6. Updates the dashboard

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
SCRAPER_URL=http://localhost:10000
PORT=8000
```

### Frontend

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

For production, `VITE_API_URL` should point to the deployed backend URL.

Do not commit real credentials or connection strings to the repository.

---

## Local Setup

### 1. Clone

```bash
git clone https://github.com/codingmasti/news-pulse.git
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

The scraper service can also be started with:

```bash
python app.py
```

### 3. Backend

Open another terminal:

```bash
cd backend
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

## Deployment

The application is deployed as three services:

### Frontend

React/Vite frontend deployed as a Render Static Site.

Production API URL is configured using:

```env
VITE_API_URL=https://news-pulse-backend-6xah.onrender.com
```

### Backend

Node.js/Express backend deployed on Render.

The backend communicates with the scraper through:

```env
SCRAPER_URL=https://news-pulse-scraper-rkpj.onrender.com
```

### Scraper

Python/Flask scraper service deployed on Render.

The scraper connects to MongoDB Atlas using:

```env
MONGODB_URI=your_mongodb_connection_string
```

### Deployment Architecture

```text
User Browser
     ↓
React Frontend
     ↓
Node.js / Express Backend
     ↓
Python / Flask Scraper
     ↓
MongoDB Atlas
```

---

## Error Handling

The application handles failures at multiple stages:

* Failed RSS feeds do not prevent the application from processing other feeds where possible.
* Failed article extraction does not stop the complete scraper.
* Duplicate articles are skipped before article extraction.
* Article request timeouts are handled gracefully.
* Backend APIs return appropriate error responses.
* Ingestion jobs expose `running`, `completed`, and `failed` states.
* Frontend provides loading and empty states.
* Failed ingestion jobs expose the associated error message.

---

## Limitations

* RSS feed structures can change over time.
* Some article websites may block or prevent content extraction.
* Article extraction depends on the availability and accessibility of the original webpages.
* TF-IDF clustering is based on textual similarity rather than semantic understanding.
* Ingestion job status is currently maintained in backend memory and can be lost if the server restarts.
* The application currently uses a limited number of RSS sources.

---

## Future Improvements

* Semantic embeddings for improved clustering
* Better automatic cluster labels
* Persistent background job queue
* Additional news sources
* Improved cluster quality evaluation
* Production monitoring and logging
* Pagination for very large datasets
* Persistent ingestion job storage

---

## License

This project was created as a technical assessment project.
