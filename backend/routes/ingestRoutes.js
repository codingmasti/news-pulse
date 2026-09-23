const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();

const jobs = new Map();


// Starts the Python ingestion pipeline.
router.post("/trigger", async (req, res) => {
  // Generate a unique ID for this ingestion job
  const jobId = crypto.randomUUID();

  // Mark the job as running
  jobs.set(jobId, {
    jobId: jobId,
    status: "running",
    startedAt: new Date(),
    finishedAt: null,
    error: null,
  });

  // Path to the Python executable inside our scraper venv
  const pythonPath = path.join(__dirname, "../../scraper/venv/Scripts/python.exe")

  // Path to the Python ingestion script
  const scriptPath = path.join(
    __dirname, "../../scraper/run_pipeline.py"
  )

  //start python porcess
  // Start Python process
    const pythonProcess = spawn(
        pythonPath,
        [scriptPath]
    );

    //Collect python error
    let errorOutput = ""
    pythonProcess.stderr.on("data", (data)=>{
        errorOutput += data.toString()
    })

    //Python process compleated
    pythonProcess.on("close", (code)=>{
        const job = jobs.get(jobId);

        if(!job) return;

        job.finishedAt = new Date()

        if(code === 0){
            job.status = "completed"
            job.error = null
        }else{
            job.status = "failed", 
            job.error = errorOutput || "python process failed"
        }
        jobs.set(jobId, job)
    })

     // Return job ID immediately.
    // The frontend can use this ID to check the status.
     return res.status(202).json({
        success: true,
        message : "Ingestion started", 
        jobId : jobId
     })

});


// GET /ingest/status/:jobId
// Returns the current status of an ingestion job.

router.get("/status/:jobId", (req, res)=>{
    //get job id from the url
    const {jobId} = req.params;

    // Find the job from our in-memory jobs Map
    const job = jobs.get(jobId)

    //If jobId dose not exist 
    if(!job){
        return res.status(404).json({
            success: false,
            message:"job not found"
        })
    }

    //return current job information
    return res.status(202).json({
        success: true,
        data: job
    })
})


module.exports = {
    router,
    jobs
}