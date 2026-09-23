import subprocess
import sys
import re
from pathlib import Path


# Get the folder where this file is located.
# This makes the script work even if it is started
# from a different working directory.
BASE_DIR = Path(__file__).resolve().parent


def run_script(script_name):
    """
    Run one Python script and capture its output.

    Returns:
        tuple:
            (success, output)

        success -> True if script completed successfully
        output  -> text printed by the script
    """

    script_path = BASE_DIR / script_name

    print("\n" + "=" * 60)
    print(f"RUNNING: {script_name}")
    print("=" * 60)

    # Run the script and capture its output.
    result = subprocess.run(
        [sys.executable, str(script_path)],
        capture_output=True,
        text=True,
        check=False
    )

    # Print the output so we can still see it in the terminal.
    print(result.stdout)

    # Print errors if the script failed.
    if result.stderr:
        print(result.stderr)

    # Exit code 0 means successful execution.
    if result.returncode == 0:
        print(f"{script_name} completed successfully.")

        return True, result.stdout

    print(f"{script_name} failed.")
    print(f"Exit code: {result.returncode}")

    return False, result.stdout


def run_pipeline():
    """
    Run the complete News Pulse ingestion pipeline.

    Step 1:
        Fetch RSS articles and save new articles.

    Step 2:
        Run clustering only if new articles were added.
    """

    print("\n" + "=" * 60)
    print("NEWS PULSE INGESTION PIPELINE")
    print("=" * 60)

    # -------------------------------------------------
    # Step 1: Ingest articles
    # -------------------------------------------------

    articles_success, articles_output = run_script(
        "save_articles.py"
    )

    if not articles_success:
        print("\nPipeline stopped because article ingestion failed.")
        return False

    # -------------------------------------------------
    # Step 2: Check how many new articles were saved
    # -------------------------------------------------

    # Find:
    #
    # Articles saved: 5
    #
    # from the output of save_articles.py.

    match = re.search(
        r"Articles saved:\s*(\d+)",
        articles_output
    )

    if match:
        total_saved = int(match.group(1))
    else:
        print("\nCould not determine number of saved articles.")
        return False

    print(f"\nNew articles saved: {total_saved}")

    # -------------------------------------------------
    # Step 3: Run clustering only when needed
    # -------------------------------------------------

    if total_saved == 0:

        print("\nNo new articles found.")
        print("Skipping clustering.")

        print("\n" + "=" * 60)
        print("PIPELINE COMPLETED SUCCESSFULLY")
        print("=" * 60)

        return True

    # New articles exist, so update clusters.
    print("\nNew articles found.")
    print("Running clustering...")

    clusters_success, _ = run_script(
        "save_clusters.py"
    )

    if not clusters_success:
        print("\nPipeline stopped because clustering failed.")
        return False

    # -------------------------------------------------
    # Pipeline completed
    # -------------------------------------------------

    print("\n" + "=" * 60)
    print("PIPELINE COMPLETED SUCCESSFULLY")
    print("=" * 60)

    return True


if __name__ == "__main__":

    success = run_pipeline()

    # Exit with 0 on success and 1 on failure.
    sys.exit(0 if success else 1)