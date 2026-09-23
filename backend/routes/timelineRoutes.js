const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// Access MongoDB collections
const clustersCollection = mongoose.connection.collection("clusters");
const articlesCollection = mongoose.connection.collection("articles");

router.get("/", async (req, res) => {
  try {
    // Fetch all clusters
    const clusters = await clustersCollection
      .find({})
      .sort({ earliestPublished: 1 })
      .toArray();

    // Convert clusters into timeline-friendly data
    const timeline = await Promise.all(
      clusters.map(async (cluster) => {
        // Find articles belonging to this cluster
        const articles = await articlesCollection
          .find({
            _id: { $in: cluster.articleIds },
          })
          .project({ source: 1 })
          .toArray();

        // Get unique sources
        const sources = [
          ...new Set(
            articles
              .map((article) => article.source)
              .filter(Boolean)
          ),
        ];

        return {
          clusterId: cluster.clusterId,
          label: cluster.label,
          start: cluster.earliestPublished,
          end: cluster.latestPublished,
          articleCount: cluster.articleCount,

          // Article count is used as intensity
          intensity: cluster.articleCount,

          // Sources used by this cluster
          sources,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: timeline.length,
      data: timeline,
    });
  } catch (error) {
    console.error("Fetching timeline error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch timeline",
    });
  }
});

module.exports = router;