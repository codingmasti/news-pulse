import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const App = () => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState("All");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTimeline = async () => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_URL}/timeline`);

      setTimeline(response.data.data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.log("Failed to fetch timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      // Step 1: Start Python ingestion pipeline
      const triggerResponse = await axios.post(`${API_URL}/ingest/trigger`);

      const jobId = triggerResponse.data.jobId;

      console.log("Ingestion started:", jobId);

      // Step 2: Check job status until it completes
      let status = "running";

      while (status === "running") {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const statusResponse = await axios.get(
          `${API_URL}/ingest/status/${jobId}`,
        );

        status = statusResponse.data.data.status;

        console.log("Ingestion status:", status);

        if (status === "failed") {
          throw new Error(statusResponse.data.data.error || "Ingestion failed");
        }
      }

      // Step 3: Fetch updated timeline
      await fetchTimeline();

      console.log("News timeline updated successfully.");
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchClusterDetails = async (clusterId) => {
    try {
      setClusterLoading(true);

      const response = await axios.get(`${API_URL}/clusters/${clusterId}`);

      setSelectedCluster(response.data.data);
    } catch (error) {
      console.error("Failed to fetch cluster details:", error);
    } finally {
      setClusterLoading(false);
    }
  };

  // Fetch timeline when component loads
  useEffect(() => {
    fetchTimeline();
  }, []);

  //filtering
  const filteredTimeline = timeline.filter((item) => {
    const matchesSource =
      selectedSource === "All" || "" || item.sources?.includes(selectedSource);

    const matchesSearch = item.label
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());

    return matchesSource && matchesSearch;
  });

  // Dashboard statistics
  const totalTopics = timeline.length;

  const totalArticles = timeline.reduce(
    (total, item) => total + (item.articleCount || 0),
    0,
  );

  const availableSources = new Set();

  timeline.forEach((item) => {
    item.sources?.forEach((source) => {
      availableSources.add(source);
    });
  });

  const totalSources = availableSources.size;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              News<span className="text-blue-400"> Pulse</span>
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Topic-Clustered News Timeline
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "Updating..." : "Refresh"}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Intro */}
        <section className="mb-8">
          <h2 className="text-3xl font-bold">News Timeline</h2>

          <p className="mt-2 max-w-2xl text-slate-400">
            Explore related news articles grouped into topic clusters.
          </p>
        </section>

        {/* Dashboard Stats */}
        {!loading && timeline.length > 0 && (
          <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Topics */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Topics</p>

              <p className="mt-2 text-3xl font-bold text-white">
                {totalTopics}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Clustered news topics
              </p>
            </div>

            {/* Articles */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Articles</p>

              <p className="mt-2 text-3xl font-bold text-white">
                {totalArticles}
              </p>

              <p className="mt-1 text-xs text-slate-500">Articles processed</p>
            </div>

            {/* Sources */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Sources</p>

              <p className="mt-2 text-3xl font-bold text-white">
                {totalSources}
              </p>

              <p className="mt-1 text-xs text-slate-500">News sources</p>
            </div>

            {/* Last Updated */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Last Updated</p>

              <p className="mt-2 text-lg font-semibold text-white">
                {lastUpdated
                  ? lastUpdated.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Timeline refresh time
              </p>
            </div>
          </section>
        )}

        {/* Source Filter */}
        <section className="mb-10">
          {/* Search */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-400">
              Search topics
            </label>

            <div className="relative max-w-xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic or headline..."
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 pr-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-400">
              Filter by source:
            </span>

            {["All", "BBC", "NPR", "Al Jazeera"].map((source) => (
              <button
                key={source}
                onClick={() => setSelectedSource(source)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  selectedSource === source
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {source}
              </button>
            ))}
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">Loading news timeline...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && timeline.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">No timeline data available.</p>
          </div>
        )}

        {!loading && timeline.length > 0 && filteredTimeline.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-lg font-medium text-white">
              No matching stories found
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Try a different topic or source.
            </p>
          </div>
        )}

        {/* Timeline */}
        {!loading && timeline.length > 0 && (
          <section className="relative ml-3 border-l border-slate-700 pl-8">
            {filteredTimeline.map((item) => (
              <div key={item.clusterId} className="relative mb-6">
                {/* Timeline dot */}
                <div className="absolute -left-10.25 top-6 h-4 w-4 rounded-full border-4 border-slate-950 bg-blue-500" />

                {/* Cluster card */}
                <div
                  onClick={() => fetchClusterDetails(item.clusterId)}
                  className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-700"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-blue-400">
                        Cluster {item.clusterId}
                      </p>

                      <h3 className="text-lg font-semibold text-white">
                        {item.label}
                      </h3>
                    </div>

                    {/* Article count */}
                    <div className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300">
                      {item.articleCount} articles
                    </div>
                  </div>

                  {/* Cluster information */}
                  <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-400">
                    <span>Start: {formatDate(item.start)}</span>

                    <span>End: {formatDate(item.end)}</span>
                  </div>

                  {/* Intensity */}
                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-xs text-slate-500">
                      <span>Cluster intensity</span>
                      <span>{item.intensity}</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${Math.min(item.intensity * 10, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* View articles hint */}
                  <div className="mt-5 text-sm font-medium text-blue-400">
                    View articles →
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* Cluster Details Side Panel */}
      {selectedCluster && (
        <>
          {/* Background overlay */}
          <div
            onClick={() => setSelectedCluster(null)}
            className="fixed inset-0 z-40 bg-black/60"
          />

          {/* Side panel */}
          <aside className="fixed right-0 top-0 z-50 h-full w-full overflow-y-auto border-l border-slate-800 bg-slate-950 p-6 shadow-2xl sm:w-[500px]">
            {/* Panel header */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
                  Cluster {selectedCluster.clusterId}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {selectedCluster.label}
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  {selectedCluster.articles?.length || 0} articles
                </p>
              </div>

              <button
                onClick={() => setSelectedCluster(null)}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            {/* Loading articles */}
            {clusterLoading ? (
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 text-center">
                <p className="text-slate-400">Loading articles...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedCluster.articles?.map((article, index) => (
                  <article
                    key={`${article.link}-${index}`}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-5"
                  >
                    <h3 className="text-lg font-semibold">{article.title}</h3>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                      <span>Source: {article.source}</span>

                      <span>Published: {formatDate(article.publishedAt)}</span>
                    </div>

                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block text-sm font-medium text-blue-400 hover:text-blue-300"
                    >
                      Read original article →
                    </a>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
};

// Convert MongoDB date into readable format
function formatDate(date) {
  if (!date) {
    return "Unknown";
  }

  return new Date(date).toLocaleString();
}

export default App;
