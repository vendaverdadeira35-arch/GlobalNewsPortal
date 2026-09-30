from fastapi import FastAPI, BackgroundTasks, HTTPException, Security
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import sys

# Permitir importar o nosso robô da outra pasta
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Scripts', 'GlobalNewsBot')))
from scraper import fetch_new_articles
from notifier import send_news_email

app = FastAPI(title="Global News Portal API")

# Segurança Básica para a Rota de Gatilho
API_KEY = "sua_chave_secreta_123"
api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Scripts', 'GlobalNewsBot', 'news.db'))
HTML_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'index.html'))

@app.get("/")
def serve_frontend():
    return FileResponse(HTML_PATH)

@app.get("/api/news")
def get_news():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM seen_news ORDER BY published_at DESC LIMIT 50")
        rows = cursor.fetchall()
        
        news_list = []
        for row in rows:
            news_list.append({
                "id": row["id"],
                "title": row["title"],
                "link": row["link"] if "link" in row.keys() else "#",
                "summary": row["summary"] if "summary" in row.keys() else "Sem resumo.",
                "source": row["source"] if "source" in row.keys() else "Desconhecida",
                "published_at": row["published_at"]
            })
            
        conn.close()
        return {"status": "success", "data": news_list}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def run_bot_task():
    print("Iniciando varredura via gatilho da API...")
    novas_noticias = fetch_new_articles()
    if novas_noticias:
        try:
            send_news_email(novas_noticias)
        except Exception as e:
            print("Erro ao enviar email (provavelmente sem credenciais):", e)

@app.get("/api/trigger")
def trigger_bot(api_key: str = Security(api_key_header)):
    # Protege contra curiosos clicando no link
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Acesso negado. Chave inválida.")
        
    # Executa a varredura IMEDIATAMENTE (Síncrono para o Render não matar o processo)
    run_bot_task()
    return {"status": "success", "message": "O robô fez a varredura com sucesso!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
