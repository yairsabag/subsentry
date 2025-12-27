document.addEventListener('DOMContentLoaded', function() {
    if(document.getElementById('current-date')) {
        document.getElementById('current-date').textContent = new Date().toLocaleDateString();
    }
    
    const ratesToUSD = { '$': 1, '₪': 0.27, '€': 1.10, '£': 1.27, '¥': 0.0067 };
    const currencySelector = document.getElementById('baseCurrency');
    const scrollArea = document.getElementById('scroll-area');
    const subSection = document.getElementById('subscriptions-section');

    chrome.storage.local.get({ baseCurrency: '₪' }, (data) => {
        if(currencySelector) currencySelector.value = data.baseCurrency;
        initDashboard();
    });

    if(currencySelector) {
        currencySelector.onchange = () => {
            chrome.storage.local.set({ baseCurrency: currencySelector.value }, initDashboard);
        };
    }

    function initDashboard() {
        chrome.storage.local.get({ subscriptions: [], baseCurrency: '₪', isPro: false }, (data) => {
            const subs = data.subscriptions;
            const baseCur = data.baseCurrency;

            updateStats(subs, baseCur, data.isPro);
            renderTable(subs);
            generateInsights(subs, baseCur);
            
            if (subs.length > 0) {
                setTimeout(() => renderCharts(subs, baseCur), 100);
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

        if(document.getElementById('total-spend')) document.getElementById('total-spend').textContent = `${baseCur}${total.toFixed(2)}`;
        if(document.getElementById('active-subs')) document.getElementById('active-subs').textContent = subs.length;
        if(document.getElementById('annual-spend')) document.getElementById('annual-spend').textContent = `${baseCur}${(total * 12).toFixed(2)}`;

        // ✅ עדכון מונה המגבלה ב-UI
        const limitInfo = document.getElementById('usage-info');
        if (limitInfo) {
            if (isPro) {
                limitInfo.innerHTML = `<span style="color:#10b981;">● Pro Plan: Unlimited Access</span>`;
            } else {
                const count = subs.length;
                const color = count >= 3 ? '#ef4444' : '#f59e0b';
                limitInfo.innerHTML = `Free Tier Usage: <span style="color:${color}; font-weight:800;">${count}/3</span> subscriptions used`;
            }
        }
    }

    function renderCharts(subs, baseCur) {
        if (typeof Chart === 'undefined') return;
        
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Inter', sans-serif";

        const labels = subs.map(s => s.service);
        const values = subs.map(s => {
            const sym = s.price.match(/[^\d.,\s]/g)?.[0] || '$';
            const val = parseFloat(s.price.replace(/[^\d.]/g, '')) || 0;
            return (val * (ratesToUSD[sym] || 1)) / ratesToUSD[baseCur];
        });

        // 1. גרף קו (צד שמאל)
        if (window.myChart1) window.myChart1.destroy();
        window.myChart1 = new Chart(document.getElementById('mainChart').getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: `Monthly Cost (${baseCur})`,
                    data: values,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.05)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(148, 163, 184, 0.05)' }, beginAtZero: true },
                    x: { grid: { display: false } }
                }
            }
        });

        // 2. גרף דונאט (צד ימין למעלה)
        if (window.myChart2) window.myChart2.destroy();
        window.myChart2 = new Chart(document.getElementById('distChart').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: ['#8b5cf6', '#06b6d4', '#d946ef', '#f59e0b', '#10b981'],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'right',
                        labels: { color: '#f8fafc', padding: 20, font: { size: 11 } }
                    }
                }
            }
        });

        // 3. גרף קטגוריות (צד ימין למטה - מה שהיה חסר) ✅
        const catMap = {};
        subs.forEach(s => { catMap[s.category || 'Other'] = (catMap[s.category || 'Other'] || 0) + 1; });
        
        if (window.myChart3) window.myChart3.destroy();
        window.myChart3 = new Chart(document.getElementById('catChart').getContext('2d'), {
            type: 'pie',
            data: {
                labels: Object.keys(catMap),
                datasets: [{
                    data: Object.values(catMap),
                    backgroundColor: ['#06b6d4', '#d946ef', '#8b5cf6', '#10b981'],
                    borderWidth: 2,
                    borderColor: '#1e293b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'right',
                        labels: { color: '#94a3b8', font: { size: 10 } }
                    },
                    title: { display: true, text: 'CATEGORY SPREAD', color: '#64748b', font: { size: 10, weight: 'bold' } }
                }
            }
        });
    }

    // --- שאר הפונקציות (renderTable, deleteSub, dashSaveBtn) ללא שינוי ---
    function renderTable(subs) {
        const tableBody = document.getElementById('subs-table-body');
        if(!tableBody) return;
        tableBody.innerHTML = '';
        subs.forEach((sub, i) => {
            let iconSrc = 'manual.png';
            if (sub.url) try { iconSrc = `https://www.google.com/s2/favicons?sz=64&domain=${new URL(sub.url).hostname}`; } catch(e) {}
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><div style="display:flex; align-items:center; gap:10px; font-weight:700;">
                    <img src="${iconSrc}" style="width:22px; height:22px; border-radius:5px;" onerror="this.src='manual.png'">
                    <span>${sub.service}</span>
                </div></td>
                <td><span class="cat-badge">${sub.category || 'Other'}</span></td>
                <td style="color:#06b6d4; font-weight:800;">${sub.price}</td>
                <td>${sub.trialDays || 0}d</td>
                <td style="color:#94a3b8;">${sub.date}</td>
                <td><button class="del-btn" data-index="${i}">Remove</button></td>
            `;
            row.querySelector('.del-btn').onclick = (e) => {
                deleteSub(parseInt(e.target.getAttribute('data-index')));
            };
            tableBody.appendChild(row);
        });
    }

    function deleteSub(index) {
        if (confirm("Remove this subscription?")) {
            chrome.storage.local.get({ subscriptions: [] }, (data) => {
                const newList = data.subscriptions.filter((_, i) => i !== index);
                chrome.storage.local.set({ subscriptions: newList }, initDashboard);
            });
        }
    }

    const saveBtn = document.getElementById('dashSaveBtn');
    if (saveBtn) {
        saveBtn.onclick = () => {
            const service = document.getElementById('dashNameIn').value;
            const price = document.getElementById('dashPriceIn').value;
            const category = document.getElementById('dashCatIn').value;
            const trialDays = document.getElementById('dashTrialIn').value;

            if (service && price) {
                chrome.storage.local.get({ subscriptions: [], isPro: false }, (data) => {
                    if (!data.isPro && data.subscriptions.length >= 3) {
                        showUpgradeModal();
                        return;
                    }
                    const newSub = { service, price, category, trialDays, date: new Date().toLocaleDateString(), url: '' };
                    chrome.storage.local.set({ subscriptions: [...data.subscriptions, newSub] }, () => {
                        initDashboard();
                        document.getElementById('dashNameIn').value = '';
                        document.getElementById('dashPriceIn').value = '';
                    });
                });
            }
        };
    }

    function showUpgradeModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.9);display:flex;align-items:center;justify-content:center;z-index:10000;`;
        modal.innerHTML = `<div style="background:#1e293b;padding:40px;border-radius:24px;text-align:center;border:1px solid #334155;max-width:400px;box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
            <div style="font-size:50px;margin-bottom:20px;">🔒</div>
            <h2 style="color:white;margin-bottom:10px;">Free Tier Limit</h2>
            <p style="color:#94a3b8;margin-bottom:30px;">Upgrade to Pro to track more than 3 subscriptions and unlock all features.</p>
            <button id="up-btn" style="background:linear-gradient(135deg,#8b5cf6,#d946ef);color:white;border:none;padding:15px 30px;border-radius:12px;cursor:pointer;font-weight:800;width:100%;">Upgrade to Pro</button>
            <button id="cl-btn" style="background:none;border:none;color:#64748b;margin-top:15px;cursor:pointer;">Maybe Later</button>
        </div>`;
        document.body.appendChild(modal);
        document.getElementById('cl-btn').onclick = () => modal.remove();
        document.getElementById('up-btn').onclick = () => window.open('https://your-payment-link.com', '_blank');
    }

    function generateInsights(subs, baseCur) {
        const container = document.getElementById('insights-content');
        if (!container) return;
        if (subs.length === 0) { container.innerHTML = "Add a subscription to start saving."; return; }
        let highest = subs[0];
        subs.forEach(s => {
            const p = parseFloat(s.price.replace(/[^\d.]/g, '')) || 0;
            const h = parseFloat(highest.price.replace(/[^\d.]/g, '')) || 0;
            if (p > h) highest = s;
        });
        const potentialSaving = (parseFloat(highest.price.replace(/[^\d.]/g, '')) * 0.2).toFixed(2);
        container.innerHTML = `💡 <b>Saving Tip:</b> If you switch <b>${highest.service}</b> to an annual plan, you could save about <b>${baseCur}${potentialSaving}</b> per month!`;
    }
});