console.log('Script carregado com sucesso'); // Verifica se o script está sendo executado

const pricesContainer = document.getElementById('prices-container'),
      newsContainer = document.getElementById('news-container'),
      searchInput = document.getElementById('search-input'),
      themeToggle = document.getElementById('theme-toggle'),
      chartSelect = document.getElementById('chart-select'),
      walletAddress = document.getElementById('wallet-address'),
      walletText = document.getElementById('wallet-text');
let allNews = [], lastFetchTime = null, currentPage = 1;
const itemsPerPage = 15, maxPages = 3;
let chartInstance = null;

if (localStorage.getItem('theme') === 'light') document.body.classList.add('light');

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light');
    localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
});

const walletAddresses = {
    bitcoin: '1Lkpq3cwVi7wYzN3zC38padBk2Sz58Df1j',
    ethereum: '0xeE06196aDfb6c2f459dB30FC01CeCa55Ff4FcF05',
    solana: '0xeE06196aDfb6c2f459dB30FC01CeCa55Ff4FcF05',
    bnb: '0xeE06196aDfb6c2f459dB30FC01CeCa55Ff4FcF05',
    polygon: '0xeE06196aDfb6c2f459dB30FC01CeCa55Ff4FcF05'
};

function showWallet(coin) {
    walletText.innerHTML = `<strong>Endereço de Carteira ${coin.charAt(0).toUpperCase() + coin.slice(1)}:</strong><br>${walletAddresses[coin]}<br><br><em>Obrigado pelo apoio! Ajude-nos a manter o site com suas doações. Toda contribuição é valorizada! 💚</em>`;
    walletAddress.style.display = 'block';
}

function hideWallet() {
    walletAddress.style.display = 'none';
}

async function fetchCryptoPrices() {
    console.log('Tentando carregar preços...');
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd');
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        const data = await response.json();
        console.log('Preços recebidos:', data);
        pricesContainer.innerHTML = `
            <div class="price-card"><h2>Bitcoin (BTC)</h2><p>Preço Atual: $${data.bitcoin.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
            <div class="price-card"><h2>Ethereum (ETH)</h2><p>Preço Atual: $${data.ethereum.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
            <div class="price-card"><h2>Solana (SOL)</h2><p>Preço Atual: $${data.solana.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
            <p class="timestamp">Última atualização: ${new Date().toLocaleTimeString('pt-BR')}</p>`;
    } catch (error) {
        pricesContainer.innerHTML = '<p>Erro ao carregar preços. Verifique sua conexão ou tente novamente mais tarde.</p>';
        console.error('Erro ao buscar preços:', error.message);
    }
}

async function fetchChartData(coin) {
    console.log(`Tentando carregar gráfico para ${coin}...`);
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=30`);
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        const data = await response.json();
        console.log(`Dados do gráfico de ${coin} recebidos:`, data);
        const ctx = document.getElementById('crypto-chart').getContext('2d');
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.prices.map(p => new Date(p[0]).toLocaleDateString('pt-BR')),
                datasets: [{
                    label: `${coin.charAt(0).toUpperCase() + coin.slice(1)} (USD)`,
                    data: data.prices.map(p => p[1]),
                    borderColor: '#50fa7b',
                    fill: false,
                    pointRadius: 1,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: { ticks: { maxTicksLimit: 10 } },
                    y: { beginAtZero: false, title: { display: true, text: 'Preço (USD)' } }
                }
            }
        });
    } catch (error) {
        document.querySelector('.chart-container').innerHTML += '<p style="color: var(--secondary);">Erro ao carregar gráfico. Verifique sua conexão ou tente novamente.</p>';
        console.error('Erro ao carregar gráfico:', error.message);
    }
}

async function fetchRSSFeeds() {
    console.log('Tentando carregar notícias...');
    const now = new Date();
    if (lastFetchTime && (now - lastFetchTime) < 600000) {
        displayNews(allNews);
        return;
    }
    try {
        const RSS_FEEDS = [
            'https://www.coindesk.com/arc/outboundfeeds/rss/',
            'https://cointelegraph.com/rss',
            'https://livecoins.com.br/feed/'
        ];
        allNews = [];
        for (const feed of RSS_FEEDS) {
            const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`);
            if (!response.ok) {
                console.warn(`Falha ao carregar feed ${feed}: ${response.status}`);
                continue;
            }
            const data = await response.json();
            console.log(`Notícias de ${feed} recebidas:`, data.items);
            if (data.items) allNews.push(...data.items);
        }
        if (allNews.length === 0) throw new Error('Nenhum feed de notícias disponível.');
        allNews = allNews.filter(news => (now - new Date(news.pubDate)) / (1000 * 60 * 60 * 24) <= 4);
        if (allNews.length > 45) allNews = allNews.slice(0, 45);
        lastFetchTime = now;
        displayNews(allNews);
    } catch (error) {
        newsContainer.innerHTML = '<p>Erro ao carregar notícias. Os feeds podem estar indisponíveis. Tente novamente mais tarde.</p>';
        console.error('Erro ao carregar notícias:', error.message);
    }
}

