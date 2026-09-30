import feedparser
from database import is_news_seen, mark_as_seen

# Fontes globais de alto impacto (Negócios, Criptomoedas e Mundo)
FEEDS = [
    "http://feeds.bbci.co.uk/news/world/rss.xml",             # BBC World
    "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml",        # Wall Street Journal (Business)
    "https://www.coindesk.com/arc/outboundfeeds/rss/",        # CoinDesk (Crypto)
    "https://cointelegraph.com/rss",                          # CoinTelegraph (Crypto)
    "https://search.cnbc.com/rs/search/combinedcms/view.xml?id=10000664" # CNBC (Finance)
]

def fetch_new_articles():
    new_articles = []
    
    for feed_url in FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            # Pegamos apenas as 3 notícias mais relevantes de cada fonte para não gerar spam
            for entry in feed.entries[:3]:
                news_id = entry.id if hasattr(entry, 'id') else entry.link
                
                # Se não estiver no nosso banco de dados, é notícia nova!
                if not is_news_seen(news_id):
                    new_articles.append({
                        'title': entry.title,
                        'link': entry.link,
                        'summary': entry.description if hasattr(entry, 'description') else 'Sem resumo detalhado disponível.',
                        'source': feed.feed.title if hasattr(feed.feed, 'title') else 'Desconhecido'
                    })
                    # Salva no banco com todos os dados para o Front-end
                    mark_as_seen(
                        news_id, 
                        entry.title, 
                        entry.link, 
                        entry.description if hasattr(entry, 'description') else 'Sem resumo.', 
                        feed.feed.title if hasattr(feed.feed, 'title') else 'Desconhecido'
                    )
        except Exception as e:
            print(f"Erro ao ler feed {feed_url}: {e}")
            
    return new_articles

if __name__ == "__main__":
    print("Testando coletor de notícias...")
    artigos = fetch_new_articles()
    print(f"Foram encontradas {len(artigos)} novas notícias!")
    for art in artigos:
        print(f"- {art['title']} ({art['source']})")
