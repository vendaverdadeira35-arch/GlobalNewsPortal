import feedparser
import re
from database import is_news_seen, mark_as_seen
from deep_translator import GoogleTranslator

# Limpa o HTML do resumo (algumas notícias vem com tags <img> e <p> que quebram o visual)
def clean_html(raw_html):
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext[:300] + "..." if len(cleantext) > 300 else cleantext

def translate_to_pt(text):
    if not text or text.strip() == "":
        return "Sem resumo."
    try:
        # Usa a API livre do Google Translate
        translator = GoogleTranslator(source='auto', target='pt')
        return translator.translate(text)
    except Exception as e:
        print(f"Erro na tradução: {e}")
        return text

# Radares Massivos V2.0
FEEDS = [
    # Criptomoedas, Bitcoin e Blockchain (Google News - Todas as mídias)
    "https://news.google.com/rss/search?q=Criptomoedas+OR+Bitcoin+OR+Blockchain+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    
    # Negócios, Startups e Empreendedorismo (Google News - Todas as mídias)
    "https://news.google.com/rss/search?q=Negócios+OR+Startups+OR+Empresas+OR+Mercado+Financeiro+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    
    # Inteligência Artificial e Tecnologia (Google News)
    "https://news.google.com/rss/search?q=Inteligência+Artificial+OR+Tecnologia+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    
    # Fontes Premium Globais em Inglês (Para testar nosso Tradutor AI)
    "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml",        # Wall Street Journal (Business)
    "https://www.coindesk.com/arc/outboundfeeds/rss/"         # CoinDesk (Crypto)
]

def fetch_new_articles():
    new_articles = []
    
    for feed_url in FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            source_name = feed.feed.title if hasattr(feed.feed, 'title') else 'Radar Global'
            
            # Agora capturamos até 15 notícias de cada radar (Total 75 por varredura)
            for entry in feed.entries[:15]:
                news_id = entry.id if hasattr(entry, 'id') else entry.link
                
                if not is_news_seen(news_id):
                    # 1. Limpeza de dados
                    raw_title = entry.title
                    raw_summary = entry.description if hasattr(entry, 'description') else 'Sem resumo detalhado disponível.'
                    raw_summary = clean_html(raw_summary)
                    
                    # 2. Tradução Automática (Motor V2.0)
                    # Se não for do Google News Brasil, nós traduzimos.
                    if "google.com" not in feed_url:
                        pt_title = translate_to_pt(raw_title)
                        pt_summary = translate_to_pt(raw_summary)
                    else:
                        pt_title = raw_title
                        pt_summary = raw_summary
                        
                    # 3. Empacotamento
                    new_articles.append({
                        'title': pt_title,
                        'link': entry.link,
                        'summary': pt_summary,
                        'source': source_name
                    })
                    
                    # 4. Persistência
                    mark_as_seen(news_id, pt_title, entry.link, pt_summary, source_name)
                    
        except Exception as e:
            print(f"Erro ao ler feed {feed_url}: {e}")
            
    return new_articles

if __name__ == "__main__":
    print("Iniciando Motor V2.0 (Com Tradutor IA)...")
    artigos = fetch_new_articles()
    print(f"Foram capturadas e traduzidas {len(artigos)} novas notícias globais!")
