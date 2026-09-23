
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables BEFORE importing routes
dotenv.config();

const connectDB = require("./config/db");
const clusterRoutes = require("./routes/clusterRoutes");
const timelineRoutes = require("./routes/timelineRoutes");
const { router: ingestRoutes } = require("./routes/ingestRoutes");

const PORT = process.env.PORT || 5000;

const app = express();

connectDB();

// Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "News Pulse backend is running",
  });
});

// Cluster routes
app.use("/clusters", clusterRoutes);

// Timeline routes
app.use("/timeline", timelineRoutes);

// Ingestion routes
app.use("/ingest", ingestRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

