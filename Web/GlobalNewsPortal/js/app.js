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
            <div class="card-footer" style="flex-direction: column; gap: 15px; align-items: flex-start;">
                <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    <div class="news-date">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        ${dateStr}
                    </div>
                    <button class="btn-read" onclick="openReader('${art.link}', '${art.title.replace(/'/g, "\\'")}')">Ler Artigo</button>
                </div>
                <div class="share-buttons" style="display: flex; gap: 10px; width: 100%; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 10px;">
                    <span style="font-size: 0.75rem; color: #64748b; margin-right: auto; display: flex; align-items: center;">Compartilhar:</span>
                    <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('*' + art.title + '*\\n\\nLeia mais em: ' + art.link)}" target="_blank" style="color: #25D366; transition: transform 0.2s; display: flex;" title="WhatsApp" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent('Interessante: ' + art.title)}&url=${encodeURIComponent(art.link)}" target="_blank" style="color: #1DA1F2; transition: transform 0.2s; display: flex;" title="X / Twitter" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                    </a>
                    <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(art.link)}" target="_blank" style="color: #0A66C2; transition: transform 0.2s; display: flex;" title="LinkedIn" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </a>
                </div>
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
