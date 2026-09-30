import os
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()

# Verifica se está configurado para a nuvem
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY)

if USE_SUPABASE:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Conectado ao Supabase na nuvem!")
    except Exception as e:
        print("Erro ao inicializar Supabase:", e)
        USE_SUPABASE = False
        
if not USE_SUPABASE:
    print("Aviso: Chaves do Supabase não encontradas. Usando SQLite temporário local.")
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), 'news.db')
    def init_db():
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS seen_news (
                id TEXT PRIMARY KEY,
                title TEXT,
                link TEXT,
                summary TEXT,
                source TEXT,
                category TEXT,
                published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()
    init_db()

def is_news_seen(news_id):
    if USE_SUPABASE:
        try:
            response = supabase.table("seen_news").select("id").eq("id", news_id).execute()
            return len(response.data) > 0
        except Exception:
            return False
    else:
        import sqlite3
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT 1 FROM seen_news WHERE id = ?', (news_id,))
        result = cursor.fetchone()
        conn.close()
        return result is not None

def mark_as_seen(news_id, title, link, summary, source, category="Geral"):
    if USE_SUPABASE:
        try:
            supabase.table("seen_news").upsert({
                "id": news_id,
                "title": title,
                "link": link,
                "summary": summary,
                "source": source,
                "category": category
            }).execute()
        except Exception as e:
            print(f"Erro ao salvar no Supabase: {e}")
    else:
        import sqlite3
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO seen_news (id, title, link, summary, source, category) 
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (news_id, title, link, summary, source, category))
            conn.commit()
        except sqlite3.IntegrityError:
            pass
        conn.close()
