document.addEventListener('DOMContentLoaded', function() {
    const subList = document.getElementById('subList');
    const addBtn = document.getElementById('addBtn');
    const manualForm = document.getElementById('manualForm');
    const openDashBtn = document.getElementById('openDashboard');

    // 1. פתיחת לשונית ה-Dashboard
    openDashBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'dashboard.html' });
    });

    // 2. פתיחה/סגירה של הטופס הידני (הפלוס)
    addBtn.addEventListener('click', () => {
        manualForm.style.display = manualForm.style.display === 'block' ? 'none' : 'block';
    });

    // 3. שמירת מנוי ידני
    document.getElementById('saveManual').addEventListener('click', () => {
        const service = document.getElementById('nameIn').value;
        const price = document.getElementById('priceIn').value;
        const trialDays = document.getElementById('trialIn').value;

        if (service && price) {
            chrome.storage.local.get({ subscriptions: [] }, (data) => {
                const newList = [...data.subscriptions, { 
                    service, price, trialDays, date: new Date().toLocaleDateString(), url: '' 
                }];
                chrome.storage.local.set({ subscriptions: newList }, () => {
                    if (trialDays > 0) {
                        chrome.runtime.sendMessage({ action: "setAlarm", service, days: trialDays });
                    }
                    location.reload(); // מרענן את החלונית כדי להציג את החדש
                });
            });
        }
    });

    // 4. הצגת הרשימה וחישוב הסכום
    function render() {
        chrome.storage.local.get({ subscriptions: [] }, (data) => {
            let total = 0;
            subList.innerHTML = '';
            
            if (data.subscriptions.length === 0) {
                subList.innerHTML = '<p style="text-align:center;color:#999;font-size:12px;">No subscriptions yet.</p>';
                document.getElementById('totalAmount').innerText = 'Total: $0.00/mo';
                return;
            }

            data.subscriptions.forEach((sub, i) => {
                const div = document.createElement('div');
                div.className = 'sub-item';
                div.innerHTML = `
                    <div style="flex-grow:1;">
                        <div style="font-weight:600; font-size:14px; color:#111;">${sub.service} ${sub.trialDays ? '⏳' : ''}</div>
                        <div style="font-size:11px;color:#666;">${sub.price} • ${sub.date}</div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button class="del-btn-action" style="background:#FEE2E2; color:#EF4444; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:10px;">Del</button>
                    </div>
                `;
                subList.appendChild(div);

                // הוספת פונקציית מחיקה לכפתור
                const deleteBtn = div.querySelector('.del-btn-action');
                deleteBtn.addEventListener('click', () => {
                    const newList = data.subscriptions.filter((_, index) => index !== i);
                    chrome.storage.local.set({ subscriptions: newList }, render);
                });

                // חישוב סכום
                const p = parseFloat(sub.price.replace(/[^0-9.]/g, ''));
                if (!isNaN(p)) total += p;
            });
            document.getElementById('totalAmount').innerText = `Total: $${total.toFixed(2)}/mo`;
        });
    }
    render();
});