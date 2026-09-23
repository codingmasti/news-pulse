import trafilatura


def extract_article_text(url):
    try:
        downloaded = trafilatura.fetch_url(url)

        if not downloaded:
            return None

        text = trafilatura.extract(downloaded)
        return text

    except Exception as error:
        print(f"Failed to extract article: {url}")
        print(f"Error: {error}")

        return None

if __name__ == "__main__":
    test_url = "https://www.npr.org/2026/09/21/nx-s1-5927288/data-center-election-voters-ai"

    article_text = extract_article_text(test_url)

    if article_text:
        print("\nArticle extracted successfully!\n")
        print(article_text[:2000])
    else:
        print("\nCould not extract article.")