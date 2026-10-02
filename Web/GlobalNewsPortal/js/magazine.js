// Global News Portal - Magazine Logic

let nativeNewsCache = {};

async function loadNews(category = null) {
    currentCategory = category;
    currentOffset = 0;
    
    document.querySelectorAll('.main-nav a').forEach(a => a.classList.remove('active'));
    if(event && event.target && event.target.tagName === 'A') event.target.classList.add('active');
    
    const container = document.getElementById('news-container');
    const featured = document.getElementById('featured-news');
    const ticker = document.getElementById('ticker-text');
    const popular = document.getElementById('popular-news');
    const btnLoadMore = document.getElementById('btnLoadMore');

    container.innerHTML = '<div class="loading">Carregando notícias...</div>';
    if(btnLoadMore) btnLoadMore.style.display = 'none';
    
    try {
        const url = category ? `/api/news?category=${encodeURIComponent(category)}` : '/api/news';
        
        // Fetch both scraped and native news in parallel
        const [resScraped, resNative] = await Promise.all([
            fetch(url),
            fetch('/api/native_news')
        ]);
        
        const dataScraped = await resScraped.json();
        const dataNative = await resNative.json();
        
        if(dataScraped.status === 'success') {
            let articles = dataScraped.data;
            
            // Mix with native news
            if (dataNative.status === 'success') {
                let nativeArticles = dataNative.data;
                nativeArticles.forEach((art, index) => {
                    art.link = `internal_${index}`;
                    nativeNewsCache[art.link] = art.content;
                });
                articles = [...nativeArticles, ...articles];
            }

            if(category) {
                articles = articles.filter(a => a.category === category || a.source.includes(category));
            }
            
            // Sort by date descending
            articles.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
            
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

    if(ticker) {
        ticker.innerHTML = articles.slice(0, 5).map(a => `<strong>[${a.source || 'Breaking'}]</strong> ${a.title}`).join(' &nbsp;&nbsp;|&nbsp;&nbsp; ');
    }

    if(featured && !isSearch) {
        const feat = articles[0];
        let dateStr = feat.published_at !== 'Agora' ? new Date(feat.published_at).toLocaleDateString('pt-BR') : 'Hoje';
        
        let imgHtml = feat.image_url ? `<img src="${feat.image_url}" alt="Destaque" style="width:100%; height:auto; max-height:450px; object-fit:cover; margin-bottom:15px; border-radius:4px;">` : '';
        featured.innerHTML = `
            ${imgHtml}
            <div class="news-meta">${feat.category || feat.source || 'Destaque'} • ${dateStr}</div>
            <h2><a href="#" onclick="openReader('${feat.link}', '${feat.title.replace(/'/g, "\\'")}'); return false;">${feat.title}</a></h2>
            <p>${feat.summary}</p>
            <button class="btn-read" onclick="openReader('${feat.link}', '${feat.title.replace(/'/g, "\\'")}')">Ler Completo</button>
        `;
    }

    container.innerHTML = '';
    const startIndex = isSearch ? 0 : 1;
    for(let i = startIndex; i < articles.length; i++) {
        const art = articles[i];
        let dateStr = art.published_at !== 'Agora' ? new Date(art.published_at).toLocaleDateString('pt-BR') : 'Hoje';
        
        const card = document.createElement('article');
        card.className = 'news-item';
        card.style.display = 'flex';
        card.style.gap = '15px';
        card.style.marginBottom = '20px';
        
        let imgBlock = '';
        if (art.image_url) {
            imgBlock = `
            <div style="flex: 0 0 180px;">
                <img src="${art.image_url}" alt="Notícia" style="width:100%; height:120px; object-fit:cover; border-radius:4px;">
            </div>`;
        }
        
        card.innerHTML = `
            ${imgBlock}
            <div style="flex: 1;">
                <div class="news-meta">${art.source || 'Global'} • ${dateStr}</div>
                <h3 class="news-title" style="font-size:1.15rem; margin-bottom:8px;"><a href="#" onclick="openReader('${art.link}', '${art.title.replace(/'/g, "\\'")}'); return false;">${art.title}</a></h3>
                <p class="news-desc" style="font-size:0.95rem; line-height:1.4;">${art.summary}</p>
                <div class="news-footer">
                    <a href="#" onclick="openReader('${art.link}', '${art.title.replace(/'/g, "\\'")}')" style="font-weight:bold; font-size:0.85rem; padding: 5px 0;">Ler mais ></a>
                    <div class="share-icons">
                        <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(art.title + ' ' + (art.link.startsWith('internal') ? window.location.href : art.link))}" target="_blank" style="color:#25D366; font-size:1.2rem; margin-right:5px;"><i class="fab fa-whatsapp"></i></a>
                        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(art.link.startsWith('internal') ? window.location.href : art.link)}&text=${encodeURIComponent(art.title)}" target="_blank" style="color:#1DA1F2; font-size:1.2rem;"><i class="fab fa-twitter"></i></a>
                    </div>
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

let currentUtterance = null;

async function openReader(url, title) {
    modalTitle.innerText = title;
    
    // Stop any ongoing audio
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    
    // Header for the article with Audio Controls
    const audioControls = `
        <div style="background: #f4f4f4; padding: 15px; margin-bottom: 20px; border-radius: 8px; display: flex; align-items: center; gap: 15px;">
            <button id="btnPlayAudio" onclick="playAudio()" style="background: #e63946; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 5px;">
                🎧 Ouvir Artigo
            </button>
            <button id="btnStopAudio" onclick="stopAudio()" style="background: #666; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; display: none;">
                ⏹ Parar
            </button>
            <span id="audioStatus" style="font-size: 0.9rem; color: #666;"></span>
        </div>
    `;

    if (url.startsWith('internal_')) {
        const rawContent = nativeNewsCache[url];
        articleBody.innerHTML = audioControls + `<div id="readableText"><p>${rawContent.replace(/\n/g, '<br>')}</p></div>`;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        return;
    }

    // Se for uma notícia externa, abre diretamente na fonte original
    window.open(url, '_blank');
}

function playAudio() {
    if (!('speechSynthesis' in window)) {
        alert("Desculpe, seu navegador não suporta leitura em voz alta.");
        return;
    }
    
    const textElement = document.getElementById('readableText');
    if (!textElement) return;
    
    const textToRead = textElement.innerText;
    
    window.speechSynthesis.cancel(); // Parar se já estiver lendo
    
    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    currentUtterance.lang = 'pt-BR';
    currentUtterance.rate = 1.05; // Slightly faster for news
    
    currentUtterance.onstart = () => {
        document.getElementById('btnPlayAudio').style.display = 'none';
        document.getElementById('btnStopAudio').style.display = 'block';
        document.getElementById('audioStatus').innerText = "Tocando agora...";
    };
    
    currentUtterance.onend = () => {
        document.getElementById('btnPlayAudio').style.display = 'block';
        document.getElementById('btnStopAudio').style.display = 'none';
        document.getElementById('audioStatus').innerText = "";
    };

    window.speechSynthesis.speak(currentUtterance);
}

function stopAudio() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    document.getElementById('btnPlayAudio').style.display = 'block';
    document.getElementById('btnStopAudio').style.display = 'none';
    document.getElementById('audioStatus').innerText = "";
}

function closeModal() {
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

async function subscribeNewsletter() {
    const emailInput = document.getElementById('newsletterEmail');
    const msg = document.getElementById('newsletterMsg');
    const btn = document.getElementById('btnSubscribe');
    const email = emailInput.value.trim();

    if(!email || !email.includes('@')) {
        msg.style.color = '#e63946';
        msg.innerText = 'Por favor, insira um e-mail válido.';
        return;
    }

    btn.disabled = true;
    btn.innerText = 'Enviando...';
    msg.innerText = '';

    try {
        const formData = new FormData();
        formData.append('email', email);

        const response = await fetch('/api/subscribe', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            msg.style.color = '#155724';
            msg.innerText = 'Inscrição confirmada com sucesso!';
            emailInput.value = '';
        } else {
            msg.style.color = '#e63946';
            msg.innerText = data.message;
        }
    } catch (error) {
        msg.style.color = '#e63946';
        msg.innerText = 'Erro ao conectar com o servidor.';
    } finally {
        btn.disabled = false;
        btn.innerText = 'Inscrever-me';
    }
}

// State for pagination
let currentCategory = null;
let currentOffset = 0;
const PAGE_SIZE = 50;

function toggleMobileMenu() {
    const nav = document.getElementById('mainNav');
    nav.classList.toggle('show');
}

async function loadMoreNews() {
    const btn = document.getElementById('btnLoadMore');
    btn.innerText = 'Carregando...';
    btn.disabled = true;
    
    currentOffset += PAGE_SIZE;
    
    try {
        const url = currentCategory ? `/api/news?category=${encodeURIComponent(currentCategory)}&offset=${currentOffset}` : `/api/news?offset=${currentOffset}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if(data.status === 'success' && data.data.length > 0) {
            renderAdditionalCards(data.data);
            btn.innerText = 'Carregar Mais Notícias';
            btn.disabled = false;
        } else {
            btn.innerText = 'Fim das Notícias';
            btn.disabled = true;
            btn.style.background = '#666';
        }
    } catch (error) {
        btn.innerText = 'Erro. Tentar Novamente';
        btn.disabled = false;
    }
}

function renderAdditionalCards(articles) {
    const container = document.getElementById('news-container');
    for(let i = 0; i < articles.length; i++) {
        const art = articles[i];
        let dateStr = art.published_at !== 'Agora' ? new Date(art.published_at).toLocaleDateString('pt-BR') : 'Hoje';
        
        const card = document.createElement('article');
        card.className = 'news-item';
        card.style.display = 'flex';
        card.style.gap = '15px';
        card.style.marginBottom = '20px';
        
        let imgBlock = '';
        if (art.image_url) {
            imgBlock = `
            <div style="flex: 0 0 180px;">
                <img src="${art.image_url}" alt="Notícia" style="width:100%; height:120px; object-fit:cover; border-radius:4px;">
            </div>`;
        }
        
        card.innerHTML = `
            ${imgBlock}
            <div style="flex: 1;">
                <div class="news-meta">${art.source || 'Global'} • ${dateStr}</div>
                <h3 class="news-title" style="font-size:1.15rem; margin-bottom:8px;"><a href="#" onclick="openReader('${art.link}', '${art.title.replace(/'/g, "\\'")}'); return false;">${art.title}</a></h3>
                <p class="news-desc" style="font-size:0.95rem; line-height:1.4;">${art.summary}</p>
                <div class="news-footer">
                    <a href="#" onclick="openReader('${art.link}', '${art.title.replace(/'/g, "\\'")}')" style="font-weight:bold; font-size:0.85rem; padding: 5px 0;">Ler mais ></a>
                    <div class="share-icons">
                        <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(art.title + ' ' + (art.link.startsWith('internal') ? window.location.href : art.link))}" target="_blank" style="color:#25D366; font-size:1.2rem; margin-right:5px;"><i class="fab fa-whatsapp"></i></a>
                        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(art.link.startsWith('internal') ? window.location.href : art.link)}&text=${encodeURIComponent(art.title)}" target="_blank" style="color:#1DA1F2; font-size:1.2rem;"><i class="fab fa-twitter"></i></a>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    }
    
    const btnLoadMore = document.getElementById('btnLoadMore');
    if (btnLoadMore && !isSearch) {
        if (articles.length === 50) {
            btnLoadMore.style.display = 'inline-block';
            btnLoadMore.innerText = 'Carregar Mais Notícias';
            btnLoadMore.disabled = false;
        } else {
            btnLoadMore.style.display = 'none';
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadNews();
});
