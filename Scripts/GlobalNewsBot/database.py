import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'news.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Adicionando link, summary e source para o Front-end
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS seen_news (
            id TEXT PRIMARY KEY,
            title TEXT,
            link TEXT,
            summary TEXT,
            source TEXT,
            published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def is_news_seen(news_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT 1 FROM seen_news WHERE id = ?', (news_id,))
    result = cursor.fetchone()
    conn.close()
    return result is not None

def mark_as_seen(news_id, title, link, summary, source):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR IGNORE INTO seen_news (id, title, link, summary, source) 
        VALUES (?, ?, ?, ?, ?)
    ''', (news_id, title, link, summary, source))
    conn.commit()
    conn.close()

init_db()
