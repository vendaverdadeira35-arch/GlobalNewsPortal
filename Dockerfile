FROM python:3.12-slim

WORKDIR /app

# Copiar os requerimentos do Portal e do Robô
COPY Web/GlobalNewsPortal/requirements.txt ./req_api.txt
COPY Scripts/GlobalNewsBot/requirements.txt ./req_bot.txt

# Instalar dependências
RUN pip install --no-cache-dir -r req_api.txt
RUN pip install --no-cache-dir -r req_bot.txt

# Copiar todo o código das duas pastas
COPY Scripts/GlobalNewsBot/ ./Scripts/GlobalNewsBot/
COPY Web/GlobalNewsPortal/ ./Web/GlobalNewsPortal/

# Expor a porta da API
EXPOSE 8080

# Comando de inicialização para o Cloud Run (Iniciará a API)
# O robô em si precisará ser acionado por um Cloud Scheduler chamando um endpoint ou rodando em paralelo
CMD ["uvicorn", "Web.GlobalNewsPortal.api:app", "--host", "0.0.0.0", "--port", "8080"]
