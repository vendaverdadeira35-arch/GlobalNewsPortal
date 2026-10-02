// Global News Portal - App Logic

// Handle category active state
function updateActiveCat(clickedBtn) {
    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
    if(clickedBtn) clickedBtn.classList.add('active');
}

// Fetch news from API
async function loadNews(category = null, clickedBtn = null) {
    if (clickedBtn) updateActiveCat(clickedBtn);
    
    const container = document.getElementById('news-container');
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Sincronizando com o motor de inteligência...</p>
        </div>
    `;
    
    try {
        const url = category ? `/api/news?category=${encodeURIComponent(category)}` : '/api/news';
        const response = await fetch(url);
        const data = await response.json();
        
        if(data.status === 'success') {
            let articles = data.data;
            if(category) {
                // Local filter fallback
                articles = articles.filter(a => a.category === category || a.source.includes(category));
            }
            renderNews(articles);
        } else {
            showError("Falha ao ler os dados do banco.");
        }
    } catch (error) {
        showError("A API está desligada ou indisponível.");
    }
}

// Search functionality
async function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if(!query) return;
    
    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
    const container = document.getElementById('news-container');
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>O Motor de Busca está varrendo a internet por "${query}".<br>Isso pode levar alguns segundos...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if(data.status === 'success') {
            renderNews(data.data, true);
        } else {
            showError("Erro na pesquisa: " + data.message);
        }
    } catch (error) {
        showError("Erro de conexão ao realizar a pesquisa web.");
    }
}

// Render articles to the grid
function renderNews(articles, isSearch = false) {
    const container = document.getElementById('news-container');
    container.innerHTML = ''; 

    if(!articles || articles.length === 0) {
        container.innerHTML = `
            <div class="status-msg">
                <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="opacity: 0.5; margin-bottom: 10px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <p>${isSearch ? 'Nenhum resultado encontrado na web.' : 'Nenhuma notícia nesta categoria ainda. O robô está trabalhando!'}</p>
            </div>
        `;
        return;
    }

    articles.forEach((art, index) => {
        let dateStr = art.published_at;
        try {
            if(dateStr !== 'Agora') {
                dateStr = new Date(art.published_at).toLocaleString('pt-BR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                });
            }
        } catch(e) {}
        
        const card = document.createElement('article');
        card.className = 'news-card';
        card.style.animation = `fadeInUp 0.5s ease-out ${index * 0.05}s both`;
        
        card.innerHTML = `
            <div class="news-source">${art.source || 'Internet'}</div>
            <h2 class="news-title">${art.title}</h2>
            <p class="news-summary">${art.summary}</p>
            <div class="card-footer">
                <div class="news-date">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    ${dateStr}
                </div>
                <button class="btn-read" onclick="openReader('${art.link}', '${art.title.replace(/'/g, "\\'")}')">Ler Artigo</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Modal Logic
const modal = document.getElementById('readerModal');
const modalTitle = document.getElementById('modalTitle');
const articleBody = document.getElementById('articleBody');

async function openReader(url, title) {
    modalTitle.innerText = title;
    articleBody.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <div class="spinner"></div>
            <p style="font-family: 'Inter', sans-serif; margin-top:20px; color:#94a3b8;">Extraindo e traduzindo o conteúdo original...</p>
        </div>
    `;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; 
    
    try {
        const response = await fetch(`/api/read?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if(data.status === 'success') {
            articleBody.innerHTML = `<p>${data.content.replace(/\n\n/g, '</p><p>')}</p>`;
        } else {
            articleBody.innerHTML = `
                <div style="text-align:center; padding: 40px 20px;">
                    <svg width="48" height="48" fill="none" stroke="#ef4444" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom: 20px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <h4 style="color: #ef4444; margin-bottom: 15px; font-family: 'Inter', sans-serif;">Acesso Restrito</h4>
                    <p style="margin-bottom: 25px; font-family: 'Inter', sans-serif; color: #94a3b8;">Este site possui um paywall ou proteção que impede leitura automática.</p>
                    <a href="${url}" target="_blank" style="display: inline-block; background: linear-gradient(45deg, var(--accent), var(--accent-purple)); color: white; text-decoration: none; padding: 12px 25px; border-radius: 30px; font-weight: 600; font-family: 'Inter', sans-serif;">Acessar Site Original</a>
                </div>
            `;
        }
    } catch (err) {
        articleBody.innerHTML = `<div style="color: #ef4444; text-align:center;">Falha de comunicação com o servidor.</div>`;
    }
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Close modal on escape or outside click
modal.addEventListener('click', (e) => {
    if(e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && modal.classList.contains('active')) closeModal();
});

function showError(msg) {
    document.getElementById('news-container').innerHTML = `<div class="status-msg" style="color:#ef4444">${msg}</div>`;
}

// Support enter key in search
document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') handleSearch();
});

// Initial load
window.addEventListener('DOMContentLoaded', () => {
    const defaultBtn = document.getElementById('btn-all');
    if (defaultBtn) loadNews(null, defaultBtn);
});
