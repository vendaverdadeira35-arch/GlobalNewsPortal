let currentCategory = null;
let currentOffset = 0;
const PAGE_SIZE = 50;
let isDarkMode = false;

function updateClock() {
    const clockElement = document.getElementById('globalClock');
    if (clockElement) {
        const now = new Date();
        const utcStr = now.toISOString().substring(11, 16); // gets HH:mm
        clockElement.innerHTML = `<i class="far fa-clock"></i> UTC: ${utcStr}`;
    }
}
setInterval(updateClock, 60000);
updateClock();

function toggleTheme() {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function toggleMobileMenu() {
    const nav = document.getElementById('mainNav');
    nav.classList.toggle('show');
}

async function loadNews(category = null) {
    currentCategory = category;
    currentOffset = 0;
    
    document.querySelectorAll('.main-nav a').forEach(a => a.classList.remove('active'));
    if(event && event.target && event.target.tagName === 'A') event.target.classList.add('active');
    
    const container = document.getElementById('news-container');
    const heroGrid = document.getElementById('hero-grid');
    const btnLoadMore = document.getElementById('btnLoadMore');

    container.innerHTML = '<div class="loading">Sincronizando feed...</div>';
    if(heroGrid) heroGrid.innerHTML = '';
    if(btnLoadMore) btnLoadMore.style.display = 'none';
    
    try {
        const url = category ? `/api/news?category=${encodeURIComponent(category)}` : '/api/news';
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'success') {
            renderEditorialLayout(data.data, false);
        } else {
            container.innerHTML = '<div class="loading">Erro ao carregar notícias.</div>';
        }
    } catch(error) {
        container.innerHTML = '<div class="loading">Falha de conexão.</div>';
    }
}

