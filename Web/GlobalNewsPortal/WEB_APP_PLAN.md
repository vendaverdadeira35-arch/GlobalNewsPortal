# Web App (Painel Pessoal) - Planejamento

## Objetivo
Transformar o robô de notícias em um sistema Full-Stack acessível de qualquer dispositivo via navegador.

## Arquitetura (Camadas)
*   **Camada 2 (Banco de Dados):** O SQLite atual será mantido. O bot continua rodando em segundo plano e alimentando esse banco.
*   **Camada 3 (Back-end / API):** Vamos criar um servidor local com Python (usando `FastAPI` ou `Flask`) que vai ler o banco de dados `news.db` e enviar os dados para a internet em formato JSON.
*   **Camada 4 (Front-end / UI):** Vamos construir um portal Web moderno (HTML/CSS/JS ou React).
    *   *Design:* Tema Escuro (Dark Mode) sofisticado, efeito Glassmorphism (vidro fosco) e fontes Premium (ex: Inter).
*   **Camada 5 (Deploy/Nuvem):** No futuro, pegaremos essa API e esse Front-end e hospedaremos em serviços como Vercel/Render para você acessar do seu celular pela URL real.

## Próximos Passos
1. Criar o servidor de API (Back-end) para expor as notícias.
2. Criar a interface visual (Front-end).
