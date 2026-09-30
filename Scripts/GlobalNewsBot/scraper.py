import feedparser
import re
import concurrent.futures
import trafilatura
from database import is_news_seen, mark_as_seen
import urllib.parse
from deep_translator import GoogleTranslator

# Limpa o HTML do resumo
def clean_html(raw_html):
    if not raw_html: return ""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext[:300] + "..." if len(cleantext) > 300 else cleantext

def translate_to_pt(text):
    if not text or text.strip() == "":
        return "Sem resumo."
    try:
        translator = GoogleTranslator(source='auto', target='pt')
        # Divide em partes se for muito longo (limite do google translator é ~5000 chars)
        if len(text) > 4000:
            chunks = [text[i:i+4000] for i in range(0, len(text), 4000)]
            translated_chunks = [translator.translate(chunk) for chunk in chunks]
            return " ".join(translated_chunks)
        return translator.translate(text)
    except Exception as e:
        print(f"Erro na tradução: {e}")
        return text

# Fontes Expandidas V3.0
FEEDS = {
    'Criptomoedas': [
        "https://news.google.com/rss/search?q=Criptomoedas+OR+Bitcoin+OR+Blockchain+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
        "https://www.coindesk.com/arc/outboundfeeds/rss/"
    ],
    'Negócios': [
        "https://news.google.com/rss/search?q=Negócios+OR+Startups+OR+Mercado+Financeiro+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
        "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml"
    ],
    'Inteligência Artificial': [
        "https://news.google.com/rss/search?q=Inteligência+Artificial+OR+OpenAI+OR+Tech+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419"
    ],
    'Global': [
        "https://news.google.com/rss/search?q=Geopolítica+OR+Economia+Mundial+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419"
    ],
    'África': [
        "https://news.google.com/rss/search?q=Angola+OR+Economia+Africana+OR+Luanda+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419"
    ]
}

def process_entry(entry, feed_url, category, source_name):
    news_id = entry.id if hasattr(entry, 'id') else entry.link
    
    if is_news_seen(news_id):
        return None
        
    raw_title = entry.title
    raw_summary = entry.description if hasattr(entry, 'description') else 'Sem resumo.'
    raw_summary = clean_html(raw_summary)
    
    # Se não for PT nativo, traduz
    if "google.com" not in feed_url:
        pt_title = translate_to_pt(raw_title)
        pt_summary = translate_to_pt(raw_summary)
    else:
        pt_title = raw_title
        pt_summary = raw_summary
        
    return {
        'id': news_id,
        'title': pt_title,
        'link': entry.link,
        'summary': pt_summary,
        'source': source_name,
        'category': category
    }

def fetch_new_articles():
    new_articles = []
    
    # Flatten feeds list for easy processing
    feed_tasks = []
    for category, urls in FEEDS.items():
        for url in urls:
            feed_tasks.append((category, url))
            
    # Passo 1: Fazer download dos RSS em paralelo
    def process_feed(task):
        cat, feed_url = task
        try:
            feed = feedparser.parse(feed_url)
            source_name = feed.feed.title if hasattr(feed.feed, 'title') else f'Radar {cat}'
            results = []
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = []
                for entry in feed.entries[:10]: # Top 10 por feed
                    futures.append(executor.submit(process_entry, entry, feed_url, cat, source_name))
                    
                for future in concurrent.futures.as_completed(futures):
                    res = future.result()
                    if res:
                        results.append(res)
            return results
        except Exception as e:
            print(f"Erro ao ler feed {feed_url}: {e}")
            return []

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(feed_tasks)) as executor:
        feed_futures = [executor.submit(process_feed, t) for t in feed_tasks]
        for future in concurrent.futures.as_completed(feed_futures):
            new_articles.extend(future.result())
            
    # Persistência após tradução
    for art in new_articles:
        mark_as_seen(art['id'], art['title'], art['link'], art['summary'], art['source'])
        
    return new_articles

def search_internet_live(query: str):
    """ Busca ao vivo no Google News e traz os top resultados na hora """
    safe_query = urllib.parse.quote_plus(query)
    feed_url = f"https://news.google.com/rss/search?q={safe_query}&hl=pt-BR&gl=BR&ceid=BR:pt-419"
    
    try:
        feed = feedparser.parse(feed_url)
        results = []
        for entry in feed.entries[:15]:
            raw_summary = entry.description if hasattr(entry, 'description') else 'Sem resumo.'
            results.append({
                'id': entry.id if hasattr(entry, 'id') else entry.link,
                'title': entry.title,
                'link': entry.link,
                'summary': clean_html(raw_summary),
                'source': feed.feed.title if hasattr(feed.feed, 'title') else 'Busca Web',
                'published_at': entry.published if hasattr(entry, 'published') else 'Agora',
                'category': 'Busca ao Vivo'
            })
        return results
    except Exception as e:
        print(f"Erro na busca ao vivo: {e}")
        return []

def read_full_article(url: str):
    """ Extrai o texto completo de qualquer link da internet e traduz para português """
    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            return "Não foi possível carregar o conteúdo original (pode estar protegido por paywall)."
            
        text = trafilatura.extract(downloaded)
        if not text:
            return "Não foi possível extrair o texto principal desta página."
            
        # Traduz o texto extraído
        translated_text = translate_to_pt(text)
        return translated_text
    except Exception as e:
        print(f"Erro ao ler artigo {url}: {e}")
        return f"Ocorreu um erro ao processar o artigo: {str(e)}"
