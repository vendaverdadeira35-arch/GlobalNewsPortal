from fastapi import FastAPI, BackgroundTasks, HTTPException, Security, Query, Form, UploadFile, File, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
import shutil
import uuid
import os
import sys
import asyncio
from contextlib import asynccontextmanager
from supabase import create_client, Client

# Permitir importar o nosso robô da outra pasta
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Scripts', 'GlobalNewsBot')))
from scraper import fetch_new_articles, search_internet_live, read_full_article
from notifier import send_news_email

HTML_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'index.html'))
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Scripts', 'GlobalNewsBot', 'news.db'))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY)
if USE_SUPABASE:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print("Erro ao conectar ao Supabase:", e)
        USE_SUPABASE = False

def run_bot_task_sync():
    print("Iniciando varredura em background...")
    novas_noticias = fetch_new_articles()
    if novas_noticias:
        try:
            send_news_email(novas_noticias)
        except Exception as e:
            print("Erro ao enviar email:", e)

async def periodic_scraper():
    while True:
        try:
            await asyncio.to_thread(run_bot_task_sync)
        except Exception as e:
            print("Erro no scraper de background:", e)
        await asyncio.sleep(1800)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ao iniciar a API, lança o job automático de varredura
    asyncio.create_task(periodic_scraper())
    yield
    print("Desligando motor de busca...")

app = FastAPI(title="Global News Portal API V4.0", lifespan=lifespan)

API_KEY = "sua_chave_secreta_123"
api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

app.mount("/css", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "js")), name="js")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def serve_frontend():
    return FileResponse(HTML_PATH)

@app.get("/api/news")
def get_news(category: str = Query(None)):
    try:
        news_list = []
        if USE_SUPABASE:
            query = supabase.table("seen_news").select("*").order("published_at", desc=True).limit(50)
            if category:
                query = query.eq("category", category)
            response = query.execute()
            for row in response.data:
                news_list.append({
                    "id": row.get("id"),
                    "title": row.get("title"),
                    "link": row.get("link", "#"),
                    "summary": row.get("summary", "Sem resumo."),
                    "source": row.get("source", "Desconhecida"),
                    "published_at": row.get("published_at"),
                    "category": row.get("category", "Geral")
                })
        else:
            import sqlite3
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if category:
                cursor.execute("SELECT * FROM seen_news WHERE category = ? ORDER BY published_at DESC LIMIT 50", (category,))
            else:
                cursor.execute("SELECT * FROM seen_news ORDER BY published_at DESC LIMIT 50")
            rows = cursor.fetchall()
            
            for row in rows:
                keys = row.keys()
                cat = row["category"] if "category" in keys else row.get("source", "Geral")
                news_list.append({
                    "id": row["id"],
                    "title": row["title"],
                    "link": row["link"] if "link" in keys else "#",
                    "summary": row["summary"] if "summary" in keys else "Sem resumo.",
                    "source": row["source"] if "source" in keys else "Desconhecida",
                    "published_at": row["published_at"],
                    "category": cat
                })
            conn.close()
            
        return {"status": "success", "data": news_list}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/search")
def search_news(q: str = Query(..., min_length=2)):
    try:
        results = search_internet_live(q)
        return {"status": "success", "data": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/read")
def read_article(url: str = Query(..., description="A URL completa do artigo")):
    try:
        content = read_full_article(url)
        if content.startswith("Não foi possível"):
            return {"status": "error", "message": content}
        return {"status": "success", "content": content}
    except Exception as e:
        return {"status": "error", "message": str(e)}

from pydantic import BaseModel
from datetime import datetime

class NativeArticle(BaseModel):
    title: str
    summary: str
    content: str
    image_url: str = ""
    category: str = "Geral"

@app.get("/admin")
def serve_admin():
    return FileResponse(os.path.join(os.path.dirname(__file__), 'admin.html'))

@app.post("/api/admin/post")
async def create_native_post(
    request: Request,
    title: str = Form(...),
    summary: str = Form(...),
    content: str = Form(...),
    category: str = Form("Geral"),
    image_url: str = Form(""),
    image_file: UploadFile = File(None)
):
    api_key = request.headers.get("X-API-KEY", "")
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Acesso negado. Chave inválida.")
    
    final_image_url = image_url
    
    # Se o admin enviou um arquivo de imagem
    if image_file and image_file.filename:
        ext = image_file.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image_file.file, buffer)
            
        final_image_url = f"/uploads/{filename}"
    
    try:
        data = {
            "title": title,
            "summary": summary,
            "content": content,
            "image_url": final_image_url,
            "category": category,
            "source": "Global News Original",
            "published_at": datetime.utcnow().isoformat(),
            "link": "internal"
        }
        
        if USE_SUPABASE:
            supabase.table("native_news").insert(data).execute()
        else:
            import sqlite3
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('''CREATE TABLE IF NOT EXISTS native_news 
                              (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, summary TEXT, content TEXT, image_url TEXT, category TEXT, source TEXT, published_at TEXT, link TEXT)''')
            cursor.execute('''INSERT INTO native_news (title, summary, content, image_url, category, source, published_at, link) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?)''', 
                           (data['title'], data['summary'], data['content'], data['image_url'], data['category'], data['source'], data['published_at'], data['link']))
            conn.commit()
            conn.close()
            
        return {"status": "success", "message": "Artigo publicado com sucesso!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/native_news")
def get_native_news():
    try:
        news_list = []
        if USE_SUPABASE:
            response = supabase.table("native_news").select("*").order("published_at", desc=True).limit(20).execute()
            news_list = response.data
        else:
            import sqlite3
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('''CREATE TABLE IF NOT EXISTS native_news 
                              (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, summary TEXT, content TEXT, image_url TEXT, category TEXT, source TEXT, published_at TEXT, link TEXT)''')
            cursor.execute("SELECT * FROM native_news ORDER BY published_at DESC LIMIT 20")
            rows = cursor.fetchall()
            for row in rows:
                news_list.append(dict(row))
            conn.close()
            
        return {"status": "success", "data": news_list}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/trigger")
def trigger_bot(background_tasks: BackgroundTasks, api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Acesso negado. Chave inválida.")
        
    background_tasks.add_task(run_bot_task_sync)
    return {"status": "success", "message": "O motor foi engatilhado! A varredura está rodando em segundo plano."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
