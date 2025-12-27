document.addEventListener('DOMContentLoaded', function() {
    // פונקציה לפתיחת הדשבורד
    const openDashboard = () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('dashboard.html')
        });
    };

    // חיבור הכפתור הגדול
    const mainBtn = document.getElementById('go-to-dash');
    if (mainBtn) mainBtn.addEventListener('click', openDashboard);

    // חיבור האייקון הקטן בפינה
    const iconBtn = document.getElementById('icon-dash-btn');
    if (iconBtn) iconBtn.addEventListener('click', openDashboard);

    // טעינת נתונים מהירה לתצוגה בתוך ה-Popup
    chrome.storage.local.get({ subscriptions: [], baseCurrency: '$' }, (data) => {
        const totalEl = document.getElementById('popup-total');
        const listEl = document.getElementById('popup-subs');
        
        let total = 0;
        listEl.innerHTML = '';

        data.subscriptions.forEach(sub => {
            // חישוב סכום (בצורה פשוטה לתצוגה)
            const price = parseFloat(sub.price.replace(/[^\d.]/g, '')) || 0;
            total += price;

            // יצירת שורה ברשימה
            const item = document.createElement('div');
            item.className = 'sub-item';
            item.innerHTML = `
                <div>
                    <div style="font-size:13px; font-weight:700;">${sub.service}</div>
                    <div style="font-size:11px; color:#06b6d4;">${sub.price}</div>
                </div>
            `;
            listEl.appendChild(item);
        });

        totalEl.textContent = `${data.baseCurrency}${total.toFixed(2)}`;
    });
});