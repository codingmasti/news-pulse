import subprocess
import sys
import re


def run_script(script_name):
    print("\n" + "=" * 60)
    print(f"RUNNING: {script_name}")
    print("=" * 60)

    result = subprocess.run(
        [sys.executable, script_name],
        capture_output=True,
        text=True
    )

    print(result.stdout)

    if result.stderr:
        print(result.stderr)

    if result.returncode != 0:
        print(f"{script_name} failed.")
        return None

    return result.stdout


def get_saved_count(output):
    # Normal case:
    # Articles saved: 5
    match = re.search(r"Articles saved:\s*(\d+)", output)

    if match:
        return int(match.group(1))

    # No new articles case:
    # NEW ARTICLES FOUND: 0
    match = re.search(r"NEW ARTICLES FOUND:\s*0", output)

    if match:
        return 0

    # Also support:
    # No new articles to ingest.
    if "No new articles to ingest." in output:
        return 0

    return None


def main():
    print("\n" + "=" * 60)
    print("NEWS PULSE INGESTION PIPELINE")
    print("=" * 60)

    articles_output = run_script("save_articles.py")

    if articles_output is None:
        sys.exit(1)

    saved_count = get_saved_count(articles_output)

    if saved_count is None:
        print("Could not determine number of saved articles.")
        sys.exit(1)

    print(f"\nSaved articles: {saved_count}")

    # Run clustering only when new articles were added.
    print("\nRunning clustering...")

cluster_output = run_script("save_clusters.py")

if cluster_output is None:
    print("Clustering failed.")
    sys.exit(1)

    print("\nClustering completed successfully.")

    print("\n" + "=" * 60)
    print("NEWS PULSE PIPELINE COMPLETED SUCCESSFULLY")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("\nPipeline error:")
        print(error)
        sys.exit(1)