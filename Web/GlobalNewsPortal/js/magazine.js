// Global News Portal - Magazine Logic

async function loadNews(category = null) {
    // Update nav active state
    document.querySelectorAll('.main-nav a').forEach(a => a.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
    
    const container = document.getElementById('news-container');
    const featured = document.getElementById('featured-news');
    const ticker = document.getElementById('ticker-text');
    const popular = document.getElementById('popular-news');

    container.innerHTML = '<div class="loading">Carregando notícias...</div>';
    
    try {
        const url = category ? `/api/news?category=${encodeURIComponent(category)}` : '/api/news';
        const response = await fetch(url);
        const data = await response.json();
        
        if(data.status === 'success') {
            let articles = data.data;
            if(category) {
                articles = articles.filter(a => a.category === category || a.source.includes(category));
            }
            renderMagazineLayout(articles, ticker, featured, container, popular);
        } else {
            container.innerHTML = `<div style="color:red">Falha ao ler os dados.</div>`;
        }
    } catch (error) {
        container.innerHTML = `<div style="color:red">Erro de conexão.</div>`;
    }
}

async function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if(!query) return;
    
    const container = document.getElementById('news-container');
    document.getElementById('featured-news').innerHTML = `<h3>Resultados para "${query}"</h3>`;
    container.innerHTML = '<div>Pesquisando na web...</div>';
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if(data.status === 'success') {
            renderMagazineLayout(data.data, null, null, container, null, true);
        } else {
            container.innerHTML = `<div style="color:red">Erro: ${data.message}</div>`;
        }
    } catch (error) {
        container.innerHTML = `<div style="color:red">Erro de conexão.</div>`;
    }
}

function renderMagazineLayout(articles, ticker, featured, container, popular, isSearch=false) {
    if(!articles || articles.length === 0) {
        container.innerHTML = '<div>Nenhuma notícia encontrada.</div>';
        return;
    }

    // 1. Ticker (Top 5 titles)
    if(ticker) {
        ticker.innerHTML = articles.slice(0, 5).map(a => `<strong>[${a.source || 'Breaking'}]</strong> ${a.title}`).join(' &nbsp;&nbsp;|&nbsp;&nbsp; ');
    }

    // 2. Featured News (1st article)
    if(featured && !isSearch) {
        const feat = articles[0];
        let dateStr = feat.published_at !== 'Agora' ? new Date(feat.published_at).toLocaleDateString('pt-BR') : 'Hoje';
        featured.innerHTML = `
            <div class="news-meta">${feat.category || feat.source || 'Destaque'} • ${dateStr}</div>
            <h2><a href="#" onclick="openReader('${feat.link}', '${feat.title.replace(/'/g, "\\'")}'); return false;">${feat.title}</a></h2>
            <p>${feat.summary}</p>
            <button class="btn-read" onclick="openReader('${feat.link}', '${feat.title.replace(/'/g, "\\'")}')">Ler Completo</button>
        `;
    }

    // 3. Grid / List News
    container.innerHTML = '';
    const startIndex = isSearch ? 0 : 1;
    for(let i = startIndex; i < articles.length; i++) {
        const art = articles[i];
        let dateStr = art.published_at !== 'Agora' ? new Date(art.published_at).toLocaleDateString('pt-BR') : 'Hoje';
        
        const card = document.createElement('article');
        card.className = 'news-item';
        card.innerHTML = `
            <div class="news-meta">${art.source || 'Global'} • ${dateStr}</div>
            <h3 class="news-title"><a href="#" onclick="openReader('${art.link}', '${art.title.replace(/'/g, "\\'")}'); return false;">${art.title}</a></h3>
            <p class="news-desc">${art.summary}</p>
            <div class="news-footer">
                <a href="#" onclick="openReader('${art.link}', '${art.title.replace(/'/g, "\\'")}')" style="font-weight:bold; font-size:0.85rem;">Ler mais ></a>
                <div class="share-icons">
                    <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(art.title + ' ' + art.link)}" target="_blank">📲</a>
                </div>
            </div>
        `;
        container.appendChild(card);
    }

    // 4. Popular (Sidebar - Randomly pick 5)
    if(popular) {
        const shuffled = [...articles].sort(() => 0.5 - Math.random()).slice(0, 5);
        popular.innerHTML = shuffled.map(a => `
            <li><a href="#" onclick="openReader('${a.link}', '${a.title.replace(/'/g, "\\'")}'); return false;">${a.title}</a></li>
        `).join('');
    }
}

// Modal Reader
const modal = document.getElementById('readerModal');
const modalTitle = document.getElementById('modalTitle');
const articleBody = document.getElementById('articleBody');

async function openReader(url, title) {
    modalTitle.innerText = title;
    articleBody.innerHTML = `<div>Processando texto do artigo original...</div>`;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    try {
        const response = await fetch(`/api/read?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if(data.status === 'success') {
            articleBody.innerHTML = `<p>${data.content.replace(/\n\n/g, '</p><p>')}</p>`;
        } else {
            articleBody.innerHTML = `<p style="color:red">Conteúdo bloqueado pela fonte. <a href="${url}" target="_blank">Acesse o site original</a></p>`;
        }
    } catch (err) {
        articleBody.innerHTML = `<p style="color:red">Erro de servidor.</p>`;
    }
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

window.addEventListener('DOMContentLoaded', () => {
    loadNews();
});
