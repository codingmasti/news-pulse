import feedparser

from normalize import normaliz_article


RSS_FEEDS ={
    "NPR": "https://feeds.npr.org/1001/rss.xml",
    "BBC": "https://feeds.bbci.co.uk/news/rss.xml",
    "Al Jazeera": "https://www.aljazeera.com/xml/rss/all.xml",
}

for source, url in RSS_FEEDS.items() :
    print("\n" + "=" * 60)
    print("SOURCE: ",source)
    print("=" * 60)
    feed = feedparser.parse(url)
    
    print("Total Articles:",len(feed.entries))

    for article in feed.entries[:2]:
       normalized = normaliz_article(source, article)
       print("\n",normalized)