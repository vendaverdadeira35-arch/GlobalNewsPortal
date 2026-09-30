import time
import sys
from scraper import fetch_new_articles
from notifier import send_news_email

# ========================================================
# CONFIGURAÇÃO DE TEMPO
# ========================================================
# Intervalo de tempo entre cada varredura na internet (em segundos)
# Ex: 3600 = 1 hora | 1800 = 30 minutos
INTERVALO_VERIFICACAO = 3600  
# ========================================================

def run_loop():
    print("🚀 Robô de Notícias 24/7 Iniciado!")
    print(f"🔄 O sistema fará varreduras a cada {INTERVALO_VERIFICACAO / 60:.0f} minutos.")
    print("❌ Pressione CTRL+C no terminal para parar o robô.\n")
    
    while True:
        try:
            print(f"[{time.strftime('%H:%M:%S')}] 🔎 Verificando novas notícias globais...")
            novas_noticias = fetch_new_articles()
            
            if novas_noticias:
                print(f"[{time.strftime('%H:%M:%S')}] 📥 {len(novas_noticias)} notícias inéditas encontradas. Preparando envio...")
                send_news_email(novas_noticias)
            else:
                print(f"[{time.strftime('%H:%M:%S')}] 💤 Nenhuma notícia nova encontrada.")
                
            print(f"[{time.strftime('%H:%M:%S')}] ⏳ Aguardando próximo ciclo...\n")
            time.sleep(INTERVALO_VERIFICACAO)
            
        except KeyboardInterrupt:
            print("\n🛑 Robô desligado pelo usuário.")
            sys.exit(0)
        except Exception as e:
            print(f"❌ Erro inesperado no ciclo: {e}")
            time.sleep(60) # Tenta novamente em 1 minuto se a internet cair

if __name__ == "__main__":
    run_loop()
