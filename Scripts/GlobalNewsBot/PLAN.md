# Global News & Trends Bot (24/7) - Planejamento

## Objetivo
Criar um script autônomo (robô) que coleta informações públicas relevantes (notícias, economia, tecnologia) de todo o mundo e envia um resumo periódico via E-mail para o usuário.

## Arquitetura (Camadas)
1. **Infraestrutura/Banco de Dados (Opcional no início):** SQLite ou arquivo JSON simples para evitar enviar a mesma notícia duas vezes.
2. **Back-end/Motor (Python):** 
   - `scraper.py`: Conecta em APIs de notícias e feeds RSS globais (BBC, Reuters, G1, etc).
   - `summarizer.py` (Opcional): Pode integrar com uma IA local ou via API para resumir as notícias longas em tópicos rápidos.
   - `notifier.py`: Envia o e-mail final formatado.
3. **Automação (24/7):** O script rodará em um loop com "sleep" ou será agendado no sistema (Agendador de Tarefas do Windows ou Cron via Docker) para rodar a cada X horas.

## Requisitos de Sistema
- Python 3.x
- Bibliotecas: `requests`, `feedparser`, `smtplib` (para e-mail).

## Próximos Passos
1. Definir as fontes de dados iniciais.
2. Escrever o script base de coleta (`scraper.py`).
3. Escrever a integração com E-mail (`notifier.py`).