function renderEditorialLayout(articles, isSearch) {
    const container = document.getElementById('news-container');
    const heroGrid = document.getElementById('hero-grid');
    
    if (articles.length === 0) {
        container.innerHTML = '<p>Nenhuma notícia encontrada.</p>';
        return;
    }

    container.innerHTML = '';
    let startIndex = 0;

    // Build the Hero Grid for the first 4 items (if not searching and enough items exist)
    if (heroGrid && !isSearch && articles.length >= 4 && !currentCategory) {
        const feat = articles[0];
        const sub1 = articles[1];
        const sub2 = articles[2];
        const sub3 = articles[3];
        
        let featImg = feat.image_url || 'https://picsum.photos/seed/global1/800/500';
        let sub1Img = sub1.image_url || 'https://picsum.photos/seed/global2/400/250';
        let sub2Img = sub2.image_url || 'https://picsum.photos/seed/global3/400/250';
        let sub3Img = sub3.image_url || 'https://picsum.photos/seed/global4/400/250';

        heroGrid.innerHTML = `
            <div class="hero-main">
                <a href="#" onclick="openReader('${feat.link}', '${feat.title.replace(/'/g, "\\'")}'); return false;">
                    <img src="${featImg}" alt="Headline">
                    <div class="hero-overlay">
                        <span class="news-meta" style="color:var(--accent-red);">${feat.category || 'Destaque'}</span>
                        <h2>${feat.title}</h2>
                    </div>
                </a>
            </div>
            <div class="hero-side">
                <div class="hero-sub-item">
                    <a href="#" onclick="openReader('${sub1.link}', '${sub1.title.replace(/'/g, "\\'")}'); return false;">
                        <img src="${sub1Img}" alt="Notícia">
                        <span class="news-meta">${sub1.category || 'Global'}</span>
                        <h3>${sub1.title}</h3>
                    </a>
                </div>
                <div class="hero-sub-item">
                    <a href="#" onclick="openReader('${sub2.link}', '${sub2.title.replace(/'/g, "\\'")}'); return false;">
                        <img src="${sub2Img}" alt="Notícia">
                        <span class="news-meta">${sub2.category || 'Global'}</span>
                        <h3>${sub2.title}</h3>
                    </a>
                </div>
                <div class="hero-sub-item" style="border:none; padding:0;">
                    <a href="#" onclick="openReader('${sub3.link}', '${sub3.title.replace(/'/g, "\\'")}'); return false;">
                        <span class="news-meta">${sub3.category || 'Global'}</span>
                        <h3 style="margin-top:5px;">${sub3.title}</h3>
                    </a>
                </div>
            </div>
        `;
        startIndex = 4;
    } else if (heroGrid) {
        heroGrid.innerHTML = '';
    }

    // Render the rest as list
    const articlesToRender = articles.slice(startIndex);
    renderAdditionalCards(articlesToRender);

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
        
        let imgBlock = '';
        if (art.image_url) {
            imgBlock = `<img src="${art.image_url}" alt="Notícia">`;
        }
        
        card.innerHTML = `
            ${imgBlock}
            <div class="news-item-content">
                <div class="news-meta">${art.source || 'Global'} • ${dateStr}</div>
                <h3 class="news-title"><a href="#" onclick="openReader('${art.link}', '${art.title.replace(/'/g, "\\'")}'); return false;">${art.title}</a></h3>
                <p class="news-desc">${art.summary}</p>
                <div class="news-footer">
                    <a href="#" class="btn-read-more" onclick="openReader('${art.link}', '${art.title.replace(/'/g, "\\'")}')">Ler artigo completo</a>
                    <div class="social-icons">
                        <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(art.title + ' ' + (art.link.startsWith('internal') ? window.location.href : art.link))}" target="_blank"><i class="fab fa-whatsapp"></i></a>
                        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(art.link.startsWith('internal') ? window.location.href : art.link)}&text=${encodeURIComponent(art.title)}" target="_blank"><i class="fab fa-twitter"></i></a>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    }
}

async function handleSearch(tag = null) {
    const term = tag || document.getElementById('searchInput').value;
    if(!term) return;
    
    const container = document.getElementById('news-container');
    container.innerHTML = '<div class="loading">Buscando...</div>';
    const heroGrid = document.getElementById('hero-grid');
    if(heroGrid) heroGrid.innerHTML = '';
    const btnLoadMore = document.getElementById('btnLoadMore');
    if(btnLoadMore) btnLoadMore.style.display = 'none';

    try {
        const response = await fetch('/api/news');
        const data = await response.json();
        if(data.status === 'success') {
            const filtered = data.data.filter(n => 
                n.title.toLowerCase().includes(term.toLowerCase()) || 
                n.summary.toLowerCase().includes(term.toLowerCase()) ||
                (n.category && n.category.toLowerCase().includes(term.toLowerCase()))
            );
            renderEditorialLayout(filtered, true);
        }
    } catch(e) {
        container.innerHTML = '<div class="loading">Erro na busca.</div>';
    }
}

async function subscribeNewsletter() {
    const emailInput = document.getElementById('newsletterEmail');
    const msg = document.getElementById('newsletterMsg');
    const btn = document.getElementById('btnSubscribe');
    const email = emailInput.value.trim();

    if(!email || !email.includes('@')) {
        msg.style.color = 'var(--accent-red)';
        msg.innerText = 'Por favor, insira um e-mail válido.';
        return;
    }

    btn.disabled = true;
    btn.innerText = 'Processando...';
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
            msg.style.color = 'var(--accent-red)';
            msg.innerText = data.message;
        }
    } catch (error) {
        msg.style.color = 'var(--accent-red)';
        msg.innerText = 'Erro ao conectar com o servidor.';
    } finally {
        btn.disabled = false;
        btn.innerText = 'Assinar Gratuitamente';
    }
}

// Reader functionality
const modal = document.getElementById('reader-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

async function openReader(link, title) {
    modalTitle.innerText = title;
    modalBody.innerHTML = '<div class="loading">Carregando conteúdo completo...</div>';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (link.startsWith('internal_')) {
        modalBody.innerHTML = `<p style="font-size:1.2rem; font-weight:bold;">Para ler esta matéria exclusiva, clique no botão "Ler artigo completo" na página.</p>`;
        return;
    }

    try {
        if(link === 'internal' || !link.startsWith('http')) {
             modalBody.innerHTML = `<p>Conteúdo nativo não disponível pelo leitor externo.</p>`;
             return;
        }
        window.open(link, '_blank');
        closeModal();
    } catch (error) {
        modalBody.innerHTML = '<div class="loading" style="color:var(--accent-red);">Erro ao abrir link externo.</div>';
    }
}

function toggleAudio() {
    if(!window.speechSynthesis) {
        alert("Seu navegador não suporta leitura de tela.");
        return;
    }
    if(window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        return;
    }
    const text = document.getElementById('modal-body').innerText;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.speak(utterance);
}

function closeModal() {
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

window.addEventListener('DOMContentLoaded', () => {
    loadNews();
});
