document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('current-date').textContent = new Date().toLocaleDateString();
    
    // שערי חליפין (בסיס דולר $)
    const ratesToUSD = { '$': 1, '₪': 0.27, '€': 1.10, '£': 1.27, '¥': 0.0067 };

    const currencySelector = document.getElementById('baseCurrency');
    const scrollArea = document.getElementById('scroll-area');
    const subSection = document.getElementById('subscriptions-section');

    document.getElementById('nav-list').onclick = () => subSection.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('nav-analytics').onclick = () => scrollArea.scrollTo({ top: 0, behavior: 'smooth' });

    chrome.storage.local.get({ baseCurrency: '₪' }, (data) => {
        currencySelector.value = data.baseCurrency;
        initDashboard();
    });

    currencySelector.onchange = () => chrome.storage.local.set({ baseCurrency: currencySelector.value }, initDashboard);

    function initDashboard() {
        chrome.storage.local.get({ subscriptions: [], baseCurrency: '₪' }, (data) => {
            const subs = data.subscriptions;
            const baseCur = data.baseCurrency;
            updateStats(subs, baseCur);
            renderTable(subs);
            generateInsights(subs, baseCur);
            setTimeout(() => renderCharts(subs, baseCur), 100);
            document.getElementById('cur-mode').textContent = baseCur;
        });
    }

    function updateStats(subs, baseCur) {
        let total = 0;
        subs.forEach(s => {
            const symbol = s.price.match(/[^\d.,\s]/g)?.[0] || '$';
            const price = parseFloat(s.price.replace(/[^\d.]/g, ''));
            if (!isNaN(price)) total += (price * (ratesToUSD[symbol] || 1)) / ratesToUSD[baseCur];
        });
        document.getElementById('total-spend').textContent = `${baseCur}${total.toFixed(2)}`;
        document.getElementById('active-subs').textContent = subs.length;
        document.getElementById('annual-spend').textContent = `${baseCur}${(total * 12).toFixed(2)}`;
    }

    function generateInsights(subs, baseCur) {
        const container = document.getElementById('insights-content');
        if (subs.length === 0) { container.innerHTML = "Add a subscription to start saving."; return; }
        
        let highest = subs[0];
        let total = 0;
        subs.forEach(s => {
            const p = parseFloat(s.price.replace(/[^\d.]/g, ''));
            if (p > parseFloat(highest.price.replace(/[^\d.]/g, ''))) highest = s;
            total += p;
        });

        // לוגיקת המלצה: מעבר למנוי שנתי חוסך כ-20%
        const potentialSaving = (parseFloat(highest.price.replace(/[^\d.]/g, '')) * 0.2).toFixed(2);
        container.innerHTML = `💡 <b>Saving Tip:</b> If you switch <b>${highest.service}</b> to an annual plan, you could save about <b>${baseCur}${potentialSaving}</b> per month!`;
    }

    function renderCharts(subs, baseCur) {
        if (typeof Chart === 'undefined') return;
        Chart.defaults.color = '#94a3b8';
        const labels = subs.map(s => s.service);
        const values = subs.map(s => parseFloat(s.price.replace(/[^\d.]/g, '')) * (ratesToUSD[s.price.match(/[^\d.,\s]/g)?.[0] || '$'] || 1) / ratesToUSD[baseCur]);

        // הגרפים המקוריים שביקשת לא לגעת בהם
        if (window.myChart1) window.myChart1.destroy();
        window.myChart1 = new Chart(document.getElementById('mainChart').getContext('2d'), { type: 'line', data: { labels, datasets: [{ label: `Cost (${baseCur})`, data: values, borderColor: '#8b5cf6', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false } });

        if (window.myChart2) window.myChart2.destroy();
        window.myChart2 = new Chart(document.getElementById('distChart').getContext('2d'), { type: 'doughnut', data: { labels, datasets: [{ data: values, backgroundColor: ['#8b5cf6', '#06b6d4', '#d946ef', '#f59e0b'] }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } } });

        // גרף קטגוריות חדש
        const catMap = {};
        subs.forEach(s => { catMap[s.category] = (catMap[s.category] || 0) + 1; });
        if (window.myChart3) window.myChart3.destroy();
        window.myChart3 = new Chart(document.getElementById('catChart').getContext('2d'), { type: 'pie', data: { labels: Object.keys(catMap), datasets: [{ data: Object.values(catMap), backgroundColor: ['#06b6d4', '#d946ef', '#8b5cf6', '#10b981'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Categories', color: '#fff' } } } });
    }

    function renderTable(subs) {
        const tableBody = document.getElementById('subs-table-body');
        tableBody.innerHTML = '';
        subs.forEach((sub, i) => {
            // החזרת האייקונים
            let iconSrc = 'manual.png';
            if (sub.url) try { iconSrc = `https://www.google.com/s2/favicons?sz=64&domain=${new URL(sub.url).hostname}`; } catch(e) {}

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><div style="display:flex; align-items:center; gap:10px; font-weight:700;">
                    <img src="${iconSrc}" style="width:22px; height:22px; border-radius:5px;" onerror="this.src='manual.png'">
                    <span>${sub.service}</span>
                </div></td>
                <td><span class="cat-badge">${sub.category || 'Other'}</span></td>
                <td style="color:var(--accent-teal); font-weight:800;">${sub.price}</td>
                <td>${sub.trialDays || 0}d</td>
                <td style="color:var(--text-muted);">${sub.date}</td>
                <td>
                    <button class="deal-btn">Find Deal</button>
                    <button class="edit-btn">Edit</button>
                    <button class="del-btn">Remove</button>
                </td>
            `;
            
            row.querySelector('.deal-btn').onclick = () => {
                const query = encodeURIComponent(`${sub.service} discount promo code coupon`);
                window.open(`https://www.google.com/search?q=${query}`, '_blank');
            };
            row.querySelector('.edit-btn').onclick = () => startEdit(i, row);
            row.querySelector('.del-btn').onclick = () => deleteSub(i);
            tableBody.appendChild(row);
        });
    }

    function startEdit(index, row) {
        chrome.storage.local.get({ subscriptions: [] }, (data) => {
            const sub = data.subscriptions[index];
            row.innerHTML = `
                <td><input type="text" id="en" value="${sub.service}" class="edit-input"></td>
                <td><select id="ec" class="edit-input"><option value="Streaming">Streaming</option><option value="AI Tools">AI Tools</option><option value="Software">Software</option><option value="Other">Other</option></select></td>
                <td><input type="text" id="ep" value="${sub.price}" class="edit-input"></td>
                <td><input type="number" id="et" value="${sub.trialDays}" class="edit-input"></td>
                <td>${sub.date}</td>
                <td><button class="edit-btn" id="save">Save</button><button class="del-btn" onclick="initDashboard()">Cancel</button></td>
            `;
            row.querySelector('#save').onclick = () => {
                const newList = [...data.subscriptions];
                newList[index] = { ...sub, service: row.querySelector('#en').value, category: row.querySelector('#ec').value, price: row.querySelector('#ep').value, trialDays: row.querySelector('#et').value };
                chrome.storage.local.set({ subscriptions: newList }, initDashboard);
            };
        });
    }

    function deleteSub(index) {
        if (confirm("Are you sure you want to remove this subscription?")) {
            chrome.storage.local.get({ subscriptions: [] }, (data) => {
                const newList = data.subscriptions.filter((_, i) => i !== index);
                chrome.storage.local.set({ subscriptions: newList }, initDashboard);
            });
        }
    }

    document.getElementById('dashSaveBtn').onclick = () => {
        const service = document.getElementById('dashNameIn').value, price = document.getElementById('dashPriceIn').value, category = document.getElementById('dashCatIn').value, trialDays = document.getElementById('dashTrialIn').value;
        if (service && price) chrome.storage.local.get({ subscriptions: [] }, (data) => {
            chrome.storage.local.set({ subscriptions: [...data.subscriptions, { service, price, category, trialDays, date: new Date().toLocaleDateString(), url: '' }] }, initDashboard);
            document.getElementById('dashNameIn').value = ''; document.getElementById('dashPriceIn').value = '';
        });
    };

    document.getElementById('exportBtn').onclick = () => {
        chrome.storage.local.get({ subscriptions: [] }, (data) => {
            let csv = "Service,Category,Price,Date\n" + data.subscriptions.map(s => `"${s.service}","${s.category}","${s.price}","${s.date}"`).join("\n");
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'SubSentry_Report.csv'; a.click();
        });
    };
});