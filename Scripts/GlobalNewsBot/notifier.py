import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ========================================================
# CONFIGURAÇÕES DE E-MAIL (PREENCHA AQUI ANTES DE RODAR)
# ========================================================
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "seu_email_remetente@gmail.com"
SENDER_PASSWORD = "SUA_SENHA_DE_APP_AQUI" 
RECEIVER_EMAIL = "seu_email_destino@gmail.com"
# ========================================================

def format_email_body(articles):
    html = "<h2>📰 Resumo de Notícias Globais (Automático)</h2><hr>"
    for art in articles:
        html += f"<h3><a href='{art['link']}' style='color: #2c3e50; text-decoration: none;'>{art['title']}</a></h3>"
        html += f"<p style='color: #7f8c8d; font-size: 12px;'><b>Fonte:</b> {art['source']}</p>"
        html += f"<p style='color: #34495e;'>{art['summary']}</p><br>"
    html += "<hr><p><i>Este é um e-mail gerado automaticamente pelo seu Robô de Notícias 24/7.</i></p>"
    return html

def send_news_email(articles):
    if not articles:
        return
        
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = RECEIVER_EMAIL
        msg['Subject'] = f"🌐 Alerta: {len(articles)} novas atualizações no Mundo"
        
        body = format_email_body(articles)
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ E-mail enviado com sucesso com {len(articles)} notícias!")
    except Exception as e:
        print(f"❌ Erro ao enviar e-mail: {e}. (Verifique suas credenciais no código).")
