import requests
import trafilatura
from concurrent.futures import ThreadPoolExecutor, as_completed


REQUEST_TIMEOUT = 10
MAX_WORKERS = 8


def extract_article_text(url):
    try:
        response = requests.get(
            url,
            timeout=REQUEST_TIMEOUT,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 Chrome/140 Safari/537.36"
                )
            },
        )

        if response.status_code != 200:
            print(f"Failed: HTTP {response.status_code} - {url}")
            return None

        downloaded = response.text

        if not downloaded:
            return None

        text = trafilatura.extract(downloaded)

        return text

    except requests.exceptions.Timeout:
        print(f"Timeout: {url}")
        return None

    except requests.exceptions.RequestException as error:
        print(f"Request failed: {url}")
        print(f"Error: {error}")
        return None

    except Exception as error:
        print(f"Extraction failed: {url}")
        print(f"Error: {error}")
        return None


def extract_articles(urls):
    results = {}

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(extract_article_text, url): url
            for url in urls
        }

        for future in as_completed(futures):
            url = futures[future]

            try:
                results[url] = future.result()
            except Exception as error:
                print(f"Unexpected error: {url}")
                print(f"Error: {error}")
                results[url] = None

    return results


if __name__ == "__main__":
    test_url = (
        "https://www.npr.org/2026/09/21/"
        "nx-s1-5927288/data-center-election-voters-ai"
    )

    article_text = extract_article_text(test_url)

    if article_text:
        print("\nArticle extracted successfully!\n")
        print(article_text[:2000])
    else:
        print("\nCould not extract article.")