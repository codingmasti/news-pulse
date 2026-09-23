const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// Use MongoDB collection directly.
// Our Python pipeline already created the "clusters" collection.

const clustersCollection = mongoose.connection.collection("clusters");
const articlesCollection = mongoose.connection.collection("articles");

router.get("/", async (req, res) => {
    try {
        const clusters = await clustersCollection
            .find({})
            .sort({ earliestPublished: 1 })
            .toArray();

        // Return only the information required by the timeline.
        const result = clusters.map((cluster) => ({
            clusterId: cluster.clusterId,
            label: cluster.label,
            articleCount: cluster.articleCount,
            earliestPublished: cluster.earliestPublished,
            latestPublished: cluster.latestPublished,
        }));

        res.status(200).json({
            success: true,
            count: result.length,
            data: result,
        });
    } catch (error) {
        console.error("Fetching error clusters", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch clusters",
        });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const clusterId = Number(req.params.id);

        const cluster = await clustersCollection.findOne({ clusterId: clusterId });

        //return 404 if cluster dose not exist
        if (!cluster) {
            return res.status(404).json({
                success: false,
                message: "Cluster not found",
            });
        }

        // Fetch all articles that belong to this cluster
        const articles = await articlesCollection
            .find({ _id: { $in: cluster.articleIds } })
            .sort({
                publishedAt: 1,
            })
            .toArray();

        // Return cluster information and its articles
        res.status(200).json({
            success: true,
            data: {
                clusterId: cluster.clusterId,
                label: cluster.label,
                articleCount: cluster.articleCount,
                earliestPublished: cluster.earliestPublished,
                latestPublished: cluster.latestPublished,
                articles: articles.map((article) => ({
                    title: article.title,
                    source: article.source,
                    publishedAt: article.publishedAt,
                    link: article.link,
                })),
            },
        });
    } catch (error) {
        console.error("Error fetching cluster details:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch cluster details",
        });
    }
});

module.exports = router;
