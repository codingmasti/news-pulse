const express = require("express");
const crypto = require("crypto");

const router = express.Router();

// Render Python scraper service
const SCRAPER_URL = process.env.SCRAPER_URL;

const jobs = new Map();

router.post("/trigger", (req, res) => {
  const jobId = crypto.randomUUID();

  // Create job immediately
  jobs.set(jobId, {
    jobId,
    status: "running",
    startedAt: new Date(),
    finishedAt: null,
    error: null,
  });

  // Start scraper in background
  runScraper(jobId);

  // Immediately return job ID
  return res.status(202).json({
    success: true,
    message: "Ingestion started",
    jobId,
  });
});

async function runScraper(jobId) {
  try {
    if (!SCRAPER_URL) {
      throw new Error("SCRAPER_URL environment variable is not configured");
    }

    const response = await fetch(`${SCRAPER_URL}/run`, {
      method: "POST",
    });

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error(
        `Python service returned invalid JSON: ${responseText.substring(
          0,
          200
        )}`
      );
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Scraper service failed");
    }

    const job = jobs.get(jobId);

    if (job) {
      job.status = "completed";
      job.finishedAt = new Date();
      job.error = null;

      jobs.set(jobId, job);
    }
  } catch (error) {
    const job = jobs.get(jobId);

    if (job) {
      job.status = "failed";
      job.finishedAt = new Date();
      job.error = error.message;

      jobs.set(jobId, job);
    }
  }
}

router.get("/status/:jobId", (req, res) => {
  const { jobId } = req.params;

  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: "Job not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: job,
  });
});

module.exports = {
  router,
  jobs,
};