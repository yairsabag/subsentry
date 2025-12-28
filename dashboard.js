document.addEventListener('DOMContentLoaded', function() {
    
    // 1. הגנה ובדיקת משתמש - המקור שלך
    chrome.storage.local.get(['isLoggedIn', 'userName', 'userEmail'], (data) => {
        if (!data.isLoggedIn) {
            window.location.href = 'login.html'; 
            return;
        }

        // הצגת השם האישי והמייל - IDs מה-HTML שלך
        const userDisplay = document.getElementById('user-name-title');
        if(userDisplay) userDisplay.textContent = `Welcome, ${data.userName || 'User'}!`;
        
        const userEmailTag = document.getElementById('user-email-display');
        if(userEmailTag && data.userEmail) userEmailTag.textContent = data.userEmail;

        if(document.getElementById('current-date')) {
            document.getElementById('current-date').textContent = new Date().toLocaleDateString();
        }
        
        initDashboard();
    });

    // סנכרון בזמן אמת עם הפופאפ
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.subscriptions || changes.baseCurrency) initDashboard();
    });

    const ratesToUSD = { '$': 1, '₪': 0.27, '€': 1.10, '£': 1.27, '¥': 0.0067 };
    const currencySelector = document.getElementById('baseCurrency');

    chrome.storage.local.get({ baseCurrency: '₪' }, (data) => {
        if(currencySelector) currencySelector.value = data.baseCurrency;
    });

    if(currencySelector) {
        currencySelector.onchange = () => {
            chrome.storage.local.set({ baseCurrency: currencySelector.value }, initDashboard);
        };
    }

    function initDashboard() {
        chrome.storage.local.get({ subscriptions: [], baseCurrency: '₪', isPro: false }, (data) => {
            updateStats(data.subscriptions, data.baseCurrency, data.isPro);
            renderTable(data.subscriptions);
            generateInsights(data.subscriptions, data.baseCurrency);
            if (data.subscriptions.length > 0) {
                setTimeout(() => renderCharts(data.subscriptions, data.baseCurrency), 100);
            }
        });
    }

    function updateStats(subs, baseCur, isPro) {
        let total = 0;
        subs.forEach(s => {
            const symbol = s.price.match(/[^\d.,\s]/g)?.[0] || '$';
            const price = parseFloat(s.price.replace(/[^\d.]/g, ''));
            if (!isNaN(price)) total += (price * (ratesToUSD[symbol] || 1)) / ratesToUSD[baseCur];
        });

        document.getElementById('total-spend').textContent = `${baseCur}${total.toFixed(2)}`;
        document.getElementById('active-subs').textContent = subs.length;
        document.getElementById('annual-spend').textContent = `${baseCur}${(total * 12).toFixed(2)}`;

        const limitInfo = document.getElementById('usage-info');
        if (limitInfo) {
            if (isPro) {
                limitInfo.innerHTML = `<span style="color:#10b981;">● Pro Account: Unlimited</span>`;
            } else {
                const count = subs.length;
                const color = count >= 3 ? '#ef4444' : '#f59e0b';
                limitInfo.innerHTML = `Free Usage: <span style="color:${color}; font-weight:800;">${count}/3</span>`;
            }
        }
    }

    function renderCharts(subs, baseCur) {
        if (typeof Chart === 'undefined') return;
        Chart.defaults.color = '#94a3b8';

        const labels = subs.map(s => s.service);
        const values = subs.map(s => {
            const sym = s.price.match(/[^\d.,\s]/g)?.[0] || '$';
            const val = parseFloat(s.price.replace(/[^\d.]/g, '')) || 0;
            return (val * (ratesToUSD[sym] || 1)) / ratesToUSD[baseCur];
        });

        if (window.myChart1) window.myChart1.destroy();
        window.myChart1 = new Chart(document.getElementById('mainChart').getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: `Monthly Spend (${baseCur})`,
                    data: values,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.05)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        if (window.myChart2) window.myChart2.destroy();
        window.myChart2 = new Chart(document.getElementById('distChart').getContext('2d'), {
            type: 'doughnut',
            data: { labels, datasets: [{ data: values, backgroundColor: ['#8b5cf6', '#06b6d4', '#d946ef', '#f59e0b', '#10b981'] }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
        });
    }

    function renderTable(subs) {
        const tableBody = document.getElementById('subs-table-body');
        if(!tableBody) return;
        tableBody.innerHTML = '';
        subs.forEach((sub, i) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><b>${sub.service}</b></td>
                <td><span class="cat-badge">${sub.category || 'Other'}</span></td>
                <td style="color:#06b6d4;">${sub.price}</td>
                <td>${sub.trialDays || 0}d</td>
                <td><button class="del-btn" data-index="${i}">Remove</button></td>
            `;
            row.querySelector('.del-btn').onclick = (e) => deleteSub(parseInt(e.target.dataset.index));
            tableBody.appendChild(row);
        });
    }

    function deleteSub(index) {
        chrome.storage.local.get({ subscriptions: [] }, (data) => {
            const newList = data.subscriptions.filter((_, i) => i !== index);
            chrome.storage.local.set({ subscriptions: newList }, initDashboard);
        });
    }

    document.getElementById('dashSaveBtn').onclick = () => {
        const service = document.getElementById('dashNameIn').value;
        const price = document.getElementById('dashPriceIn').value;
        if (service && price) {
            chrome.storage.local.get({ subscriptions: [] }, (data) => {
                const newSub = { 
                    service, price, 
                    category: document.getElementById('dashCatIn').value,
                    trialDays: document.getElementById('dashTrialIn').value,
                    date: new Date().toLocaleDateString() 
                };
                chrome.storage.local.set({ subscriptions: [...data.subscriptions, newSub] }, initDashboard);
            });
        }
    };

    function generateInsights(subs, baseCur) {
        const container = document.getElementById('insights-content');
        if (!container || subs.length === 0) return;
        container.innerHTML = `💡 <b>Tip:</b> Switch to annual billing on your top sub to save up to 20%!`;
    }
});