function displayNews(newsList) {
    newsContainer.innerHTML = '';
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedNews = newsList.slice(start, start + itemsPerPage);
    paginatedNews.forEach(article => {
        const div = document.createElement('div');
        div.className = 'news-item';
        let imageUrl = article.enclosure?.link || article.thumbnail;
        if (!imageUrl && article.description) {
            const imgMatch = article.description.match(/<img[^>]+src=["'](.*?)["']/i);
            imageUrl = imgMatch ? imgMatch[1] : 'https://via.placeholder.com/300x200';
        }
        const description = article.description?.replace(/<img[^>]*>/g, '') || 'Descrição não disponível.';
        div.innerHTML = `
            <img src="${imageUrl}" alt="Imagem da notícia" loading="lazy">
            <h3>${article.title}</h3>
            <p>${description}</p>
            <div class="like-dislike-container">
                <button class="like-btn" onclick="toggleLike(this, '${article.link}')">👍 <span>0</span></button>
                <button class="dislike-btn" onclick="toggleDislike(this, '${article.link}')">👎 <span>0</span></button>
            </div>
            <div class="share-container">
                <button class="share-button">📤 Compartilhar</button>
                <div class="share-options">
                    <a href="#" onclick="shareOnFacebook('${article.link}', '${article.title}')">Facebook</a>
                    <a href="#" onclick="shareOnInstagram('${article.link}', '${article.title}')">Instagram</a>
                    <a href="#" onclick="shareOnTwitter('${article.link}', '${article.title}')">X (Twitter)</a>
                    <a href="#" onclick="shareOnWhatsApp('${article.link}', '${article.title}')">WhatsApp</a>
                    <a href="#" onclick="shareByEmail('${article.link}', '${article.title}')">E-mail</a>
                    <a href="#" onclick="copyLink('${article.link}')">Copiar Link</a>
                </div>
            </div>
            <a href="${article.link}" target="_blank">Leia mais</a>`;
        newsContainer.appendChild(div);
    });
    updatePaginationControls(newsList.length);
}

function updatePaginationControls(totalItems) {
    const totalPages = Math.min(Math.ceil(totalItems / itemsPerPage), maxPages);
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    pagination.innerHTML = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} title="Página Anterior"><</button>
        <span>${currentPage}/${totalPages}</span>
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} title="Próxima Página">></button>`;
    newsContainer.appendChild(pagination);
}

function changePage(page) {
    if (page >= 1 && page <= Math.min(Math.ceil(allNews.length / itemsPerPage), maxPages)) {
        currentPage = page;
        displayNews(allNews);
    }
}

function searchNews() {
    const query = searchInput.value.toLowerCase();
    const filteredNews = allNews.filter(news => 
        news.title.toLowerCase().includes(query) || 
        news.description.toLowerCase().includes(query)
    );
    currentPage = 1;
    displayNews(filteredNews);
}

function toggleLike(button, articleLink) {
    const likeCount = button.querySelector('span');
    if (button.classList.contains('liked')) {
        likeCount.textContent = parseInt(likeCount.textContent) - 1;
        button.classList.remove('liked');
    } else {
        likeCount.textContent = parseInt(likeCount.textContent) + 1;
        button.classList.add('liked');
    }
}

function toggleDislike(button, articleLink) {
    const dislikeCount = button.querySelector('span');
    if (button.classList.contains('disliked')) {
        dislikeCount.textContent = parseInt(dislikeCount.textContent) - 1;
        button.classList.remove('disliked');
    } else {
        dislikeCount.textContent = parseInt(dislikeCount.textContent) + 1;
        button.classList.add('disliked');
    }
}

function shareOnFacebook(url, title) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&t=${encodeURIComponent(title)}`, '_blank');
}

function shareOnInstagram(url, title) {
    alert('Compartilhe no Instagram manualmente!');
}

function shareOnTwitter(url, title) {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
}

function shareOnWhatsApp(url, title) {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' - ' + url)}`, '_blank');
}

function shareByEmail(url, title) {
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
}

function copyLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('Link copiado para a área de transferência!');
    });
}

setInterval(fetchCryptoPrices, 600000);
setInterval(fetchRSSFeeds, 600000);
searchInput.addEventListener('input', searchNews);
chartSelect.addEventListener('change', (e) => {
    fetchChartData(e.target.value);
});

// Firebase Integration (unificado aqui)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyC-1lZOaGZLOZ-RWL1IX9FnY4LJXUPyXW0",
    authDomain: "infocrypto-2025.firebaseapp.com",
    projectId: "infocrypto-2025",
    storageBucket: "infocrypto-2025.appspot.com",
    messagingSenderId: "817973626061",
    appId: "1:817973626061:web:1aeaf14ea9b908592e9584",
    measurementId: "G-5HKM77NY9B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function addLoginButton() {
    console.log('Adicionando botão de login...');
    const loginContainer = document.getElementById('login-container');
    const loginButton = document.createElement('button');
    loginButton.textContent = 'Login com Google';
    loginButton.classList.add('login-button');
    loginButton.onclick = () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .then((result) => {
                const user = result.user;
                alert(`Bem-vindo, ${user.displayName}!`);
            })
            .catch((error) => {
                console.error('Erro ao fazer login:', error);
            });
    };
    loginContainer.appendChild(loginButton);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Página carregada, iniciando funções...');
    fetchCryptoPrices();
    fetchChartData('bitcoin');
    fetchRSSFeeds();
    addLoginButton();
});
