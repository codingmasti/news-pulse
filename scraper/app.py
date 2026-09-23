from flask import Flask, jsonify
import subprocess
import sys
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


@app.get("/")
def home():
    return jsonify({
        "success": True,
        "message": "News Pulse scraper service is running!"
    })


@app.post("/run")
def run_scraper():
    try:
        result = subprocess.run(
            [sys.executable, "run_pipeline.py"],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            return jsonify({
                "success": False,
                "error": result.stderr,
                "output": result.stdout
            }), 500

        return jsonify({
            "success": True,
            "message": "Scraper pipeline completed successfully",
            "output": result.stdout
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)