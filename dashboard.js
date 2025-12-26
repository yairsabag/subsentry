document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('current-date').textContent = new Date().toLocaleDateString();
    
    // ניווט Sidebar
    const analyticsBtn = document.getElementById('nav-analytics');
    const listBtn = document.getElementById('nav-list');
    const scrollArea = document.getElementById('scroll-area');
    const listSection = document.getElementById('subscriptions-list-section');

    listBtn.onclick = () => { listSection.scrollIntoView({ behavior: 'smooth' }); listBtn.classList.add('active'); analyticsBtn.classList.remove('active'); };
    analyticsBtn.onclick = () => { scrollArea.scrollTo({ top: 0, behavior: 'smooth' }); analyticsBtn.classList.add('active'); listBtn.classList.remove('active'); };

    initDashboard();

    function initDashboard() {
        chrome.storage.local.get({ subscriptions: [] }, (data) => {
            const subs = data.subscriptions;
            updateStats(subs);
            renderTable(subs);
            setTimeout(() => renderCharts(subs), 100);
        });
    }

    // הוספה ידנית מה-Dashboard
    document.getElementById('dashSaveBtn').onclick = function() {
        const service = document.getElementById('dashNameIn').value;
        const price = document.getElementById('dashPriceIn').value;
        const trialDays = document.getElementById('dashTrialIn').value;

        if (service && price) {
            chrome.storage.local.get({ subscriptions: [] }, (data) => {
                const newList = [...data.subscriptions, { 
                    service, price, trialDays, date: new Date().toLocaleDateString(), url: '' 
                }];
                chrome.storage.local.set({ subscriptions: newList }, () => {
                    if (trialDays > 0) chrome.runtime.sendMessage({ action: "setAlarm", service, days: trialDays });
                    // איפוס שדות ורענון
                    document.getElementById('dashNameIn').value = '';
                    document.getElementById('dashPriceIn').value = '';
                    document.getElementById('dashTrialIn').value = '';
                    initDashboard();
                });
            });
        }
    };

    function updateStats(subs) {
        let total = 0;
        subs.forEach(s => { const p = parseFloat(s.price.replace(/[^0-9.]/g, '')); if (!isNaN(p)) total += p; });
        document.getElementById('total-spend').textContent = `$${total.toFixed(2)}`;
        document.getElementById('active-subs').textContent = subs.length;
        document.getElementById('annual-spend').textContent = `$${(total * 12).toFixed(2)}`;
    }

    function renderCharts(subs) {
        if (typeof Chart === 'undefined') return;
        Chart.defaults.color = '#94a3b8';
        const labels = subs.map(s => s.service);
        const values = subs.map(s => parseFloat(s.price.replace(/[^0-9.]/g, '')));
        
        if (window.myChart1) window.myChart1.destroy();
        if (window.myChart2) window.myChart2.destroy();
        if (window.myChart3) window.myChart3.destroy();

        window.myChart1 = new Chart(document.getElementById('mainChart').getContext('2d'), { type: 'line', data: { labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], datasets: [{ label: 'Spend', data: [110, 140, 130, 180, 165, 220], borderColor: '#8b5cf6', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false } });
        window.myChart2 = new Chart(document.getElementById('distChart').getContext('2d'), { type: 'doughnut', data: { labels: labels.length ? labels : ['None'], datasets: [{ data: values.length ? values : [1], backgroundColor: ['#8b5cf6', '#06b6d4', '#d946ef', '#f59e0b'] }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '75%' } });
        window.myChart3 = new Chart(document.getElementById('barChart').getContext('2d'), { type: 'bar', data: { labels: labels.slice(0,5), datasets: [{ label: 'Price', data: values.slice(0,5), backgroundColor: '#06b6d4' }] }, options: { responsive: true, maintainAspectRatio: false } });
    }

    function renderTable(subs) {
        const tableBody = document.getElementById('subs-table-body');
        tableBody.innerHTML = '';
        subs.forEach((sub, i) => {
            let domain = "google.com";
            if (sub.url) try { domain = new URL(sub.url).hostname; } catch(e) {}
            const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="display:flex; align-items:center; gap:12px; font-weight:700; color:white;">
                    <img src="${faviconUrl}" style="width:24px; height:24px; border-radius:6px;" onerror="this.src='icon.png'">
                    ${sub.service}
                </td>
                <td style="color:var(--accent-teal); font-weight:800;">${sub.price}</td>
                <td><span style="background:rgba(51, 65, 85, 0.6); padding:5px 10px; border-radius:8px; font-size:11px;">${sub.trialDays ? '⏳ ' + sub.trialDays + 'd' : 'Active'}</span></td>
                <td>${sub.date}</td>
                <td><button class="del-btn" data-i="${i}">Remove</button></td>
            `;
            tableBody.appendChild(row);
        });
        document.querySelectorAll('.del-btn').forEach(b => { b.onclick = function() { const idx = this.getAttribute('data-i'); chrome.storage.local.get({ subscriptions: [] }, (d) => { const newList = d.subscriptions.filter((_, i) => i !== parseInt(idx)); chrome.storage.local.set({ subscriptions: newList }, initDashboard); }); }; });
    }

    document.getElementById('exportBtn').onclick = () => {
        chrome.storage.local.get({ subscriptions: [] }, (data) => {
            if (!data.subscriptions.length) return alert("Nothing to export!");
            let csv = "Service,Price,Date\n" + data.subscriptions.map(s => `"${s.service}","${s.price}","${s.date}"`).join("\n");
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'SubSentry_Report.csv'; a.click();
        });
    };
});